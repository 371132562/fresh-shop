# 团购管理平台 - 前端设计规范

## 📋 项目概述

本项目是一个社区团购管理平台的前端应用，采用 React + TypeScript + Zustand + Ant Design + Tailwind CSS 技术栈。本文档记录了当前最新的UI/UE设计规范和组件使用指南。

## 🎨 设计系统

### 整体设计风格

- **设计理念**：现代化、简洁、悬浮卡片式设计
- **色彩方案**：蓝色主色调 + 浅灰色背景 + 白色卡片
- **布局方式**：响应式设计，移动端优先
- **视觉层次**：通过阴影、圆角、透明度营造层次感

#### 数值/统计文本配色规范（通用）
- 以下配色规则统一使用 font-bold 字体加粗
- 金额类（总销售额、消费总额、小计等）：`text-blue-400`
- 利润类：正值用 `text-red-600`，负值用 `text-green-600`，等于 0 用 `text-gray-500`，应使用utils/profitColor.tsx中的函数获取颜色
- 退款相关（退款金额、部分退款/退款订单量等）：`text-orange-600`
- 计数类（次数、订单量、购买次数、团购单量、客户量等）：`text-blue-600`

说明：上述规则适用于所有页面与组件（包括 Analysis 模块）。新增统计卡片或数值文本请遵循该配色；若引入新的数值类型，请在本节补充。

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
- **内边距**：响应式 `px-4 py-3 md:px-6 md:py-4`
- **文字颜色**：白色 `text-white`
- **圆角**：`rounded-xl`
- **阴影**：`shadow-lg`

#### 响应式布局
- **平板尺寸**：垂直堆叠，隐藏侧边栏，显示菜单按钮
- **PC尺寸**：水平布局，显示侧边栏，隐藏菜单按钮

#### 平板悬浮菜单
- **触发方式**：Header左侧菜单按钮
- **位置**：从Header下方弹出
- **样式**：白色背景，圆角，大阴影
- **交互**：点击遮罩或关闭按钮关闭

### 2. 列表页面组件规范

#### 页面结构
```
┌─────────────────────────────────────┐
│ 搜索表单区域 (Card容器)              │
│ ├─ 搜索条件 (Form + Row/Col)        │
│ └─ 工具栏 (SearchToolbar)           │
├─────────────────────────────────────┤
│ 数据列表区域                        │
│ ├─ 列表项 (List.Item)               │
│ └─ 分页器 (Pagination)              │
└─────────────────────────────────────┘
```

#### 搜索表单区域设计
- **容器**：`Card` 组件，`size="small"`，`className="mb-4 w-full"`
- **表单布局**：`Form` 组件，`layout="vertical"`，`name="searchForm"`
- **栅格系统**：`Row gutter={[16, 8]}` + `Col xs={24} md={12} lg={8}`
- **表单项**：`Form.Item` 组件，`className="!mb-1"`
- **输入组件**：支持 `allowClear`、`onPressEnter`、`onChange` 等交互

#### 搜索表单具体实现规范
- **输入框**：`Input` 组件，支持 `placeholder`、`allowClear`、`onPressEnter={handleSearch}`、`onClear={handleSearch}`
- **选择器**：`Select` 组件，支持 `showSearch`、`mode="multiple"`、`allowClear`、`onChange={handleSearch}`、`onClear={handleSearch}`
- **筛选选项**：`filterOption` 函数实现搜索过滤
- **弹窗宽度**：`popupMatchSelectWidth={300}` 统一弹窗宽度
- **加载状态**：`loading={loadingState}` 显示加载状态
- **搜索逻辑**：表单验证后更新 `pageParams`，重置时回到第一页

#### 工具栏设计
- **组件**：`SearchToolbar` 统一组件
- **功能**：搜索、重置、添加、统计信息显示
- **布局**：左侧统计+添加按钮，右侧搜索+重置按钮

#### 列表项设计
- **容器**：`List` 组件，`itemLayout="horizontal"`
- **响应式布局**：`flex-col md:flex-row` 垂直/水平切换
- **信息展示**：标题、描述、标签、状态等
- **操作按钮**：编辑、删除、查看等操作
- **悬停效果**：`hover:shadow-md` 等过渡动画

