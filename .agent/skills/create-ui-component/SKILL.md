---
name: create-ui-component
description: 在 fresh-shop 中创建或修改 React 页面、组件、布局、样式、路由承载页面时使用，既要遵循当前前端分层，也要保留本项目已有的 UI 语言与交互密度。
---

# 前端组件与页面开发规范

若任务强依赖 Ant Design 官方 API 或示例，继续加载 `ant-design-docs`。若本次改动会新增或重写较多注释，同时参考 `comment-detail-preservation`。

## 先查

- `frontend/src/pages/Supplier/index.tsx`
- `frontend/src/pages/Product/index.tsx`
- `frontend/src/pages/Order/index.tsx`
- `frontend/src/pages/Analysis/index.tsx`
- `frontend/src/components/SearchToolbar/index.tsx`
- `frontend/src/components/Layout/index.tsx`
- `frontend/src/router.tsx`

## 执行检查单

1. 页面/组件只负责展示与交互编排，不把请求编排和大段业务逻辑塞进组件。
2. 请求统一走 `services/apis.ts` + `services/base.ts`。
3. 页面级业务状态放 `stores/`，不要把列表、详情、提交 loading 回流进页面组件。
4. 前后端共享业务类型优先复用 `fresh-shop-backend/types/dto.ts` 与 `fresh-shop-backend/types/response.ts`。
5. 新增或修改页面入口时，同步检查 `router.tsx` 的懒加载路径和跳转路径。
6. 常规列表页优先复用当前项目已有模式：顶部 `Card + Form + SearchToolbar`，主体用 `List` 或现有容器承载分页与操作按钮。
7. 详情页、编辑页优先参考 `Detail.tsx` / `Modify.tsx` 的分层方式，不把详情读取与提交逻辑散落在多个组件。
8. 样式优先级保持 `Ant Design > Tailwind CSS > 局部自定义样式`。
9. 编辑类 `Modal` 默认设置 `maskClosable={false}`；纯展示类弹窗按实际交互决定。
10. 加载态优先使用现有 Loading、骨架屏或 Ant Design 内建状态，文案统一中文。
11. 涉及副作用设计、并发、列表渲染、高频交互或重渲染优化时，继续评估 `vercel-react-best-practices`。
12. 涉及多个 boolean props、复合组件、状态与 UI 解耦时，再评估 `vercel-composition-patterns`。

## 当前项目 UI 特化规范

本项目不是通用后台模板，而是社区团购管理平台。迁移或新建 UI 时，不要只保留“能用”的通用后台骨架，要尽量延续当前仓库已经形成的视觉语言。

### 整体视觉基调

- 设计关键词：现代化、简洁、悬浮卡片式、偏运营看板。
- 背景通常使用浅灰底色，主要内容通过白色卡片、圆角和阴影拉开层次。
- 主色调以蓝色系为主，分析和统计区域允许使用浅色渐变提升信息层次。
- 图标使用图标库，不用 emoji。
- 间距要保持“信息密但不挤”，避免极端留白或过度紧凑。

### 样式与响应式原则

- 样式方案优先级：Ant Design 组件能力 > Tailwind 布局与响应式 > 少量局部样式。
- 避免新增全局样式或破坏现有页面整体风格。
- 响应式采用移动端优先：基础样式无前缀，`md`/`lg` 逐级增强。
- 常用布局切换参考：
  - `flex-col md:flex-row`
  - `px-4 py-3 md:px-6 md:py-4`
  - `hidden md:block`

### 数值与统计文本配色

- 列表页统计/描述区域：只用颜色强调，不默认加粗；备注字段维持普通文本样式。
- 统计卡片、分析模块核心指标：可以使用 `font-bold` 强调数值。
- 金额类：`text-blue-400`
- 利润类：正值 `text-green-600`，负值 `text-red-600`，零值 `text-gray-500`
- 退款相关：`text-orange-600`
- 计数类：`text-blue-600`
- 若项目已有 `utils/profitColor` 等工具，优先复用，不要手写一套新的利润配色判断。

## 核心组件模式

### 1. Layout 与功能菜单

- 顶部 Header 延续当前实现：蓝色渐变背景、白字、圆角、阴影，整体有“悬浮头部”感。
- Header 常用样式参考：`rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 shadow-lg md:px-6 md:py-4`
- 页面外层优先使用浅灰背景，如 `min-h-screen bg-gray-100`。
- 主容器保持大屏居中与最大宽度限制，例如 `mx-auto max-w-screen-2xl`。
- 侧边菜单保持白底卡片、圆角、阴影，选中态为高亮蓝色块，非选中态是低饱和文字配悬浮态背景。
- 当前项目的菜单不是朴素树状后台菜单，而是较明显的运营面板风格；不要回退成默认 Ant Design 侧栏视觉。
- 移动端菜单、设置、统计说明按钮应保留明显可点击的“半透明白底胶囊/按钮”风格。

