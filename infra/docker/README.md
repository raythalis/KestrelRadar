# infra/docker

Kestrel Radar 的容器化：**单镜像、单容器**，一个进程同时提供界面与 API。

```bash
# 在仓库根目录
docker compose -f infra/docker/docker-compose.yml up -d --build
docker compose -f infra/docker/docker-compose.yml logs -f
docker compose -f infra/docker/docker-compose.yml down
```

- `Dockerfile`：两阶段构建。先把界面构建出来、再按生产依赖重装一遍（去掉开发依赖），
  runtime 只带运行时需要的东西，非 root 用户运行。
- `docker-compose.yml`：端口 `8765`、数据目录 `./data`（数据库 + 图标），`restart: unless-stopped`。
- 容器无状态：数据都在挂载出来的目录里，升级 = 换镜像重启，删容器不删数据。

镜像地址：`ghcr.io/raythalis/kestrelradar:latest`。镜像方式的 Compose 示例见[部署文档](../../docs/deployment.md)。