#### 列表项具体实现规范
- **主容器**：`flex w-full flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4`
- **信息区域**：`min-w-0 flex-1 overflow-hidden pr-0 md:pr-4`
- **标题区域**：`flex min-w-0 flex-row flex-wrap items-center gap-2`
- **标题文字**：`block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-lg font-medium md:overflow-visible md:whitespace-normal md:break-all`
- **标签显示**：`shrink-0` 防止压缩
- **操作区域**：`flex shrink-0 flex-col gap-2 md:flex-row md:items-center`
- **按钮样式**：`type="link"` 或 `type="primary"`，支持 `danger` 类型

#### 分页设计
- **位置**：`position: 'bottom'`，`align: 'end'`
- **功能**：页码切换、总数显示
- **状态管理**：通过 Zustand store 统一管理

### 3. 统计详情Modal组件规范

#### 组件结构
```
┌─────────────────────────────────────┐
│ Modal标题 + 说明Tooltip             │
├─────────────────────────────────────┤
│ 基本信息卡片 (Card)                 │
│ ├─ 标题区域 (图标 + 名称 + 时间)     │
│ └─ 核心指标区域 (Row/Col网格)       │
├─────────────────────────────────────┤
│ 详细分析区域 (多个Card组件)         │
│ ├─ 图表分析                         │
│ ├─ 列表数据                         │
│ └─ 交互操作                         │
└─────────────────────────────────────┘
```

#### Modal基础设计
- **尺寸**：默认 `width={1000}`，支持自定义
- **位置**：`style={{ top: 20 }}` 顶部对齐
- **关闭**：`destroyOnHidden` 销毁内容
- **标题**：包含主标题和说明 `Tooltip`

#### Modal标题具体实现规范
- **标题容器**：`flex items-center gap-2`
- **主标题**：直接文本内容
- **说明图标**：`QuestionCircleOutlined className="text-gray-400"`
- **Tooltip内容**：`maxWidth: 500, lineHeight: 1.6` 样式
- **说明内容**：使用 `<b>` 标签突出重要信息，支持多行说明

#### 基本信息卡片设计
- **容器**：`Card` 组件，`size="small"`
- **标题区域**：图标 + 名称 + 时间信息
- **背景色**：`styles={{ header: { background: '#e6f7ff' } }}`
- **核心指标**：渐变背景 + 网格布局 + 指标卡片

#### 基本信息卡片具体实现规范
- **卡片容器**：`overflow-hidden` 防止内容溢出
- **标题区域**：`flex h-12 items-center justify-between`
- **左侧内容**：`flex items-center gap-2` + 图标 + 名称
- **右侧内容**：时间信息 `text-sm text-orange-500`
- **图标样式**：`TrophyOutlined className="text-blue-500"`
- **名称样式**：`text-lg font-medium`
- **时间样式**：支持条件显示，无时间时显示"全部时间统计"

#### 核心指标卡片设计
- **容器**：渐变背景 `bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50`
- **网格**：`Row gutter={[12, 12]}` + `Col xs={24} md={12} lg={8}`
- **指标卡片**：白色背景 + 圆角 + 阴影 + 悬停效果
- **内容布局**：左侧数据 + 右侧图标
- **颜色方案**：不同指标使用不同主题色

#### 核心指标卡片具体实现规范
- **外层容器**：`mb-6 rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6`
- **标题区域**：`mb-4 text-center` + `text-lg font-semibold text-gray-800`
- **装饰线**：`mx-auto mt-1 h-1 w-16 rounded-full bg-gradient-to-r from-blue-400 to-purple-400`
- **指标卡片**：`rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md`
- **卡片布局**：`flex items-center justify-between`
- **数据区域**：左侧包含标签和数值
- **图标区域**：`flex h-12 w-12 items-center justify-center rounded-full` + 主题色背景
- **标签样式**：`text-sm font-medium text-gray-600`
- **数值样式**：`mt-1 text-xl font-bold` + 主题色文字
- **图标样式**：`text-xl` + 主题色文字

#### 详细分析区域设计
- **组件复用**：使用公共分析组件（如 `CustomerStatsAnalysis`）
- **数据展示**：图表、表格、列表等多种形式
- **交互功能**：点击展开、筛选、排序等
- **响应式**：适配不同屏幕尺寸

