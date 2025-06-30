# 使用官方的 Node.js 22 LTS 镜像作为基础镜像
FROM node:22-alpine AS base

# 设置工作目录
WORKDIR /app

# 拷贝 pnpm lock 文件，并安装 pnpm
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm

# 拷贝 monorepo 的所有文件
COPY . .

# --- 前端构建阶段 ---
FROM base AS frontend_builder

WORKDIR /app/frontend

# 安装前端依赖
RUN pnpm install

# 构建前端项目
RUN pnpm run build

# --- 后端构建阶段 ---
FROM base AS backend_builder

WORKDIR /app/backend

# 安装后端依赖
RUN pnpm install

# 生成 Prisma 客户端
RUN pnpm prisma generate

# 应用 Prisma 迁移，初始化或更新数据库结构
# 注意：生产环境中通常不建议直接在 Dockerfile 中执行 migrate dev，
# 更推荐使用 migrate deploy 或者在 entrypoint 脚本中执行 migrate deploy/reset
# 但为了你的需求，我们在这里直接执行
RUN pnpm prisma migrate deploy

# 构建后端项目
RUN pnpm run build

# === 诊断步骤：添加一个 LS 命令来检查 dist 目录 ===
RUN ls -la /app/backend/dist
RUN ls -la /app/backend

# --- 最终生产镜像阶段 ---
FROM node:22-alpine AS final

# 设置工作目录
WORKDIR /app

# 拷贝构建好的前端产物
COPY --from=frontend_builder /app/frontend/dist ./frontend/dist

# 拷贝构建好的后端产物 (包括 node_modules, Prisma 相关文件等)
COPY --from=backend_builder /app/backend/dist ./backend/dist
COPY --from=backend_builder /app/backend/node_modules ./backend/node_modules
# 拷贝 prisma 文件夹，确保 schema.prisma 和 migrations 可用
COPY --from=backend_builder /app/backend/prisma ./backend/prisma

# 暴露 NestJS 应用程序的端口
EXPOSE 3000

# 定义一个 shell 脚本作为入口点
COPY ./entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# 启动 NestJS 应用程序
ENTRYPOINT ["entrypoint.sh"]