# fresh-shop/Dockerfile

# --- 阶段 1: 构建 React 前端 ---
FROM node:22-alpine AS frontend_builder

WORKDIR /app/frontend

# 使用 pnpm workspace 的方式复制 package.json 和 lock 文件
# 复制 monorepo 根目录的 package.json
COPY package.json ./
# 复制 monorepo 根目录的 pnpm-lock.yaml
COPY pnpm-lock.yaml ./
# 复制前端 package.json
COPY frontend/package.json ./frontend/

# 安装所有依赖 (包括 monorepo 根目录和前端项目的)
RUN pnpm install --frozen-lockfile

# 复制前端源代码
COPY frontend .

# 执行 React 打包命令，产物在 /app/frontend/dist
# vite 默认打包到 dist
RUN pnpm run build

# --- 阶段 2: 构建 NestJS 后端 ---
FROM node:22-alpine AS backend_builder

WORKDIR /app/backend

# 复制 monorepo 根目录的 package.json 和 lock 文件
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY backend/package.json ./backend/

# 安装所有依赖 (包括 monorepo 根目录和后端项目的)
RUN pnpm install --frozen-lockfile

# 复制后端源代码和 Prisma schema 文件
COPY backend .
# 复制 monorepo 根目录的 prisma 文件夹到 backend 内部
COPY prisma ./prisma

# 编译 NestJS 项目，产物在 /app/backend/dist
RUN pnpm run build

# 运行 Prisma Migrate (在构建阶段执行)
# 这将根据你的 schema.prisma 文件创建或迁移数据库，并在容器内生成 Prisma Client
# 注意：这里是 prisma generate，而不是 migrate deploy，因为文件会在后续步骤中持久化。
# 如果你想在容器启动时执行migrate，则不在这里执行，而是在CMD中。
# 但对于SQLite，通常在构建时先生成Client，后续通过VOLUME持久化数据。
RUN npx prisma generate

# --- 阶段 3: 最终的运行镜像 ---
FROM node:22-alpine

WORKDIR /app

# 复制 NestJS 编译后的文件 (来自 backend_builder 阶段)
COPY --from=backend_builder /app/backend/dist ./backend/dist
# 复制 NestJS 的 package.json (用于运行时依赖)
COPY --from=backend_builder /app/backend/package.json ./backend/package.json

# 复制 React 打包后的文件 (来自 frontend_builder 阶段)
# 根据你的 ServeStaticModule 配置：rootPath: join(process.cwd(), 'frontend', 'dist')
# process.cwd() 在容器内就是 /app
# 所以前端的 dist 文件夹需要复制到 /app/frontend/dist
COPY --from=frontend_builder /app/frontend/dist ./frontend/dist

# 复制 Prisma schema 和生成的 Client
COPY --from=backend_builder /app/backend/prisma ./backend/prisma
# 复制生成的 prisma client
COPY --from=backend_builder /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
# 确保运行时 Node.js 依赖也在最终镜像中
COPY --from=backend_builder /app/backend/node_modules ./backend/node_modules

# 暴露 NestJS 服务的端口
EXPOSE 3000

# 设置 NestJS 应用的入口命令
# 确保在容器启动时能正确找到 dist/main.js
CMD ["node", "./backend/dist/main"]