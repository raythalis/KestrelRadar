#!/usr/bin/env bash
# Kestrel Radar 一键启动（Linux / macOS）
#
#   ./start.sh
#
# 做三件事：装依赖（缺的话）→ 构建界面 → 起服务（一个进程同时提供界面与 API）。
# 首次启动会在 apps/api/data/ 里建数据库；要换位置就设 KESTREL_DB_PATH。
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "没找到 node。请先安装 Node.js 22.18+ 或 24.12+：https://nodejs.org"
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "没找到 pnpm。安装方式：corepack enable 或 npm install -g pnpm"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "==> 安装依赖"
  pnpm install --frozen-lockfile
fi

echo "==> 构建界面"
pnpm build

HOST="${KESTREL_HOST:-127.0.0.1}"
PORT="${KESTREL_PORT:-8765}"
echo "==> 启动：http://${HOST}:${PORT}（按 Ctrl+C 停止）"

exec pnpm start