#### 详细分析区域具体实现规范
- **容器布局**：`!space-y-2` 统一间距
- **分析组件**：使用预定义的分析组件，如：
  - `CustomerStatsAnalysis`：客户统计信息
  - `CustomerLoyaltyAnalysis`：客户忠诚度分析
  - `RegionalSalesAnalysis`：地域销售分析
  - `GroupBuyHistoryAnalysis`：团购历史分析
  - `ProductAnalysis`：商品分析
- **组件传参**：统一传递 `title` 属性用于标题显示
- **交互处理**：通过回调函数处理点击事件（如 `onFrequencyClick`、`onRegionalClick`）
- **Tooltip支持**：支持自定义 `tooltip` 属性提供说明信息
- **数据格式**：组件内部处理数据格式转换和展示逻辑

#### 加载状态和错误处理规范
- **加载状态**：使用 `Skeleton` 组件显示加载占位符
- **加载布局**：`space-y-3 py-2` 容器 + 多个 `Skeleton` 组件
- **加载内容**：`title={{ width: 200 }}` + `paragraph={{ rows: 1/4/6/8 }}`
- **空数据状态**：`flex items-center justify-center py-8` + 提示文字
- **空数据文字**：`text-gray-500` 样式
- **条件渲染**：`loading ? <Skeleton /> : data ? <Content /> : <Empty />`

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
- **平板尺寸**：768px 及以上（不带前缀）
- **PC尺寸**：768px 及以上（md: 前缀）
- **PC尺寸**：1024px 及以上（lg: 前缀）

### 响应式策略
1. **平板优先**：基础样式针对平板设计
2. **PC增强**：PC屏幕添加更多功能和样式
3. **内容优先**：确保核心功能在所有设备上可用

### 具体应用
- **文字大小**：`text-xl md:text-2xl` 响应式字体
- **内边距**：`px-4 py-3 md:px-6 md:py-4` 响应式间距
- **布局**：`flex-col md:flex-row` 响应式布局方向
- **显示/隐藏**：`hidden md:block` 响应式显示

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

### 列表页面组件使用
```tsx
// 搜索表单区域
<Card className="mb-4 w-full" size="small">
  <Form form={form} layout="vertical" name="searchForm">
    <Row gutter={[16, 8]}>
      <Col xs={24} md={12} lg={8}>
        <Form.Item label="名称" name="name" className="!mb-1">
          <Input placeholder="请输入名称" allowClear onPressEnter={handleSearch} />
        </Form.Item>
      </Col>
    </Row>
    <SearchToolbar
      onSearch={handleSearch}
      onReset={resetSearch}
      searchLoading={loading}
      totalCount={total}
      countLabel="条记录"
      onAdd={() => setVisible(true)}
    />
  </Form>
</Card>

// 数据列表区域
<List
  className="w-full"
  itemLayout="horizontal"
  loading={listLoading}
  pagination={{
    position: 'bottom',
    align: 'end',
    total: listCount.totalCount,
    current: pageParams.page,
    onChange: pageChange
  }}
  dataSource={dataList}
  renderItem={item => (
    <List.Item>
      <div className="flex w-full flex-col gap-3 md:flex-row md:items-start md:justify-between">
        {/* 列表项内容 */}
      </div>
    </List.Item>
  )}
/>
```

### 统计详情Modal组件使用
```tsx
<Modal
  title={
    <div className="flex items-center gap-2">
      <span>详情标题</span>
      <Tooltip title="统计说明">
        <QuestionCircleOutlined className="text-gray-400" />
      </Tooltip>
    </div>
  }
  open={visible}
  onCancel={onClose}
  footer={null}
  width={1000}
  style={{ top: 20 }}
  destroyOnHidden
>
  <Card
    title={
      <div className="flex h-12 items-center justify-between">
        <div className="flex items-center gap-2">
          <TrophyOutlined className="text-blue-500" />
          <span className="text-lg font-medium">实体名称</span>
        </div>
        <span className="text-sm text-orange-500">统计时间范围</span>
      </div>
    }
    size="small"
    styles={{ header: { background: '#e6f7ff' } }}
  >
    {/* 核心指标区域 */}
    <div className="mb-6 rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <Row gutter={[12, 12]}>
        <Col xs={24} md={12} lg={8}>
          <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
            {/* 指标卡片内容 */}
          </div>
        </Col>
      </Row>
    </div>
  </Card>
  
  {/* 详细分析区域 */}
  <AnalysisComponent data={analysisData} />
</Modal>
```