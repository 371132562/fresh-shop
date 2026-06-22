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

命令以当前 `package.json` 脚本为准；根脚本负责分发到前端和后端。只有缺少脚本时，才使用 `pnpm --filter ... exec` 调用底层工具，并确认 tsconfig 覆盖了目标代码。

### 根目录检查

- 全量 ESLint：`pnpm lint`
- 全量 TypeScript：`pnpm typecheck`
- 根 JS 配置 ESLint：`pnpm lint:root`

### 前端检查

- ESLint：`pnpm lint:frontend`
- TypeScript：`pnpm typecheck:frontend`

### 后端检查

- ESLint：`pnpm lint:backend`
- TypeScript：`pnpm typecheck:backend`

## 反模式

- 不要因为赶时间就关闭规则、删除注释或用 `any` 混过去。
- 不要忽略 monorepo 边界，在错误目录执行无效命令。
