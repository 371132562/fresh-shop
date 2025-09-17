# 团购管理平台 - 前端设计规范

## 📋 项目概述

本项目是一个社区团购管理平台的前端应用，采用 React + TypeScript + Zustand + Ant Design + Tailwind CSS 技术栈。本文档记录了当前最新的UI/UE设计规范和组件使用指南。

## 🎨 设计系统

### 整体设计风格

- **设计理念**：现代化、简洁、悬浮卡片式设计
- **色彩方案**：蓝色主色调 + 浅灰色背景 + 白色卡片
- **布局方式**：响应式设计，移动端优先
- **视觉层次**：通过阴影、圆角、透明度营造层次感

### 色彩规范

```css
/* 主色调 */
--primary-blue: #3b82f6 (blue-500)
--primary-blue-dark: #2563eb (blue-600)
--primary-blue-light: #dbeafe (blue-50)

/* 功能色 */
--success-green: #10b981 (green-500)
--warning-orange: #f59e0b (orange-500)
--danger-red: #ef4444 (red-500)

/* 中性色 */
--gray-100: #f3f4f6 (页面背景)
--gray-600: #4b5563 (次要文字)
--gray-900: #111827 (主要文字)
--white: #ffffff (卡片背景)
```

## 🏗️ 核心组件设计规范

### 1. Layout 组件

#### 整体布局结构
```
┌─────────────────────────────────────┐
│ Header (蓝色渐变背景)                │
├─────────────────────────────────────┤
│ Sider (桌面端) │ Content (主内容区)  │
│ 功能菜单       │ 页面内容            │
└─────────────────────────────────────┘
```

#### Header 设计规范
- **背景**：蓝色渐变 `bg-gradient-to-r from-blue-500 to-blue-600`
- **内边距**：响应式 `px-4 py-3 sm:px-6 sm:py-4`
- **文字颜色**：白色 `text-white`
- **圆角**：`rounded-xl`
- **阴影**：`shadow-lg`

#### 响应式布局
- **小屏幕**：垂直堆叠，隐藏侧边栏，显示菜单按钮
- **大屏幕**：水平布局，显示侧边栏，隐藏菜单按钮

#### 小屏幕悬浮菜单
- **触发方式**：Header左侧菜单按钮
- **位置**：从Header下方弹出
- **样式**：白色背景，圆角，大阴影
- **交互**：点击遮罩或关闭按钮关闭

### 2. OrderStatsButton 组件

#### 按钮设计规范
- **布局**：独立按钮，不包装在容器中
- **尺寸**：`px-4 py-2` 内边距
- **圆角**：`rounded-lg`
- **图标**：`text-lg` 大小
- **文字**：`hidden md:inline` 响应式显示

#### 颜色方案
- **待付款**：橙色 `bg-orange-500/95` + 悬停 `hover:bg-orange-400`
- **已付款**：绿色 `bg-green-500/95` + 悬停 `hover:bg-green-400`
- **数量徽章**：半透明白色背景 `bg-white/20`

#### Modal 设计规范
- **标题**：居中，`text-lg font-semibold text-gray-900`
- **统计卡片**：蓝色渐变背景，白色文字
- **订单卡片**：圆角，悬停效果，状态标签
- **布局**：CSS Grid 响应式两列布局

### 3. SearchToolbar 组件

#### 布局结构
```
┌─────────────────────────────────────────────────────────┐
│ 左侧组：统计信息 + 添加按钮  │  右侧组：排序 + 搜索/重置  │
└─────────────────────────────────────────────────────────┘
```

#### 左侧组设计
- **统计信息**：`text-sm text-gray-600`
- **添加按钮**：主要按钮样式，`PlusOutlined` 图标
- **间距**：`gap-3` 水平间距

#### 右侧组设计
- **搜索按钮**：`color="primary" variant="outlined"`
- **重置按钮**：默认样式
- **排序选择器**：160px 宽度

### 4. 功能菜单设计

#### 菜单项样式
- **默认状态**：`text-black/70 hover:!bg-blue-500/15 hover:text-black/80`
- **选中状态**：`!bg-blue-500/90 text-white`
- **图标**：`text-lg` 大小
- **文字**：`text-base font-medium`
- **内边距**：`px-4 py-3`
- **圆角**：`rounded-lg`

## 📱 响应式设计规范

### 断点定义
- **小屏幕**：< 640px (sm)
- **中等屏幕**：640px - 1024px (md)
- **大屏幕**：≥ 1024px (lg)

### 响应式策略
1. **移动端优先**：基础样式针对移动端设计
2. **渐进增强**：大屏幕添加更多功能和样式
3. **内容优先**：确保核心功能在所有设备上可用

### 具体应用
- **文字大小**：`text-xl sm:text-2xl` 响应式字体
- **内边距**：`px-4 py-3 sm:px-6 sm:py-4` 响应式间距
- **布局**：`flex-col lg:flex-row` 响应式布局方向
- **显示/隐藏**：`hidden lg:block` 响应式显示

## 🎯 交互设计规范

### 按钮交互
- **悬停效果**：`transition-colors` 颜色过渡
- **点击反馈**：适当的颜色变化
- **加载状态**：使用 `loading` 属性

### 卡片交互
- **悬停效果**：`hover:shadow-md` 阴影增强
- **边框变化**：`hover:border-{color}-300` 边框颜色变化
- **过渡动画**：`transition-all duration-300`

### 模态框交互
- **背景遮罩**：半透明黑色 `bg-black/20`
- **关闭方式**：点击遮罩、关闭按钮、ESC键
- **动画效果**：平滑的进入/退出动画

## 🛠️ 开发规范

### 组件命名
- **组件文件**：PascalCase (如 `OrderStatsButton`)
- **组件函数**：PascalCase (如 `const OrderStatsButton = () => {}`)
- **Props类型**：PascalCase + Props 后缀

### 样式规范
- **优先使用**：Tailwind CSS 类名
- **备选方案**：Ant Design 组件样式
- **避免使用**：全局CSS样式
- **响应式**：使用 Tailwind 响应式前缀

### 状态管理
- **统一使用**：Zustand 进行状态管理
- **数据逻辑**：集中在 stores 目录
- **API调用**：使用 services/base.ts 中的 Axios 实例

### 类型定义
- **优先使用**：type 而非 interface
- **位置**：backend/types 目录供前后端共用
- **禁止使用**：any 类型

## 📝 使用示例

### Layout 组件使用
```tsx
// 在路由组件中使用
<Layout>
  <YourPageContent />
</Layout>
```

### OrderStatsButton 组件使用
```tsx
// 在 Header 中使用
<OrderStatsButton />
```

### SearchToolbar 组件使用
```tsx
<SearchToolbar
  onSearch={handleSearch}
  onReset={resetSearch}
  searchLoading={loading}
  totalCount={total}
  countLabel="条记录"
  onAdd={() => setVisible(true)}
  addButtonText="添加记录"
/>
```

## 🔄 更新记录

- **2024-12-19**：建立设计规范文档，记录当前UI/UE风格
- **Layout组件**：实现三部分悬浮布局，响应式设计
- **OrderStatsButton**：双按钮设计，独立渲染
- **SearchToolbar**：左侧组集成添加按钮
- **功能菜单**：小屏幕悬浮下拉菜单

## 📚 相关资源

- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Ant Design 文档](https://ant.design/components/overview-cn)
- [React Router 文档](https://reactrouter.com/)
- [Zustand 文档](https://zustand-demo.pmnd.rs/)

---

*本文档会随着项目发展持续更新，请保持关注最新版本。*