### 2. 常规列表页

#### 页面结构

- 搜索区使用 `Card` 容器，通常是 `size="small"` + `className="mb-4 w-full"`。
- 搜索表单统一使用 `Form layout="vertical"`。
- 栅格优先复用 `Row gutter={[16, 8]}` + `Col xs={24} md={12} lg={8}`。
- 表单项通常用 `className="!mb-1"` 控制密度。
- 工具栏统一复用 `SearchToolbar`，不要每个页面重新拼搜索/重置/新增/统计条。

#### 搜索区交互

- `Input` 优先支持 `allowClear`、`onPressEnter={handleSearch}`、`onClear={handleSearch}`。
- `Select` 优先支持 `allowClear`、`showSearch`；多选场景再加 `mode="multiple"`。
- 搜索动作应在表单校验后统一写回 `pageParams`，并重置到第一页。
- 重置动作应显式清空表单与筛选状态，而不是只重刷列表。

#### 列表项布局

- 当前项目大量列表采用 `List` 而不是 `Table`，这是现有风格的一部分，不要无必要改回通用表格后台。
- 列表项外层优先复用：
  - `flex w-full flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4`
- 信息区优先复用：
  - `min-w-0 flex-1 overflow-hidden pr-0 md:pr-4`
- 标题文字优先复用：
  - `block max-w-full overflow-hidden text-lg font-medium text-ellipsis whitespace-nowrap md:overflow-visible md:break-all md:whitespace-normal`
- 操作区优先复用：
  - `flex shrink-0 flex-row flex-wrap items-center justify-start gap-2 md:justify-end md:gap-3`

#### 列表项内容规则

- 标题可编辑或可跳转时，优先使用 `Button type="link"` 或 `NavLink`，并去掉默认大内边距。
- 描述区常用 `space-y-1`，保证统计字段与备注字段分层展示。
- 标签、状态、类型优先用 `Tag`，避免纯文本堆砌。
- 危险操作必须配 `Popconfirm`。
- 分页统一由 Store 管理页码和筛选参数；组件只负责触发变更。

### 3. SearchToolbar

- 统计信息放左侧，排序和操作按钮放右侧，这是当前项目的稳定模式。
- 工具栏应适配窄屏换行，不假设桌面端宽度永远足够。
- 排序区采用“字段选择 + 升降序切换”的组合，不要把多个排序条件散落到页面别处。
- “总数 + 无有效订单/无订单”之类的统计标签是业务感知的一部分，能复用就复用，不要简化成只有分页总数。

### 4. 统计详情与分析类 Modal

- 统计详情类弹窗不是普通表单弹层，允许更强的视觉层次。
- 标题通常由“主标题 + 说明 Tooltip”组成，Tooltip 内允许多行说明和强调关键信息。
- 基本信息卡片可使用浅蓝背景头部或卡片式标题区，突出对象名称和时间信息。
- 核心指标区允许使用浅色渐变背景，例如：
  - `bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50`
- 指标卡片保持白底、圆角、阴影、轻微 hover 提升，避免做成厚重仪表盘。
- 时间信息、核心数字、图标应有明确主次关系，不要把统计弹窗做成纯文档列表。
- 详细分析区域要优先复用现有分析组件，不要把所有统计逻辑直接写进单个弹窗组件。

### 5. 加载、空态与反馈

- 分析类、详情类、结构较重的内容优先使用 `Skeleton`，不要只放一个小号 spinner。
- 空态推荐使用居中弱提示，例如 `flex items-center justify-center py-8 text-gray-500`。
- 成功、失败、提示反馈应维持中文，并和当前项目 `message` / `notification` 风格一致。

## 交互细节

- 按钮、卡片、菜单项应保持轻量过渡效果，如 `transition-colors`、`transition-all`、`hover:shadow-md`。
- 不要引入夸张动画、复杂动效或强侵入式弹跳。
- 模态框、抽屉、浮层的关闭方式要清晰，遮罩关闭是否开启应符合业务风险。
- 高风险动作的按钮层级要清楚，不要把“删除”“退款”等危险操作做成默认主按钮视觉。

## 通用原则

- 开发前查找至少 3 个相似页面或组件，优先沿用当前项目模式。
- 相似组件出现三次以上再考虑抽象，避免为了“设计系统化”过度提炼。
- 保留本项目已有的运营后台风格，不要因为迁移规则而回退成通用、无特征的企业后台模板。

## 反模式

- 不要在组件里直接写 URL、`fetch`、成功码判断。
- 不要把大段业务逻辑堆进 `useEffect`。
- 不要在多个页面各自复制同一套搜索、分页、loading 管理逻辑。
- 不要为了“统一风格”删掉当前项目已有的列表密度、Header 渐变、统计卡片层次等特化设计。
- 不要把分析类页面或弹窗改成朴素 CRUD 表单风格，导致和现有页面视觉割裂。
