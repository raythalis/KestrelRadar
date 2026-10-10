$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8
$env:PNPM_CONFIG_REPORTER = 'append-only'
$env:CI = 'true'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
if (-not (Test-Path (Join-Path $root 'package.json'))) {
    throw '找不到 package.json；请从 Kestrel 仓库根目录运行这个脚本。'
}
$rootItem = Get-Item -LiteralPath $root
if ($root.StartsWith('\\') -or ($rootItem.PSDrive -and $rootItem.PSDrive.DisplayRoot -like '\\*')) {
    throw '项目在网络映射盘上：pnpm 在这种盘上可能出错，请先复制到本地磁盘再运行。'
}
$runtime = Join-Path $root '.kestrel-runtime'
$nodeVersion = '24.12.0'
$pnpmVersion = '12.8.1'
$nodeExe = 'node'

function Test-Node {
    try {
        $version = & $script:nodeExe --version 2>$null
        if ($LASTEXITCODE -ne 0 -or $version -notmatch '^v([0-9]+)\.([0-9]+)\.([0-9]+)$') { return $false }
        $major = [int]$Matches[1]
        $minor = [int]$Matches[2]
        return (($major -eq 22 -and $minor -ge 18) -or ($major -ge 24))
    } catch { return $false }
}

function Confirm-Install([string]$name) {
    if ([Console]::IsInputRedirected) { throw '无法交互确认安装；请在终端运行脚本。' }
    $answer = Read-Host "$name 将安装到 $runtime，不修改系统环境。继续？[y/N]"
    if ($answer -notmatch '^(?i:y|yes)$') { throw '已取消安装。' }
}

function Get-HashFromList([string]$text, [string]$filename) {
    $line = @($text -split "`n" | Where-Object { $_ -match ('^[0-9a-fA-F]{64}\s+\*?' + [regex]::Escape($filename) + '\s*$') })
    if ($line.Count -ne 1) { throw "未找到 $filename 的官方校验值。" }
    return ($line[0] -split '\s+')[0].ToLowerInvariant()
}

# 外部命令统一走这里：边运行边显示，输出就留在窗口里（不写日志文件）。
# 合并 stderr 前先把错误记录转成纯文本，避免 PowerShell 5.1 的 NativeCommandError 装饰并使脚本提前中断。
# 不用 Tee-Object：Windows PowerShell 5.1 的 Tee 额外引入编码与缓冲问题，得不偿失。
function Invoke-Logged {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [string[]]$Arguments = @(),
        [switch]$Quiet
    )
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        if ($Quiet) { $rendered = & $FilePath @Arguments 2>&1 | ForEach-Object { $_.ToString() } }
        else { & $FilePath @Arguments 2>&1 | ForEach-Object { Write-Host $_.ToString() } }
        $code = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previous }
    if ($code -ne 0) { throw "$FilePath $($Arguments -join ' ') 执行失败（退出码 $code）。" }
    if ($Quiet) { return (($rendered | Out-String).Trim()) }
}

