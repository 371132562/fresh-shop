import {
  DashboardOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  GroupOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TagsOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserOutlined
} from '@ant-design/icons' // 导入更多图标
import { Drawer, Form, Switch } from 'antd'
import { FC, useState } from 'react'
import { useOutlet } from 'react-router'
import { NavLink } from 'react-router'

export const Component: FC = () => {
  const outlet = useOutlet()
  const [open, setOpen] = useState(false)
  const [settingOpen, setSettingOpen] = useState(false)

  // 定义导航菜单项
  const navItems = [
    { to: '/supplier', label: '供货商管理', icon: <UserOutlined /> },
    { to: '/productType', label: '商品类型管理', icon: <TagsOutlined /> },
    { to: '/product', label: '商品管理', icon: <ShoppingOutlined /> },
    { to: '/address', label: '客户地址管理', icon: <EnvironmentOutlined /> },
    { to: '/customer', label: '客户管理', icon: <TeamOutlined /> },
    { to: '/groupBuy', label: '团购管理', icon: <GroupOutlined /> },
    { to: '/order', label: '订单管理', icon: <FileTextOutlined /> },
    { to: '/dashboard', label: '统计看板', icon: <DashboardOutlined /> }
  ]

  return (
    <>
      {/*外层容器：居中，全高宽，最大宽度，浅灰色背景*/}
      <div className="mx-auto flex h-dvh w-dvw max-w-3xl flex-col bg-gray-50 font-sans antialiased">
        {/* 头部：固定顶部，深色背景，居中，有阴影，顶部圆角 */}
        <header className="sticky top-0 z-10 rounded-b-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-1 shadow-md">
          <div className="flex items-center justify-between">
            {/* 菜单图标：点击区域更大，视觉反馈更强 */}
            <div
              className="cursor-pointer rounded-full p-2 text-white transition duration-200 active:bg-blue-600/50"
              onClick={() => {
                setOpen(true)
              }}
            >
              <UnorderedListOutlined className="text-2xl" />
            </div>
            {/* 标题：居中，白色字体，更粗的字体 */}
            <p className="flex h-16 items-center justify-center text-2xl font-bold tracking-wide text-white">
              团购管理平台
            </p>
            {/* 占位符，保持flex布局两端对齐 */}
            <div
              className="cursor-pointer rounded-full p-2 text-white transition duration-200 active:bg-blue-600/50"
              onClick={() => {
                setSettingOpen(true)
              }}
            >
              <SettingOutlined className="text-2xl" />
            </div>
          </div>
        </header>

        {/* 主内容区域：带内边距，圆角，白色背景，大阴影，有滚动条 */}
        <div className="mx-4 my-4 flex-grow overflow-y-auto rounded-xl bg-white p-4 shadow-lg">
          {/* 内容容器：居中，flex布局，允许内容滚动 */}
          <div className="flex w-full flex-col items-center">{outlet}</div>
        </div>
      </div>

      <Drawer
        title={<span className="text-lg font-bold text-gray-700">功能菜单</span>}
        placement="left"
        onClose={() => {
          setOpen(false)
        }}
        open={open}
        width={280} // 抽屉宽度略微增加，适应更美观的内边距
        styles={{
          body: { padding: 0 }, // 保持 body padding 为 0
          header: {
            borderBottom: '1px solid #e0e0e0', // 更浅的边框颜色
            padding: '16px 20px', // 头部内边距
            backgroundColor: '#f8f8f8' // 头部背景色略微区分
          }
        }}
      >
        <div className="flex flex-col py-2">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                setOpen(false)
              }}
              className={({ isActive }) =>
                `group relative mx-3 flex cursor-pointer items-center rounded-lg px-4 py-3 text-base font-medium transition-all duration-300 ease-in-out ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 !text-white shadow-md shadow-blue-300' // 激活状态：渐变背景更强烈，白色字体，阴影更明显
                    : '!text-gray-700 hover:bg-gray-100 active:bg-gray-200' // 非激活状态：柔和的悬停和点击效果
                }`
              }
            >
              {item.icon && <span className={`mr-4 text-xl`}>{item.icon}</span>}
              {/* 文本样式：统一字体大小，根据状态变色 */}
              <span className={`flex-grow`}>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </Drawer>
      <Drawer
        title={<span className="text-lg font-bold text-gray-700">全局设置</span>}
        placement="right"
        onClose={() => {
          setSettingOpen(false)
        }}
        open={settingOpen}
        width={280}
        styles={{
          body: { padding: 0 }, // 保持 body padding 为 0
          header: {
            borderBottom: '1px solid #e0e0e0', // 更浅的边框颜色
            padding: '16px 20px', // 头部内边距
            backgroundColor: '#f8f8f8' // 头部背景色略微区分
          }
        }}
      >
        <div className="flex flex-col p-4">
          {/* 移除 p-2，由 body padding 控制 */}
          <Form
            name="global_settings" // 为表单添加名称
            layout="horizontal" // 水平布局更适合设置项
            labelCol={{ span: 16 }} // 调整标签和控件的比例
            wrapperCol={{ span: 8 }}
            autoComplete="off"
          >
            <Form.Item
              label={<span className="font-medium text-gray-700">隐藏敏感数据</span>}
              className="border-b border-gray-200 py-2 last:border-b-0"
              valuePropName="checked"
            >
              <Switch
                checkedChildren="是"
                unCheckedChildren="否"
              />
            </Form.Item>
          </Form>
        </div>
      </Drawer>
    </>
  )
}
