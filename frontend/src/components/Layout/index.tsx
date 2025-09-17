import {
  DashboardOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  GroupOutlined,
  MenuOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons' // 导入更多图标
import {
  Button,
  Checkbox,
  Divider,
  Form,
  Image,
  Modal,
  notification,
  Switch,
  Tag,
  Tooltip,
  Typography
} from 'antd'
import { FC, useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { NavLink, useOutlet } from 'react-router'

import ErrorPage from '@/components/Error'
import OrderStatsButton from '@/components/OrderStatsButton'
import type { OrphanImageItem } from '@/services/common.ts'
import useGlobalSettingStore from '@/stores/globalSettingStore.ts'
import { buildImageUrl } from '@/utils'

export const Component: FC = () => {
  const outlet = useOutlet()
  const [settingOpen, setSettingOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
      {/* 整体页面容器：浅灰色背景，全屏高度，防止滚动条影响布局 */}
      <div
        className="min-h-screen bg-gray-100"
        style={{ scrollbarGutter: 'stable' }}
      >
        {/* 主容器：最大宽度限制，居中布局，响应式内边距 */}
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:px-8">
          {/* Header 容器：悬浮设计，蓝色背景，白色文字，阴影效果 */}
          <header className="mb-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 shadow-lg md:px-6 md:py-4">
            <div className="flex items-center justify-between">
              {/* 左侧：菜单按钮和标题 */}
              <div className="flex min-w-0 flex-1 items-center space-x-3">
                <p className="text-xl font-bold text-white md:text-2xl">团购管理平台</p>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="flex cursor-pointer items-center space-x-1 rounded-lg bg-white/20 p-3 text-white transition-colors hover:bg-white/30 lg:hidden"
                >
                  <MenuOutlined className="!mr-0 text-lg" />
                  <span className="hidden px-1 sm:inline">菜单</span>
                </button>
              </div>

              {/* 右侧：功能按钮组 */}
              <div className="flex flex-shrink-0 items-center gap-2 md:gap-4">
                <OrderStatsButton />
                <button
                  onClick={() => setSettingOpen(true)}
                  className="flex cursor-pointer items-center space-x-1 rounded-lg bg-white/20 p-3 text-white transition-colors hover:bg-white/30"
                >
                  <SettingOutlined className="!mr-0 text-lg" />
                  <span className="hidden px-1 lg:inline">系统功能</span>
                </button>
              </div>
            </div>
          </header>

          {/* 主体内容区域：flex布局，响应式排列 */}
          <div className="flex flex-col gap-4 lg:flex-row">
            {/* Sider 侧边栏：悬浮设计，白色背景，阴影效果，固定定位，防止滚动条影响布局 */}
            <aside
              className="lg:w-70 hidden w-full rounded-xl bg-white p-6 shadow-lg lg:sticky lg:top-4 lg:block lg:h-fit"
              style={{ scrollbarGutter: 'stable' }}
            >
              <h2 className="mb-4 text-lg font-semibold text-black/80">功能菜单</h2>
              <nav className="space-y-2">
                {navItems.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 rounded-lg px-4 py-3 text-base font-medium no-underline transition-colors ${
                        isActive
                          ? '!bg-blue-500/90 !text-white'
                          : '!text-black/70 hover:!bg-blue-500/15 hover:!text-black/80'
                      }`
                    }
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </aside>

            {/* Content 主内容区：悬浮设计，白色背景，阴影效果，可滚动，防止滚动条影响布局 */}
            <main
              className="flex-1 rounded-xl bg-white p-6 shadow-lg"
              style={{ scrollbarGutter: 'stable' }}
            >
              <div className="h-full">
                <ErrorBoundary FallbackComponent={ErrorPage}>{outlet}</ErrorBoundary>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* 平板悬浮下拉菜单 */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* 背景遮罩 */}
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* 下拉菜单 */}
          <div className="absolute left-4 right-4 top-20 rounded-xl bg-white p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">功能菜单</h3>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
              >
                <span className="text-xl">×</span>
              </button>
            </div>

            <nav className="space-y-2">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 rounded-lg px-4 py-3 text-base font-medium no-underline transition-colors ${
                      isActive
                        ? '!bg-blue-500/90 text-white'
                        : '!text-black/70 hover:!bg-blue-500/15 hover:!text-black/80'
                    }`
                  }
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      <Modal
        open={settingOpen}
        title={
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-gray-800">系统功能</span>
          </div>
        }
        onCancel={() => setSettingOpen(false)}
        width={800}
        footer={null}
        styles={{ body: { paddingTop: 8, paddingBottom: 16 } }}
      >
        <div className="flex flex-col gap-4">
          {/* <section className="rounded-lg border border-gray-100 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <Typography.Text className="text-base font-semibold text-gray-800">
                  基础设置
                </Typography.Text>
                <div className="text-xs text-gray-500">影响全局展示与隐私保护的通用选项</div>
              </div>
              <Tooltip title="开启后隐藏价格、手机号等敏感字段">
                <Switch
                  loading={getGlobalSettingLoading || upsertGlobalSettingLoading}
                  checked={globalSetting?.value?.sensitive}
                  checkedChildren="隐藏中"
                  unCheckedChildren="已显示"
                  onChange={onSensitiveChange}
                />
              </Tooltip>
            </div>
            <Divider className="my-3" />
            <Form
              name="global_settings"
              layout="vertical"
              autoComplete="off"
            >
              <Form.Item
                label={<span className="font-medium text-gray-700">敏感数据展示</span>}
                className="mb-0"
              >
                <div className="text-sm text-gray-600">
                  受控于右上角的开关，适用于演示或公共环境；不会影响导出数据。
                </div>
              </Form.Item>
            </Form>
          </section> */}

          <section className="rounded-lg border border-gray-100 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <Typography.Text className="text-base font-semibold text-gray-800">
                  媒体资源清理
                </Typography.Text>
                <div className="text-gray-500">扫描未被引用的图片资源并进行批量处理</div>
              </div>
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
            </div>

            {orphanImages.length === 0 ? (
              <div className="flex items-center justify-between rounded-md bg-green-50 px-3 py-2">
                <div className="flex items-center gap-2 text-green-700">
                  <span className="text-base">✓</span>
                  <span className="text-sm">未发现孤立图片，系统运行良好</span>
                </div>
                <span className="text-xs text-green-600">建议每周例行扫描一次</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-medium text-blue-600">
                    共 {orphanImages.length} 张候选图片
                  </span>
                  {(() => {
                    const safeDelete = orphanImages.filter(item => item.inDisk && item.inDB).length
                    const diskOnly = orphanImages.filter(item => item.inDisk && !item.inDB).length
                    const dbOnly = orphanImages.filter(item => !item.inDisk && item.inDB).length
                    const inconsistent = orphanImages.filter(
                      item => !item.inDisk && !item.inDB
                    ).length
                    return (
                      <div className="flex flex-wrap items-center gap-2">
                        {safeDelete > 0 && <Tag color="green">{safeDelete} 可安全删除</Tag>}
                        {diskOnly > 0 && <Tag color="orange">{diskOnly} 仅磁盘存在</Tag>}
                        {dbOnly > 0 && <Tag color="red">{dbOnly} 数据库异常</Tag>}
                        {inconsistent > 0 && <Tag color="default">{inconsistent} 数据不一致</Tag>}
                      </div>
                    )
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {orphanImages.map(item => (
                    <div
                      key={item.filename}
                      className="group relative flex w-full flex-col items-center justify-start overflow-hidden rounded-md border border-gray-200 p-2 transition-shadow hover:shadow-md"
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
                            width={160}
                            height={160}
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
            )}
          </section>
        </div>
      </Modal>
    </>
  )
}
