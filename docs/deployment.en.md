# Deployment

Kestrel Radar's production form is **one process serving both the interface and API**. For a complete first-use walkthrough, see [Getting started](getting-started.en.md); this page covers running and maintaining the service. The backend serves built frontend assets on the same origin, so a reverse proxy is not required and there are no cross-origin issues.

## Option 1: startup scripts

Linux/macOS:

```bash
./start.sh
```

Windows: double-click `start.bat`.

The scripts check whether Node and pnpm are available. If the root has no `node_modules`, they install dependencies; they then build the interface and start the service with `pnpm start` (port 8765 by default). **The scripts do not install Node or pnpm for you.** Node must meet the version requirements in the repository's `package.json` (22.18+ or 24.12+); the pnpm version is pinned by the repository. Override the port and listen address with `KESTREL_PORT` and `KESTREL_HOST`.

## Option 2: Docker

### Pull from GitHub Container Registry

Image: `ghcr.io/raythalis/kestrelradar:latest`. Create `compose.yml` in the directory where you want to keep data:

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

Run `docker compose up -d` in that directory. The database and icons live in its `data/` directory. Removing the container does not delete host data. `latest` is a moving tag and may point to a newer version when pulled again. Port mapping lets other devices access the service through the host address; restrict access accordingly.

### Build from local source

The Compose file included in this repository builds local source; it **does not pull the GitHub image above**. From the repository root run:

```bash
docker compose -f infra/docker/docker-compose.yml up -d --build
```

The port is `8765`; data (database and icons) lives in `infra/docker/data/`. To upgrade, switch the source to the target version and rebuild. You can also build manually with `docker build -f infra/docker/Dockerfile -t kestrelradar:local .`, but still need to map the port and persistently mount `/data` when running it.

## Option 3: manual startup

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start                 # default: 127.0.0.1:8765
```

For a long-running background service, use a process manager. Relative paths change with the working directory; in production, explicitly use absolute `KESTREL_DB_PATH` and `KESTREL_STATIC_DIR` paths. Example systemd unit (adjust paths and Node version to your environment):

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

## Behind a reverse proxy

Because the interface and API share an origin, proxy the whole site to `8765`; `/api` needs no separate routing:

```nginx
server {
  listen 443 ssl;
  server_name kestrel.example.com;

  # Configure your own certificate and authentication; Kestrel Radar has no account system
  location / {
    proxy_pass http://127.0.0.1:8765;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

**Security warning:** Kestrel Radar v1.0 has no authentication. Before exposing it to the public internet, add authentication in front of it (reverse-proxy basic auth, your SSO gateway, or access restricted to a VPN subnet); otherwise you expose data and channel credentials.

## Upgrades and data

### From v1.0.0 to v1.1.0

- This version adds WeCom, DingTalk, Feishu bot webhooks, and SMTP email channels. Signing is optional for DingTalk and Feishu. Existing Telegram and generic Webhook channels, their actions, and delivery history remain; no reconfiguration is required. A WeChat channel is not included.
- Stop the service and back up the entire data directory before switching to the target version and starting it. Startup adds a channel type field automatically. Verify existing channels, actions, and delivery history before adding new channels. Testing a channel actually sends a message.
- To return to v1.0.0, stop the service, restore the **pre-upgrade** backup of the entire data directory, and then start the older version. Do not simply switch back the program while keeping the migrated database. Restoring the backup loses configurations and records added or changed afterward; first preserve a separate copy of the current data directory in case you need to upgrade again or recover data.

- Upgrade the program or image without deleting the data directory. For scripts, update the source and rebuild. For a local Docker build, switch to the target source version and rebuild. For the GitHub image, back up data first, then run `docker compose pull` and `docker compose up -d`. If using `latest`, record the current image ID before upgrading so you can roll back if necessary.
- Back up the entire data directory, including the database, related files, and sibling `icons/` directory.
- Database migrations run automatically on service startup; no manual script is needed. **Stop the service and back up the whole data directory before upgrading**, including icons and database-related files. For online backups use a consistent SQLite backup method; do not copy only `.db`.
- The application has no authentication. Docker Compose's `8765:8765` maps a host-accessible port; do not publish it directly to the public internet. For environment variables and data paths, see [Configuration](configuration.en.md).
