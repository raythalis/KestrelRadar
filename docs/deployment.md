# 部署

Kestrel Radar 的生产形态是**一个进程同时提供界面与 API**。初次使用的完整用户流程见[快速开始](getting-started.md)，本篇只讲运行与维护。
前端构建产物由后端静态托管，同源访问，不需要反向代理，也不会有跨域问题。

## 方式一：一键脚本

Linux / macOS：

```bash
./start.sh
```

Windows：双击 `start.bat`。

脚本会检查 Node 与 pnpm 是否可用；若根目录尚无 `node_modules`，安装依赖，然后构建界面并用 `pnpm start` 起服务（默认 8765）。**脚本不会自动安装 Node 或 pnpm**。Node 要满足仓库 `package.json` 的版本要求（22.18+ 或 24.12+）；pnpm 版本由仓库固定。
端口与地址用 `KESTREL_PORT`、`KESTREL_HOST` 覆盖。

## 方式二：Docker

### 从 GitHub 镜像仓库拉取

镜像地址：`ghcr.io/raythalis/kestrelradar:latest`。在准备存放数据的目录新建 `compose.yml`：

```yaml
services:
  kestrel:
    image: ghcr.io/raythalis/kestrelradar:latest
    container_name: kestrelradar
    restart: unless-stopped
    ports:
      - '8765:8765'
    environment:
      KESTREL_HOST: 0.0.0.0
      KESTREL_PORT: '8765'
      KESTREL_DB_PATH: /data/kestrel.db
      KESTREL_STATIC_DIR: /app/apps/web/dist
    volumes:
      - ./data:/data
```

在该目录运行 `docker compose up -d`。数据库和图标存放在同目录的 `data/`，删除容器不会删除宿主数据。`latest` 是浮动标签，重新拉取时可能变成新版；端口映射会允许其他设备通过主机地址访问，请限制访问范围。

### 从本地源码构建

当前仓库提供的 Compose 文件使用本地源码构建，**不会拉取上面的 GitHub 镜像**。在仓库根目录运行：

```bash
docker compose -f infra/docker/docker-compose.yml up -d --build
```

端口为 `8765`，数据在 `infra/docker/data/`（数据库和图标）。升级：切换到目标版本的源码后重新执行构建；也可直接用 `docker build -f infra/docker/Dockerfile -t kestrelradar:local .` 手动构建，但运行时仍需映射端口并持久挂载 `/data`。

## 方式三：手动

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start                 # 默认 127.0.0.1:8765
```

要长期在后台跑，用进程管理器托管。相对路径会随工作目录变化，生产建议显式指定绝对的 `KESTREL_DB_PATH` 和 `KESTREL_STATIC_DIR`。systemd 单元示例（按自己的路径和 Node 版本改）：

```ini
[Unit]
Description=Kestrel Radar
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=kestrel
WorkingDirectory=/srv/kestrel/apps/api
Environment=KESTREL_HOST=127.0.0.1
Environment=KESTREL_PORT=8765
Environment=KESTREL_DB_PATH=/srv/kestrel-data/kestrel.db
Environment=KESTREL_STATIC_DIR=/srv/kestrel/apps/web/dist
ExecStart=/usr/bin/node src/index.ts
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

## 放到反向代理后面

因为界面与 API 同源，反代只需要把整个站点指到 `8765`，不需要给 `/api` 单独分流：

```nginx
server {
  listen 443 ssl;
  server_name kestrel.example.com;

  # 请自行配置证书与鉴权；Kestrel Radar 自身没有账号体系
  location / {
    proxy_pass http://127.0.0.1:8765;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

**安全提醒**：Kestrel Radar v1.0 没有鉴权。要放到公网必须自己在前面加身份验证（反向代理的 basic auth、
你的 SSO 网关，或只允许 VPN 网段访问），否则等于把数据和渠道凭据公开出去。

## 升级与数据

### 从 v1.0.0 升至 v1.1.0

- 此版本新增企业微信、钉钉、飞书机器人 Webhook 和 SMTP 邮件渠道；钉钉与飞书支持可选加签。原有 Telegram、Webhook 渠道及关联动作、投递记录保留，旧渠道无需重配。此版本不包含微信渠道。
- 停服务后备份整个数据目录，再切换到目标版本并启动。启动时会自动增加渠道类型字段；先核对原有渠道、动作和历史投递，再按需添加新渠道。测试渠道会实际发送一条消息。
- 若必须回到 v1.0.0，先停服务，恢复**升级前**备份的整个数据目录，再启动旧版本。不要只切回旧程序、让它直接读取已升级的数据库；恢复备份会丢失备份后新增或修改的配置与记录。先另存当前数据目录，供必要时重新升级或提取数据。

- 升级只更换程序或镜像，不删除数据目录。脚本方式更新源码后重新构建；Docker 本地构建方式切换到目标版本源码后重新构建；GitHub 镜像方式先备份数据，再执行 `docker compose pull` 和 `docker compose up -d`。使用 `latest` 时，升级前请记录当前镜像 ID，方便需要时回退。
- 备份：复制整个数据目录（数据库文件、相关文件和同级 `icons/`）。
- 数据库迁移在服务启动时自动执行，不用手动跑脚本；**升级前先停服务并备份整个数据目录**，含图标与数据库相关文件。运行中备份需使用 SQLite 一致性备份方式，不要只复制 `.db`。
- 应用本身没有鉴权，Docker Compose 的 `8765:8765` 会映射到主机可访问接口；不要直接发布到公网。具体环境变量和数据位置见[配置](configuration.md)。
