import { UnorderedListOutlined } from '@ant-design/icons'
import { FC } from 'react'
import { useOutlet } from 'react-router'

export const Component: FC = () => {
  const outlet = useOutlet()

  return (
    <div className="ml-auto mr-auto h-dvh w-dvw max-w-3xl bg-gray-100">
      <header className="h-13 z-1000 sticky top-0 flex flex-row bg-white">
        <nav className="m-2 ml-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition duration-200 active:bg-gray-200">
          <UnorderedListOutlined className="text-2xl" />
        </nav>
      </header>
      <div className="flex w-full flex-col items-center px-3 py-2">{outlet}</div>
    </div>
  )
}
