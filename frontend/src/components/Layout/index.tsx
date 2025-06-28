import { UnorderedListOutlined } from '@ant-design/icons'
import { FC } from 'react'
import { useOutlet } from 'react-router'

export const Component: FC = () => {
  const outlet = useOutlet()

  return (
    // 外层容器：居中，全高宽，最大宽度，浅灰色背景
    <div className="mx-auto flex h-dvh w-dvw max-w-3xl flex-col bg-gray-50 font-sans antialiased">
      {/* 头部：固定顶部，深色背景，居中，有阴影，顶部圆角 */}
      <header className="sticky top-0 z-10 rounded-b-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-1 shadow-md">
        <div className="flex items-center justify-between">
          {/* 菜单图标：点击区域更大，视觉反馈更强 */}
          <nav className="cursor-pointer rounded-full p-2 text-white transition duration-200 active:bg-blue-600/50">
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
  )
}
