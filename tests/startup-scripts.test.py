"""启动脚本的离线回归：临时复制入口，不访问真实网络/数据库。"""
import os
import pathlib
import shutil
import subprocess
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class StartupScriptTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)
        shutil.copy2(ROOT / 'start.sh', self.root / 'start.sh')
        (self.root / 'package.json').write_text('{"packageManager":"pnpm@12.8.1"}')
        (self.root / 'node_modules').mkdir()
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        self.calls = self.root / 'calls'
        self.shim('node', 'if [ "$1" = "--version" ]; then echo "v24.12.0"; fi')
        self.shim('pnpm', '''if [ "$1" = "--version" ]; then echo "12.8.1"; else printf '%s\\n' "$*" >> "$CALLS"; fi''')

    def shim(self, name, body):
        p = self.bin / name
        p.write_text('#!/bin/sh\n' + body + '\n')
        p.chmod(0o755)

    def run_script(self, answer=''):
        env = dict(os.environ, PATH=str(self.bin) + ':' + os.environ['PATH'], CALLS=str(self.calls))
        return subprocess.run(['bash', str(self.root / 'start.sh')], input=answer,
                              text=True, capture_output=True, env=env, timeout=20)

    def test_existing_supported_versions_build_and_start(self):
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertEqual(self.calls.read_text().splitlines(), ['install --frozen-lockfile', 'build', 'start'])

    def test_local_pnpm_runs_build_and_start(self):
        local = self.root / '.kestrel-runtime' / 'pnpm' / 'node_modules' / 'pnpm' / 'bin'
        local.mkdir(parents=True)
        (local / 'pnpm.mjs').write_text('')
        self.shim('pnpm', 'echo "10.0.0"')
        self.shim('node', '''if [ "$1" = "--version" ]; then echo "v24.12.0"; else printf '%s\\n' "$*" >> "$CALLS"; if [ "$2" = "--version" ]; then echo "12.8.1"; fi; fi''')
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertEqual(self.calls.read_text().splitlines()[-3:], [str(local / 'pnpm.mjs') + ' install --frozen-lockfile', str(local / 'pnpm.mjs') + ' build', str(local / 'pnpm.mjs') + ' start'])

    def test_node_22_18_is_accepted(self):
        self.shim('node', 'echo "v22.18.0"')
        result = self.run_script()
        self.assertEqual(result.returncode, 0)

    def test_node_22_17_is_rejected(self):
        self.shim('node', 'echo "v22.17.0"')
        result = self.run_script('n\n')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.calls.exists())

    def test_node_24_is_accepted(self):
        self.shim('node', 'echo "v24.0.0"')
        result = self.run_script()
        self.assertEqual(result.returncode, 0)
        self.assertEqual(self.calls.read_text().splitlines(), ['install --frozen-lockfile', 'build', 'start'])

    def test_node_23_is_rejected(self):
        self.shim('node', 'echo "v23.9.0"')
        result = self.run_script('n\n')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.calls.exists())

    def test_node_24_12_is_accepted(self):
        result = self.run_script()
        self.assertEqual(result.returncode, 0)
        self.assertEqual(self.calls.read_text().splitlines(), ['install --frozen-lockfile', 'build', 'start'])

    def test_missing_node_decline_does_not_install_or_build(self):
        self.shim('node', 'echo "v18.0.0"')
        result = self.run_script('n\n')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Node', result.stdout)
        self.assertFalse(self.calls.exists())
        self.assertFalse((self.root / '.kestrel-runtime').exists())

    def test_wrong_pnpm_version_decline_does_not_build(self):
        self.shim('pnpm', 'echo "10.0.0"')
        result = self.run_script('n\n')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('pnpm', result.stdout)
        self.assertFalse(self.calls.exists())

    def test_missing_pnpm_decline_does_not_build(self):
        self.shim('pnpm', 'echo "10.0.0"')
        result = self.run_script('N\n')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.calls.exists())

    def test_node_download_failure_stops_before_build(self):
        self.shim('node', 'echo "v18.0.0"')
        self.shim('curl', 'exit 22')
        result = self.run_script('y\n')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.calls.exists())

    def test_git_bash_on_windows_is_pointed_at_the_windows_entry(self):
        self.shim('uname', 'echo "MINGW64_NT-10.0-22631"')
        result = self.run_script()
        self.assertIn('start.bat', result.stderr + result.stdout)

    def test_bash_reports_a_busy_port_before_installing_or_building(self):
        self.shim('lsof', 'if [ "$1" = "-nP" ]; then printf "COMMAND PID USER\\nnode 4242 ray\\n"; fi')
        result = self.run_script()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('4242', result.stderr + result.stdout)
        self.assertFalse(self.calls.exists())

    def test_windows_entry_is_a_thin_door_to_the_powershell_script(self):
        batch = (ROOT / 'start.bat').read_text()
        self.assertTrue((ROOT / 'start.ps1').is_file())
        self.assertIn('-File "%~dp0start.ps1"', batch)
        self.assertIn('pause', batch)
        # All real work (checks, installs, build) lives in the PowerShell script.
        self.assertNotIn('pnpm', batch)
        self.assertNotIn('package.json', batch)

    def test_windows_switches_the_code_page_once_and_does_not_restore_it(self):
        batch = (ROOT / 'start.bat').read_text()
        self.assertIn('chcp 65001', batch)
        self.assertNotIn('chcp %KESTREL_CODE_PAGE%', batch)
        self.assertNotIn('KESTREL_CODE_PAGE', batch)

    def test_windows_bootstrap_configures_utf8_output_and_port_guard(self):
        script = (ROOT / 'start.ps1').read_text(encoding='utf-8-sig')
        self.assertIn('[Console]::OutputEncoding', script)
        self.assertIn('$OutputEncoding', script)
        self.assertIn('Get-NetTCPConnection', script)
        self.assertIn('KESTREL_PORT', script)

    def test_windows_port_guard_checks_any_listener_on_the_port(self):
        script = (ROOT / 'start.ps1').read_text(encoding='utf-8-sig')
        self.assertIn('Get-NetTCPConnection -LocalPort ([int]$env:KESTREL_PORT)', script)
        self.assertNotIn('Get-NetTCPConnection -LocalAddress $env:KESTREL_HOST', script)

    def test_batch_stays_ascii_only(self):
        batch = (ROOT / 'start.bat').read_text()
        # cmd reads .bat bytes in the OEM code page, so non-ASCII text here turns into garbage.
        self.assertTrue(all(ord(ch) < 128 for ch in batch), 'start.bat must stay ASCII-only')

    def test_no_startup_log_file_is_written(self):
        script = (ROOT / 'start.ps1').read_text(encoding='utf-8-sig')
        batch = (ROOT / 'start.bat').read_text()
        self.assertNotIn('.kestrel-start', script)
        self.assertNotIn('StreamWriter', script)
        self.assertNotIn('KESTREL_LOG', batch)

    def test_failure_reason_is_printed_in_the_window(self):
        script = (ROOT / 'start.ps1').read_text(encoding='utf-8-sig')
        self.assertIn('Kestrel 启动失败', script)
        self.assertIn('Write-Host " 原因：$reason"', script)
        self.assertNotIn('日志：', script)

    def test_child_output_is_rendered_as_plain_text_in_the_window(self):
        script = (ROOT / 'start.ps1').read_text(encoding='utf-8-sig')
        # Merged stderr must be rendered as plain text and must not run under Stop.
        self.assertIn("$ErrorActionPreference = 'Continue'", script)
        self.assertIn('$_.ToString()', script)
        self.assertIn('Write-Host $_.ToString()', script)
        # Start-Transcript does not capture native output, and piping through Tee-Object
        # on Windows PowerShell 5.1 reintroduces encoding and buffering trouble.
        self.assertNotIn('Start-Transcript', script)
        self.assertNotIn('| Tee-Object', script)

    def test_stale_logs_from_older_versions_stay_ignored(self):
        self.assertIn('.kestrel-start*.log', (ROOT / '.gitignore').read_text())

    def test_windows_script_puts_the_bundled_node_first_on_path(self):
        script = (ROOT / 'start.ps1').read_text(encoding='utf-8-sig')
        # npm/pnpm 拉起的子进程用 PATH 找 node；本机没装 Node 时只能靠项目内这份。
        self.assertIn("$env:PATH = (Split-Path -Parent $nodeExe) + ';' + $env:PATH", script)

    def test_bash_script_puts_the_bundled_node_first_on_path(self):
        script = (ROOT / 'start.sh').read_text()
        self.assertIn('export PATH="$RUNTIME/node/bin:$PATH"', script)

    def test_windows_checks_port_before_dependency_install_and_build(self):
        script = (ROOT / 'start.ps1').read_text(encoding='utf-8-sig')
        port_check = script.index('$portInUse = Get-NetTCPConnection')
        dependency_install = script.index("Write-Host '==> 校验并安装项目依赖'")
        build = script.index("Write-Host '==> 构建界面'")
        self.assertLess(port_check, dependency_install)
        self.assertLess(port_check, build)

    def test_startup_uses_append_only_package_manager_output(self):
        bash = (ROOT / 'start.sh').read_text()
        powershell = (ROOT / 'start.ps1').read_text(encoding='utf-8-sig')
        self.assertIn('PNPM_CONFIG_REPORTER=append-only', bash)
        self.assertIn("$env:PNPM_CONFIG_REPORTER = 'append-only'", powershell)
        self.assertIn("$env:CI = 'true'", powershell)

    def test_dependency_install_can_rebuild_existing_dependencies_after_failure(self):
        bash = (ROOT / 'start.sh').read_text()
        powershell = (ROOT / 'start.ps1').read_text(encoding='utf-8-sig')
        self.assertIn('node_modules', bash)
        self.assertIn("foreach ($group in @('apps', 'packages'))", powershell)
        self.assertIn("Remove-Item -LiteralPath $target -Recurse -Force", powershell)
        self.assertIn('pnpm install --frozen-lockfile', bash)
        self.assertIn('Invoke-Pnpm install --frozen-lockfile', powershell)
        self.assertIn('依赖目录校验失败', bash)
        self.assertIn('依赖目录校验失败', powershell)

    def test_pnpm_install_uses_mjs_entrypoint(self):
        script = (ROOT / 'start.ps1').read_text(encoding='utf-8-sig')
        self.assertIn(r"pnpm\node_modules\pnpm\bin\pnpm.mjs", script)
        self.assertIn('Invoke-Pnpm install --frozen-lockfile', script)


if __name__ == '__main__':
    unittest.main()
