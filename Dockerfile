# 使用 Node.js 22 作为基础镜像
FROM node:22-alpine AS base

# 设置工作目录
WORKDIR /app

# 复制 monorepo 的 pnpm 文件
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY pnpm-workspace.yaml ./

# 安装 pnpm
RUN npm install -g pnpm

# --- 前端构建阶段 ---
FROM base AS frontend_builder
WORKDIR /app

# 复制前端项目文件
COPY frontend ./frontend

# 安装前端依赖
WORKDIR /app/frontend
RUN pnpm install --frozen-lockfile

# 构建前端项目
RUN pnpm run build

# --- 后端构建阶段 ---
FROM base AS backend_builder
WORKDIR /app

# 复制后端项目文件
COPY backend ./backend

# 安装后端依赖
WORKDIR /app/backend
RUN pnpm install --frozen-lockfile

# 复制 Prisma schema 文件
# 确保在后端构建阶段可以访问到 Prisma schema
COPY backend/prisma ./backend/prisma

# 生成 Prisma 客户端
WORKDIR /app/backend
RUN npx prisma generate

# 构建后端项目
RUN pnpm run build

# --- 最终运行阶段 ---
FROM node:22-alpine AS runner
WORKDIR /app

# 从构建阶段复制必要的文件
COPY --from=frontend_builder /app/frontend/dist ./frontend/dist
COPY --from=backend_builder /app/backend/dist ./backend/dist
COPY --from=backend_builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend_builder /app/backend/package.json ./backend/package.json
COPY --from=backend_builder /app/backend/prisma ./backend/prisma

# 设置环境变量，如果你的 NestJS 应用需要
ENV NODE_ENV production

# 暴露后端端口
EXPOSE 3000

# 在启动 NestJS 应用之前运行 Prisma migrate
# 这将初始化或更新你的数据库
CMD ["sh", "-c", "cd backend && npx prisma migrate deploy && node dist/main"]