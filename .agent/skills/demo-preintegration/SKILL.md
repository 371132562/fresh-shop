---
name: demo-preintegration
description: 在 fresh-shop 中编写 demo、mock 页面、联调前前后端占位、临时接口、临时 seed 或原型功能时使用；先区分临时演示与后续联调依据，并约束占位边界与清理点。
---

# Demo 与联调前开发规范

## 概述

本 Skill 用于把“先看效果”和“后续真实联调依据”分清楚。无论是临时 demo 还是较正式的联调前方案，都必须遵循 fresh-shop 的前后端分层、类型契约、注释和验证边界。

## 先确认性质

开始编写前，先向用户确认：

> 这是只用于临时查看效果的 demo，还是会作为后续真实联调依据的较正式方案？

如果用户说“demo”，但实现需要改动现有业务入口、Store、接口、共享类型、后端模块、schema 或 seed，必须二次确认：

> 当前 demo 需要基于已有业务文件改造，会影响现有流程。请确认继续改现有功能，还是改为独立入口 / 后续联调依据方案？

未确认前，不修改已有业务流程。

## 编写前先找成熟模块

- 至少查找 3 个项目内相似模块，复用其页面、Store、services、后端 module/service、DTO、Prisma 和注释风格。
- 涉及 React 页面、组件、弹窗、表单、列表或样式时，同时使用 `create-ui-component`。
- 涉及 Zustand Store 或页面级状态时，同时使用 `create-zustand-store`。
- 涉及 DTO、共享类型、响应结构时，同时使用 `type-contract-guidelines`。
- 涉及后端临时接口、service、controller 时，同时使用 `create-backend-module`。
- 涉及 schema、seed、落库结构或 Prisma Client 时，同时使用 `prisma-workflow`。
- 涉及复杂类型、函数、state/action 或占位注释时，同时使用 `comment-detail-preservation`。

## 临时占位必须可定位

凡是 demo 或联调前占位内容，都要用中文注释标清楚，便于后续删除或替换。

必须标注：

- 临时字段名：来自前端假设、用户描述、旧模块参考，还是后端待确认。
- 临时接口地址：真实接口未定时，明确当前地址只是联调前占位。
- 临时数据结构：说明 mock 数据对应页面哪块展示或哪段状态流。
- 临时枚举值：说明枚举含义、来源和后续需要确认的点。
- 临时 Store/action：说明服务哪个 demo 或联调前流程，真实联调时如何替换。
- 临时 seed / 落库数据：说明是否可删除、是否会影响统计口径或测试数据。
- 临时 UI 入口：说明是否接入正式路由、菜单或仅用于本地验证。

推荐格式：

```ts
/**
 * 联调前占位：当前字段结构用于支撑 xxx 页面展示。
 * 真实接口确定后，需要以后端返回字段和枚举口径替换。
 */
```

## 单纯 Demo

如果用户确认只是临时 demo：

- 优先新建独立页面、组件、Store、mock 数据或后端占位模块；只在验证入口确实需要时，小范围追加路由、菜单或接口。
- 代码仍放在 `frontend/src`、`backend/src`、`backend/types`、`backend/prisma` 等项目原生分层下，不放到脱离项目规范的临时目录。
- 文件名、变量名或注释要体现 demo / 临时占位属性。
- 不修改真实业务接口契约，不把 demo 兜底逻辑混入正式业务 Store 或 service。
- 不默认接入正式菜单、权限、生产路由或真实统计口径。

## 联调前正式方案

如果用户确认会作为后续真实联调依据：

- 按正式功能目录分层实现，不能写成脱离项目结构的临时草稿。
- API、types、store、page、component、controller、service 的边界必须参考成熟模块。
- 未确定的后端字段、接口地址、枚举、状态流、统计口径要集中标注，不能包装成最终规则。
- 涉及后端占位接口时，controller 仍保持轻量，业务语义写在 service；响应结构仍走统一拦截器。
- 涉及临时 seed 或 schema 时，先确认数据库影响和回滚路径。
- 交付时列出“后续联调需要替换或确认的点”。

## 禁止事项

- 禁止因为是 demo 就绕过 services/base.ts、Zustand、DTO、BusinessException、PrismaService 或统一响应约定。
- 禁止用 `any` 承接临时数据，除非局部原因明确且注释说明替换点。
- 禁止把 mock 数据伪装成真实接口返回。
- 禁止为 demo 添加无关兜底、兼容或降级逻辑。
- 禁止默认执行 `install / dev / start / preview / build`。
- 禁止自动提交 Git。

## 验证要求

- 纯文案或纯规范改动通常不需要 lint/typecheck。
- demo 或联调前代码进入业务分层后，按改动范围执行最小必要检查。
- 在 WSL + `/mnt/<盘符>/...` 环境执行 `pnpm`、`node`、`prisma`、`tsc`、`eslint`、`seed` 前，先使用 `wsl-windows-command-bridge`。
