---
name: eslint-fix
description: 在 fresh-shop 中执行 ESLint 检查、TypeScript 检查与规范修复时使用；按改动范围定向运行前端或后端命令，避免默认全量扫描。
---

# ESLint / TypeScript 检查规范

## 执行检查单

1. 先根据改动范围判断是否真的需要检查。
2. 优先定向检查受影响的工作区，不默认跑全仓库。
3. 纯文案、纯注释、纯文档类修改，通常不需要额外执行 lint 或 typecheck。
4. 先修 import、未使用变量、语法错误，再修真实类型问题。
5. 自动修复后复跑一次。
6. 如果当前环境是 WSL 且项目位于 `/mnt/<盘符>/...`，执行 `pnpm` / `eslint` / `tsc` 前先参考 `wsl-windows-command-bridge`。
7. 本 Skill 不默认触发 `install / dev / build`；如确需构建验证，必须与当前任务直接相关。

## 常用命令

### 前端检查

- ESLint：`pnpm --filter fresh-shop-frontend lint`
- TypeScript：`pnpm --filter fresh-shop-frontend exec tsc --noEmit`

### 后端检查

- ESLint：`pnpm --filter fresh-shop-backend lint`
- TypeScript：`pnpm --filter fresh-shop-backend exec tsc -p tsconfig.json --noEmit`

## 反模式

- 不要因为赶时间就关闭规则、删除注释或用 `any` 混过去。
- 不要忽略 monorepo 边界，在错误目录执行无效命令。
