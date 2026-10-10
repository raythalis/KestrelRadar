#!/usr/bin/env bash
# Kestrel Radar 一键启动（Linux / macOS）
#
#   ./start.sh
#
# 做三件事：装依赖（缺的话）→ 构建界面 → 起服务（一个进程同时提供界面与 API）。
# 首次启动会在 apps/api/data/ 里建数据库；要换位置就设 KESTREL_DB_PATH。
set -euo pipefail
cd "$(dirname "$0")"

# Windows 上的 Git Bash 也认这个脚本，但它不是 Linux/macOS：自动安装 Node/pnpm 用不了。
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    echo '提示：检测到 Windows 的 Git Bash。Windows 请运行 start.bat；' >&2
    echo '      本机没装 Node/pnpm 时，这个脚本不会自动安装。' >&2
    ;;
esac

# 只在本次进程使用项目内的运行时，不修改系统 PATH 或全局安装。
RUNTIME="$PWD/.kestrel-runtime"
NODE_VERSION=24.12.0
PNPM_VERSION=12.8.1
export PNPM_CONFIG_REPORTER=append-only

node_ok() {
  local version major minor
  command -v node >/dev/null 2>&1 || return 1
  version="$(node --version)"
  [[ "$version" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+)$ ]] || return 1
  major="${BASH_REMATCH[1]}" minor="${BASH_REMATCH[2]}"
  [ "$major" -eq 22 ] && [ "$minor" -ge 18 ] && return 0
  [ "$major" -ge 24 ] && return 0
  return 1
}
pnpm_ok() {
  command -v pnpm >/dev/null 2>&1 && [ "$(pnpm --version 2>/dev/null)" = "$PNPM_VERSION" ]
}
confirm_install() {
  if [ ! -t 0 ]; then
    echo "无法交互确认安装；请在终端运行脚本，或预先安装所需版本。" >&2
    exit 1
  fi
  printf '%s 安装到 %s，不修改系统环境。继续？[y/N] ' "$1" "$RUNTIME"
  read -r answer
  case "$answer" in y|Y|yes|YES) ;; *) echo '已取消安装。'; exit 1 ;; esac
}
install_node() {
  command -v curl >/dev/null 2>&1 && command -v tar >/dev/null 2>&1 || {
    echo '需要 curl 和 tar 才能下载 Node.js；请安装后重试。' >&2; exit 1;
  }
  command -v sha256sum >/dev/null 2>&1 || command -v shasum >/dev/null 2>&1 || {
    echo '没有 SHA-256 校验工具，已停止安装。' >&2; return 1;
  }
  local platform arch filename archive expected actual stage
  case "$(uname -s)" in Linux) platform=linux; archive=tar.xz ;; Darwin) platform=darwin; archive=tar.gz ;; *) echo '当前系统不支持自动安装 Node.js。' >&2; exit 1 ;; esac
  case "$(uname -m)" in x86_64|amd64) arch=x64 ;; aarch64|arm64) arch=arm64 ;; *) echo '当前 CPU 架构不支持自动安装 Node.js。' >&2; exit 1 ;; esac
  filename="node-v${NODE_VERSION}-${platform}-${arch}.${archive}"
  stage="$(mktemp -d "${TMPDIR:-/tmp}/kestrel-node.XXXXXXXX")"
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt" -o "$stage/SHASUMS256.txt" || { rm -rf "$stage"; return 1; }
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/${filename}" -o "$stage/$filename" || { rm -rf "$stage"; return 1; }
  expected="$(awk -v file="$filename" '$2 == file { print $1 }' "$stage/SHASUMS256.txt")"
  if command -v sha256sum >/dev/null 2>&1; then actual="$(sha256sum "$stage/$filename" | awk '{print $1}')"
  else actual="$(shasum -a 256 "$stage/$filename" | awk '{print $1}')"; fi
  if [ -z "$expected" ] || [ "$actual" != "$expected" ]; then
    echo 'Node.js 文件校验失败，已停止安装。' >&2; rm -rf "$stage"; return 1
  fi
  tar -xf "$stage/$filename" -C "$stage" || { rm -rf "$stage"; return 1; }
  mkdir -p "$RUNTIME"
  rm -rf "$RUNTIME/node-previous"
  if [ -d "$RUNTIME/node" ]; then mv "$RUNTIME/node" "$RUNTIME/node-previous"; fi
  mv "$stage/node-v${NODE_VERSION}-${platform}-${arch}" "$RUNTIME/node"
  rm -rf "$stage" "$RUNTIME/node-previous"
  export PATH="$RUNTIME/node/bin:$PATH"
}

