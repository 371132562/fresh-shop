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
import { Button, Checkbox, Drawer, Form, Image, notification, Switch, Tag } from 'antd'
import { FC, useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useOutlet } from 'react-router'
import { NavLink } from 'react-router'

import ErrorPage from '@/components/Error'
import OrderStatsButton from '@/components/OrderStatsButton'
import type { OrphanImageItem } from '@/services/common.ts'
import useGlobalSettingStore from '@/stores/globalSettingStore.ts'
import { buildImageUrl } from '@/utils'

import style from './index.module.less'

export const Component: FC = () => {
  const outlet = useOutlet()
  const [open, setOpen] = useState(false)
  const [settingOpen, setSettingOpen] = useState(false)
  // 孤立图片 - 本地选中集合
  const [selectedFilenames, setSelectedFilenames] = useState<string[]>([])

  const globalSetting = useGlobalSettingStore(state => state.globalSetting)
  const getGlobalSettingLoading = useGlobalSettingStore(state => state.getGlobalSettingLoading)
  const getGlobalSetting = useGlobalSettingStore(state => state.getGlobalSetting)
  const upsertGlobalSettingLoading = useGlobalSettingStore(
    state => state.upsertGlobalSettingLoading
  )
  const upsertGlobalSetting = useGlobalSettingStore(state => state.upsertGlobalSetting)
  // 孤立图片
  const orphanImages = useGlobalSettingStore(state => state.orphanImages)
  const orphanScanLoading = useGlobalSettingStore(state => state.orphanScanLoading)
  const orphanDeleteLoading = useGlobalSettingStore(state => state.orphanDeleteLoading)
  const scanOrphans = useGlobalSettingStore(state => state.scanOrphans)
  const deleteOrphans = useGlobalSettingStore(state => state.deleteOrphans)

  useEffect(() => {
    getGlobalSetting({ key: 'setting' })
  }, [])
  // 定义导航菜单项
  const navItems = [
    { to: '/supplier', label: '供货商管理', icon: <UserOutlined /> },
    { to: '/productType', label: '商品类型管理', icon: <TagsOutlined /> },
    { to: '/product', label: '商品管理', icon: <ShoppingOutlined /> },
    { to: '/address', label: '客户地址管理', icon: <EnvironmentOutlined /> },
    { to: '/customer', label: '客户管理', icon: <TeamOutlined /> },
    { to: '/groupBuy', label: '团购管理', icon: <GroupOutlined /> },
    { to: '/order', label: '订单管理', icon: <FileTextOutlined /> },
    { to: '/analysis', label: '统计看板', icon: <DashboardOutlined /> }
  ]

  const onSensitiveChange = (checked: boolean) => {
    upsertGlobalSetting({
      key: 'setting',
      value: globalSetting?.value
        ? { ...globalSetting.value, sensitive: checked }
        : { sensitive: checked }
    })
  }

  const allSelected = orphanImages.length > 0 && selectedFilenames.length === orphanImages.length

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFilenames(orphanImages.map(i => i.filename))
    } else {
      setSelectedFilenames([])
    }
  }

  const toggleSelectOne = (filename: string, checked: boolean) => {
    setSelectedFilenames(prev => {
      if (checked) return Array.from(new Set([...prev, filename]))
      return prev.filter(f => f !== filename)
    })
  }

  const handleScan = async () => {
    const ok = await scanOrphans()
    if (ok) {
      setSelectedFilenames([])
      // 使用 setTimeout 确保状态更新后再检查
      setTimeout(() => {
        const currentOrphanImages = useGlobalSettingStore.getState().orphanImages
        // 根据扫描结果给出友好的交互提示
        if (currentOrphanImages.length === 0) {
          notification.success({
            message: '扫描完成',
            description: '未发现孤立图片，系统运行良好！'
          })
        } else {
          // 统计不同类型的孤立图片
          const diskOnly = currentOrphanImages.filter(
            (item: OrphanImageItem) => item.inDisk && !item.inDB
          ).length
          const dbOnly = currentOrphanImages.filter(
            (item: OrphanImageItem) => !item.inDisk && item.inDB
          ).length
          const neither = currentOrphanImages.filter(
            (item: OrphanImageItem) => !item.inDisk && !item.inDB
          ).length
          const bothButOrphan = currentOrphanImages.filter(
            (item: OrphanImageItem) => item.inDisk && item.inDB
          ).length

          const description = (
            <div className="space-y-2">
              <div className="font-medium text-blue-600">
                发现 {currentOrphanImages.length} 张孤立图片（未被供货商或团购单引用）
              </div>
              <div className="space-y-1 text-sm">
                {bothButOrphan > 0 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    <span>{bothButOrphan} 张在磁盘和数据库中但未被引用（可安全删除）</span>
                  </div>
                )}
                {diskOnly > 0 && (
                  <div className="flex items-center gap-2 text-orange-600">
                    <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                    <span>{diskOnly} 张仅存在于磁盘（可安全删除）</span>
                  </div>
                )}
                {dbOnly > 0 && (
                  <div className="flex items-center gap-2 text-red-600">
                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                    <span>{dbOnly} 张仅存在于数据库（记录异常）</span>
                  </div>
                )}
                {neither > 0 && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="h-2 w-2 rounded-full bg-gray-500"></span>
                    <span>{neither} 张既不在磁盘也不在数据库（数据不一致）</span>
                  </div>
                )}
              </div>
            </div>
          )

          notification.info({
            message: '扫描完成',
            description
          })
        }
      }, 0)
    } else {
      notification.error({
        message: '扫描失败',
        description: '无法检索孤立图片，请稍后重试'
      })
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedFilenames.length === 0) return
    const res = await deleteOrphans(selectedFilenames)
    if (res) {
      const { deleted, skipped } = res
      if (deleted.length) {
        notification.success({
          message: '删除成功',
          description: `成功删除 ${deleted.length} 张孤立图片，释放了存储空间`
        })
      }
      if (skipped.length) {
        notification.warning({
          message: '部分跳过',
          description: `有 ${skipped.length} 张图片因被引用或文件锁定而无法删除，已自动跳过。这些图片可能正在被其他功能使用。`
        })
      }
      // 如果没有删除任何文件，给出提示
      if (deleted.length === 0 && skipped.length === 0) {
        notification.info({
          message: '删除完成',
          description: '没有文件被删除，可能是文件已被其他进程占用或权限不足'
        })
      }
      setSelectedFilenames([])
    } else {
      notification.error({
        message: '删除失败',
        description: '删除操作失败，请检查网络连接或稍后重试'
      })
    }
  }

  return (
    <>
      {/*外层容器：居中，全高宽，最大宽度，浅灰色背景*/}
      <div
        className={`mx-auto flex h-dvh w-dvw max-w-3xl flex-col font-sans antialiased ${style.layout}`}
      >
        {/* 头部：固定顶部，深色背景，居中，有阴影，顶部圆角 */}
        <header className="sticky top-0 z-10 rounded-b-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-1 shadow-md">
          <div className="relative flex h-16 items-center">
            {/* 左侧按钮组：菜单和订单统计 */}
            <div className="flex items-center space-x-2">
              <div
                className="cursor-pointer rounded-full p-2 text-white transition duration-200 hover:bg-blue-600/50 active:bg-blue-600/50"
                onClick={() => {
                  setOpen(true)
                }}
              >
                <UnorderedListOutlined className="text-2xl" />
              </div>
              <OrderStatsButton className="cursor-pointer rounded-full p-2 text-white transition duration-200 active:bg-blue-600/50" />
            </div>
            {/* 标题：绝对定位居中，白色字体，更粗的字体 */}
            <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold tracking-wide text-white">
              团购管理平台
            </p>
            {/* 右侧设置按钮 */}
            <div
              className="absolute right-0 cursor-pointer rounded-full p-2 text-white transition duration-200 active:bg-blue-600/50"
              onClick={() => {
                setSettingOpen(true)
              }}
            >
              <SettingOutlined className="text-2xl" />
            </div>
          </div>
        </header>

        {/* 主内容区域：带内边距，圆角，白色背景，大阴影，有滚动条 */}
        <div className="mx-4 my-4 flex-grow overflow-y-auto rounded-xl bg-[rgba(255,255,255,0.85)] p-4 shadow-lg">
          {/* 内容容器：居中，flex布局，允许内容滚动 */}
          <div className="flex w-full flex-col items-center">
            <ErrorBoundary FallbackComponent={ErrorPage}>{outlet}</ErrorBoundary>
          </div>
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
        width={600}
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
          <Form
            name="global_settings" // 为表单添加名称
            layout="horizontal" // 水平布局更适合设置项
            labelCol={{ span: 6 }} // 调整标签和控件的比例
            wrapperCol={{ span: 16 }}
            autoComplete="off"
          >
            <Form.Item
              label={<span className="font-medium text-gray-700">隐藏敏感数据</span>}
              className="border-b border-gray-200 py-2 last:border-b-0"
              valuePropName="checked"
            >
              <Switch
                loading={getGlobalSettingLoading || upsertGlobalSettingLoading}
                checked={globalSetting?.value?.sensitive}
                checkedChildren="是"
                unCheckedChildren="否"
                onChange={onSensitiveChange}
              />
            </Form.Item>

            {/* 孤立图片清理 */}
            <Form.Item
              label={<span className="font-medium text-gray-700">孤立图片清理</span>}
              className="border-b border-gray-200 py-2 last:border-b-0"
            >
              <div className="flex w-full flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="primary"
                    onClick={handleScan}
                    loading={orphanScanLoading}
                  >
                    检索孤立图片
                  </Button>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={selectedFilenames.length > 0 && !allSelected}
                    onChange={e => toggleSelectAll(e.target.checked)}
                    disabled={orphanImages.length === 0}
                  >
                    全选
                  </Checkbox>
                  <Button
                    danger
                    disabled={selectedFilenames.length === 0}
                    onClick={handleDeleteSelected}
                    loading={orphanDeleteLoading}
                  >
                    删除所选
                  </Button>
                </div>
                <div className="text-sm text-gray-600">
                  {orphanImages.length === 0 ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <span className="text-lg">✓</span>
                      <span>未发现孤立图片，系统运行良好</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-blue-600">
                        <span className="font-medium">共 {orphanImages.length} 张候选图片</span>
                      </div>
                      <div className="space-y-1">
                        {(() => {
                          const safeDelete = orphanImages.filter(
                            item => item.inDisk && item.inDB
                          ).length
                          const diskOnly = orphanImages.filter(
                            item => item.inDisk && !item.inDB
                          ).length
                          const dbOnly = orphanImages.filter(
                            item => !item.inDisk && item.inDB
                          ).length
                          const inconsistent = orphanImages.filter(
                            item => !item.inDisk && !item.inDB
                          ).length

                          return (
                            <>
                              {safeDelete > 0 && (
                                <div className="flex items-center gap-2 text-green-600">
                                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                  <span>{safeDelete} 张可安全删除（未被引用）</span>
                                </div>
                              )}
                              {diskOnly > 0 && (
                                <div className="flex items-center gap-2 text-orange-600">
                                  <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                                  <span>{diskOnly} 张仅磁盘存在</span>
                                </div>
                              )}
                              {dbOnly > 0 && (
                                <div className="flex items-center gap-2 text-red-600">
                                  <span className="h-2 w-2 rounded-full bg-red-500"></span>
                                  <span>{dbOnly} 张数据库记录异常</span>
                                </div>
                              )}
                              {inconsistent > 0 && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <span className="h-2 w-2 rounded-full bg-gray-500"></span>
                                  <span>{inconsistent} 张数据不一致</span>
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {orphanImages.map(item => (
                    <div
                      key={item.filename}
                      className="flex w-full flex-col items-center justify-start overflow-hidden rounded-md border border-gray-200 p-2 shadow-sm"
                    >
                      <Checkbox
                        className="w-full"
                        checked={selectedFilenames.includes(item.filename)}
                        onChange={e => toggleSelectOne(item.filename, e.target.checked)}
                      >
                        <span
                          className="block w-full truncate text-xs"
                          title={item.filename}
                        >
                          {item.filename}
                        </span>
                      </Checkbox>
                      <div className="mt-1 flex w-full flex-wrap items-center gap-1">
                        <Tag color={item.inDisk ? 'green' : 'red'}>
                          {item.inDisk ? '磁盘存在' : '磁盘缺失'}
                        </Tag>
                        <Tag color={item.inDB ? 'blue' : 'orange'}>
                          {item.inDB ? '数据库存在' : '数据库缺失'}
                        </Tag>
                      </div>
                      {item.inDisk ? (
                        <div className="mt-1 w-full">
                          <Image
                            src={buildImageUrl(item.filename)}
                            width={120}
                            height={120}
                            style={{ objectFit: 'cover' }}
                            preview={{}}
                          />
                        </div>
                      ) : (
                        <div className="mt-2 flex h-[120px] w-full items-center justify-center rounded bg-gray-100 text-xs text-gray-400">
                          无预览
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Form.Item>
          </Form>
        </div>
      </Drawer>
    </>
  )
}
