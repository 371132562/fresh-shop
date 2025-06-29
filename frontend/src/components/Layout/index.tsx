import {
  DashboardOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  GroupOutlined,
  ShoppingOutlined,
  TagsOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserOutlined
} from '@ant-design/icons' // 导入更多图标
import { Drawer } from 'antd'
import { FC, useState } from 'react'
import { useOutlet } from 'react-router'
import { NavLink } from 'react-router'

export const Component: FC = () => {
  const outlet = useOutlet()
  const [open, setOpen] = useState(false)

  const showDrawer = () => {
    setOpen(true)
  }

  const onClose = () => {
    setOpen(false)
  }

  // 定义导航菜单项
  const navItems = [
    { to: '/supplier', label: '供货商管理', icon: <UserOutlined /> },
    { to: '/product', label: '商品管理', icon: <ShoppingOutlined /> },
    { to: '/productType', label: '商品类型管理', icon: <TagsOutlined /> },
    { to: '/customer', label: '客户管理', icon: <TeamOutlined /> },
    { to: '/address', label: '地址管理', icon: <EnvironmentOutlined /> },
    { to: '/group-buy', label: '团购管理', icon: <GroupOutlined /> },
    { to: '/order', label: '订单管理', icon: <FileTextOutlined /> },
    { to: '/dashboard', label: '看板', icon: <DashboardOutlined /> }
  ]

  return (
    <>
      {/*外层容器：居中，全高宽，最大宽度，浅灰色背景*/}
      <div className="mx-auto flex h-dvh w-dvw max-w-3xl flex-col bg-gray-50 font-sans antialiased">
        {/* 头部：固定顶部，深色背景，居中，有阴影，顶部圆角 */}
        <header className="sticky top-0 z-10 rounded-b-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-1 shadow-md">
          <div className="flex items-center justify-between">
            {/* 菜单图标：点击区域更大，视觉反馈更强 */}
            <nav
              className="cursor-pointer rounded-full p-2 text-white transition duration-200 active:bg-blue-600/50"
              onClick={showDrawer}
            >
              <UnorderedListOutlined className="text-2xl" />
            </nav>
            {/* 标题：居中，白色字体，更粗的字体 */}
            <p className="flex h-16 items-center justify-center text-2xl font-bold tracking-wide text-white">
              团购管理平台
            </p>
            {/* 占位符，保持flex布局两端对齐 */}
            <div className="w-8"></div>
          </div>
        </header>

        {/* 主内容区域：带内边距，圆角，白色背景，大阴影，有滚动条 */}
        <div className="mx-4 my-4 flex-grow overflow-y-auto rounded-xl bg-white p-4 shadow-lg">
          {/* 内容容器：居中，flex布局，允许内容滚动 */}
          <div className="flex w-full flex-col items-center">{outlet}</div>
        </div>
      </div>

      <Drawer
        // Drawer 标题部分，增加了一点底部边距和背景色，并调整了字体样式
        title={<span className="text-lg font-bold text-gray-700">功能菜单</span>}
        placement="left"
        onClose={onClose}
        open={open}
        width={260} // 抽屉宽度略微增加，适应更美观的内边距
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
              onClick={onClose}
              // 重新设计 NavLink 样式，增强视觉效果和交互
              className={({ isActive }) =>
                `group mx-3 my-1 flex cursor-pointer items-center rounded-lg px-4 py-3 font-medium transition-all duration-200 ease-in-out ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 !text-white shadow-md shadow-blue-300' // 激活状态：更深的背景色，蓝色字体，阴影和圆角
                    : '!text-gray-700' // 非激活状态：柔和的悬停效果
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
    </>
  )
}