if [ -x "$RUNTIME/node/bin/node" ]; then export PATH="$RUNTIME/node/bin:$PATH"; fi
if ! node_ok; then
  echo "未找到兼容的 Node.js；可安装 Node.js $NODE_VERSION。"
  confirm_install 'Node.js'
  echo '==> 下载并校验 Node.js 官方安装包'
  install_node || { echo 'Node.js 安装失败，未启动服务。' >&2; exit 1; }
  node_ok || { echo 'Node.js 版本校验失败。' >&2; exit 1; }
fi

if [ -f "$RUNTIME/pnpm/node_modules/pnpm/bin/pnpm.mjs" ]; then
  pnpm() { node "$RUNTIME/pnpm/node_modules/pnpm/bin/pnpm.mjs" "$@"; }
  pnpm_start() { exec node "$RUNTIME/pnpm/node_modules/pnpm/bin/pnpm.mjs" start; }
else
  pnpm_start() { exec pnpm start; }
fi

if ! pnpm_ok; then
  echo "未找到项目要求的 pnpm $PNPM_VERSION。"
  confirm_install 'pnpm'
  echo '==> 安装 pnpm 到项目目录'
  mkdir -p "$RUNTIME/pnpm"
  npm install --prefix "$RUNTIME/pnpm" --no-save --no-audit --no-fund "pnpm@$PNPM_VERSION" || { echo 'pnpm 安装失败，未启动服务。' >&2; exit 1; }
  pnpm() { node "$RUNTIME/pnpm/node_modules/pnpm/bin/pnpm.mjs" "$@"; }
  pnpm_start() { exec node "$RUNTIME/pnpm/node_modules/pnpm/bin/pnpm.mjs" start; }
  pnpm_ok || { echo 'pnpm 版本校验失败。' >&2; exit 1; }
fi

# 根 package.json 的构建脚本会递归调用 pnpm：子进程要在 PATH 上找到它。
# 系统里没装 pnpm 时，用指向项目内 pnpm 的 shim 顶上（node 也固定到当前这份）。
if [ -f "$RUNTIME/pnpm/node_modules/pnpm/bin/pnpm.mjs" ]; then
  mkdir -p "$RUNTIME/bin"
  printf '#!/bin/sh\nexec "%s" "%s" "$@"\n' \
    "$(command -v node)" "$RUNTIME/pnpm/node_modules/pnpm/bin/pnpm.mjs" > "$RUNTIME/bin/pnpm"
  chmod +x "$RUNTIME/bin/pnpm"
  export PATH="$RUNTIME/bin:$PATH"
fi

HOST="${KESTREL_HOST:-127.0.0.1}"
PORT="${KESTREL_PORT:-8765}"

# 端口被占用就别白跑一遍依赖和构建；只提示，不替用户杀进程。
listening=''
if command -v lsof >/dev/null 2>&1; then
  listening="$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | awk 'NR == 2 {printf "%s (PID %s)", $1, $2}' || true)"
elif command -v ss >/dev/null 2>&1; then
  listening="$(ss -ltn 2>/dev/null | awk -v p=":$PORT" '$4 ~ (p"$") {print $4; exit}' || true)"
fi
if [ -n "$listening" ]; then
  echo "端口 $PORT 已被 $listening 占用；请停止旧服务，或设置 KESTREL_PORT 使用其他端口。" >&2
  exit 1
fi

echo "==> 校验并安装依赖"
if ! pnpm install --frozen-lockfile; then
  echo '依赖目录校验失败，将重建项目各处的 node_modules 后重试。'
  rm -rf node_modules apps/*/node_modules packages/*/node_modules
  pnpm install --frozen-lockfile || { echo '依赖重建失败，未启动服务。' >&2; exit 1; }
fi

echo "==> 构建界面"
pnpm build

echo "==> 启动：http://${HOST}:${PORT}（按 Ctrl+C 停止）"

pnpm_start
