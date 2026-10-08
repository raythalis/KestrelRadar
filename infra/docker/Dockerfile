# Kestrel Radar 生产镜像：同一个进程同时提供界面（web 构建产物）与 API
#
# 构建（在仓库根目录）：
#   docker build -f infra/docker/Dockerfile -t kestrelradar .
# 运行：
#   docker run -d --name kestrelradar -p 8765:8765 -v kestrel-data:/data kestrelradar
#
# 说明：容器本身无状态，数据库与图标都在 /data 里，升级就是换镜像再起一次。
FROM node:24-bookworm-slim AS build

WORKDIR /src
# pnpm 版本与仓库 packageManager 对齐，避免锁文件格式漂移
RUN npm i -g pnpm@12.8.1
COPY . .
RUN pnpm install --frozen-lockfile
# 界面构建（含类型检查）
RUN pnpm --filter kestrel-web build
# 去掉开发依赖，镜像里只留下运行时用得到的
RUN pnpm install --frozen-lockfile --prod


FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production \
    KESTREL_HOST=0.0.0.0 \
    KESTREL_PORT=8765 \
    KESTREL_DB_PATH=/data/kestrel.db \
    KESTREL_STATIC_DIR=/app/apps/web/dist

WORKDIR /app
COPY --from=build /src /app
RUN mkdir -p /data && chown -R node:node /data /app

USER node
EXPOSE 8765
VOLUME ["/data"]

# 自己的健康检查不依赖 curl（slim 镜像里没有）
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.KESTREL_PORT||8765)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/api/src/index.ts"]
