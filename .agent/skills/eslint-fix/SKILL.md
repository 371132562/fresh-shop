---
name: eslint-fix
description: 在 fresh-shop 中执行 ESLint 检查、TypeScript 检查与规范修复时使用；按改动范围定向运行前端或后端命令，避免默认全量扫描。
---

# ESLint 与 TypeScript 检查

## 使用原则

- 先根据改动范围判断是否需要检查
- 优先定向检查受影响的工作区，不默认跑全仓库
- 纯文案、纯注释、纯文档类修改，通常不需要额外执行 lint 或 typecheck

## 前端检查

- ESLint：`pnpm --filter fresh-shop-frontend lint`
- TypeScript：`pnpm --filter fresh-shop-frontend exec tsc --noEmit`

## 后端检查

- ESLint：`pnpm --filter fresh-shop-backend lint`
- TypeScript：`pnpm --filter fresh-shop-backend exec tsc -p tsconfig.json --noEmit`

## 执行策略

- 只改前端时，不运行后端检查
- 只改后端时，不运行前端检查
- 同时改前后端且共享类型受影响时，再分别执行对应检查
- 若自动修复后仍有报错，按终端提示继续手工修正并复检
