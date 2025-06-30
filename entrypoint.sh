#!/bin/sh

# 进入后端目录
cd /app/backend

# 运行 Prisma 迁移，确保数据库是最新的
# 这一步非常重要，它会应用所有待处理的迁移，无论是初始化还是更新。
# 对于生产环境，`prisma migrate deploy` 是最佳选择，它只执行应用过的迁移。
echo "Running Prisma migrations..."
pnpm prisma migrate deploy

# 启动 NestJS 应用
echo "Starting NestJS application..."
pnpm run start:prod