try {
    $localNode = Join-Path $runtime 'node\node.exe'
    if (Test-Path $localNode) { $nodeExe = $localNode }
    if (-not (Test-Node)) {
        Write-Host "未找到兼容的 Node.js；可安装 Node.js $nodeVersion。"
        Confirm-Install 'Node.js'
        $arch = switch ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()) {
            'X64' { 'x64' }
            'Arm64' { 'arm64' }
            default { throw '当前 CPU 架构不支持自动安装 Node.js。' }
        }
        $filename = "node-v$nodeVersion-win-$arch.zip"
        $base = "https://nodejs.org/dist/v$nodeVersion"
        $stage = Join-Path ([IO.Path]::GetTempPath()) ("kestrel-node-" + [guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $stage | Out-Null
        try {
            Write-Host '==> 下载并校验 Node.js 官方安装包'
            $hashes = (Invoke-WebRequest -Uri "$base/SHASUMS256.txt" -UseBasicParsing).Content
            $zip = Join-Path $stage $filename
            Invoke-WebRequest -Uri "$base/$filename" -OutFile $zip -UseBasicParsing
            $expected = Get-HashFromList $hashes $filename
            if ((Get-FileHash -Algorithm SHA256 -Path $zip).Hash.ToLowerInvariant() -ne $expected) {
                throw 'Node.js 文件校验失败，已停止安装。'
            }
            Expand-Archive -Path $zip -DestinationPath $stage
            New-Item -ItemType Directory -Force -Path $runtime | Out-Null
            $previous = Join-Path $runtime 'node-previous'
            if (Test-Path $previous) { Remove-Item $previous -Recurse -Force }
            if (Test-Path $localNode) { Move-Item (Join-Path $runtime 'node') $previous }
            Move-Item (Join-Path $stage "node-v$nodeVersion-win-$arch") (Join-Path $runtime 'node')
            $nodeExe = $localNode
            if (-not (Test-Node)) { throw '安装后 Node.js 版本校验失败。' }
            if (Test-Path $previous) { Remove-Item $previous -Recurse -Force }
        } finally { Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue }
    }

    $localPnpm = Join-Path $runtime 'pnpm\node_modules\pnpm\bin\pnpm.mjs'
    # npm/pnpm 拉起的子进程（例如包里的 install 脚本）是用 PATH 找 node 的：
    # 本机没装 Node 时，必须让项目内的 node 排在前面，否则会报 'node' is not recognized。
    $env:PATH = (Split-Path -Parent $nodeExe) + ';' + $env:PATH
    function Invoke-Pnpm {
        param([switch]$Quiet, [Parameter(ValueFromRemainingArguments = $true)][string[]]$PnpmArgs)
        if (Test-Path $localPnpm) { Invoke-Logged -FilePath $nodeExe -Arguments (@($localPnpm) + @($PnpmArgs)) -Quiet:$Quiet }
        else { Invoke-Logged -FilePath 'pnpm' -Arguments @($PnpmArgs) -Quiet:$Quiet }
    }
    $pnpmOk = $false
    try { $pnpmOk = ((Invoke-Pnpm -Quiet --version) -eq $pnpmVersion) } catch { $pnpmOk = $false }
    if (-not $pnpmOk) {
        Write-Host "未找到项目要求的 pnpm $pnpmVersion。"
        Confirm-Install 'pnpm'
        Write-Host '==> 安装 pnpm 到项目目录'
        $npmCli = Join-Path (Split-Path -Parent $nodeExe) 'node_modules\npm\bin\npm-cli.js'
        if (-not (Test-Path $npmCli)) {
            $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
            if (-not $npmCommand) { throw '找不到 npm，无法安装 pnpm。' }
            $npmCli = Join-Path (Split-Path -Parent $npmCommand.Source) 'node_modules\npm\bin\npm-cli.js'
        }
        New-Item -ItemType Directory -Force -Path (Join-Path $runtime 'pnpm') | Out-Null
        Invoke-Logged -FilePath $nodeExe -Arguments @($npmCli, 'install', '--prefix', (Join-Path $runtime 'pnpm'), '--no-save', '--no-audit', '--no-fund', "pnpm@$pnpmVersion")
        if (-not (Test-Path $localPnpm)) { throw 'pnpm 安装失败。' }
        if ((Invoke-Pnpm -Quiet --version) -ne $pnpmVersion) { throw 'pnpm 版本校验失败。' }
    }

    if (-not $env:KESTREL_HOST) { $env:KESTREL_HOST = '127.0.0.1' }
    if (-not $env:KESTREL_PORT) { $env:KESTREL_PORT = '8765' }
    $portInUse = Get-NetTCPConnection -LocalPort ([int]$env:KESTREL_PORT) -State Listen -ErrorAction SilentlyContinue
    if ($portInUse) {
        $owner = Get-Process -Id $portInUse[0].OwningProcess -ErrorAction SilentlyContinue
        $ownerName = if ($owner) { "$($owner.ProcessName) (PID $($owner.Id))" } else { '其他进程' }
        throw "端口 $($env:KESTREL_PORT) 已被 $ownerName 占用；请停止旧服务，或设置 KESTREL_PORT 使用其他端口。"
    }

    Write-Host '==> 校验并安装项目依赖'
    try {
        Invoke-Pnpm install --frozen-lockfile
    } catch {
        Write-Host '依赖目录校验失败，将重建项目各处的 node_modules 后重试。'
        $targets = @(Join-Path $root 'node_modules')
        foreach ($group in @('apps', 'packages')) {
            $groupPath = Join-Path $root $group
            if (Test-Path $groupPath) {
                Get-ChildItem -Path $groupPath -Directory | ForEach-Object { $targets += Join-Path $_.FullName 'node_modules' }
            }
        }
        foreach ($target in $targets) {
            if (Test-Path $target) { Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction SilentlyContinue }
        }
        Invoke-Pnpm install --frozen-lockfile
    }
    Write-Host '==> 构建界面'
    Invoke-Pnpm build
    Write-Host "==> 启动：http://$($env:KESTREL_HOST):$($env:KESTREL_PORT)（按 Ctrl+C 停止）"
    Invoke-Pnpm start
} catch {
    $reason = $_.Exception.Message
    Write-Host ''
    Write-Host '==========================================='
    Write-Host ' Kestrel 启动失败'
    Write-Host " 原因：$reason"
    Write-Host '==========================================='
    Write-Host ''
    exit 1
}
