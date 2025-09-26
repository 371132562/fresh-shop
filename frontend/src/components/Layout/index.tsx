import {
  DashboardOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  GroupOutlined,
  InfoCircleOutlined,
  MenuOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons' // 导入更多图标
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Image,
  message,
  Modal,
  Switch,
  Tag,
  Typography
} from 'antd'
import { FC, useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useOutlet } from 'react-router'
import { NavLink } from 'react-router'

import ErrorPage from '@/components/Error'
import OrderStatsButton from '@/components/OrderStatsButton'
import StatisticsGuideModal from '@/components/StatisticsGuideModal'
import type { OrphanImageItem } from '@/services/common.ts'
import useGlobalSettingStore from '@/stores/globalSettingStore.ts'
import { buildImageUrl } from '@/utils'

const { Title, Text } = Typography

export const Component: FC = () => {
  const outlet = useOutlet()
  const [settingOpen, setSettingOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [statisticsGuideOpen, setStatisticsGuideOpen] = useState(false)
  // 孤立图片 - 本地选中集合
  const [selectedFilenames, setSelectedFilenames] = useState<string[]>([])
  // 是否已执行过扫描
  const [hasScanned, setHasScanned] = useState(false)

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
      setHasScanned(true) // 标记已执行过扫描
      // 使用 setTimeout 确保状态更新后再检查
      setTimeout(() => {
        const currentOrphanImages = useGlobalSettingStore.getState().orphanImages
        // 根据扫描结果给出友好的交互提示
        if (currentOrphanImages.length === 0) {
          message.success('未发现孤立图片，系统运行良好！')
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

          message.info(description)
        }
      }, 0)
    } else {
      message.error('无法检索孤立图片，请稍后重试')
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedFilenames.length === 0) return
    const res = await deleteOrphans(selectedFilenames)
    if (res) {
      const { deleted, skipped } = res
      if (deleted.length) {
        message.success(`成功删除 ${deleted.length} 张孤立图片，释放了存储空间`)
      }
      if (skipped.length) {
        message.warning(
          `有 ${skipped.length} 张图片因被引用或文件锁定而无法删除，已自动跳过。这些图片可能正在被其他功能使用。`
        )
      }
      // 如果没有删除任何文件，给出提示
      if (deleted.length === 0 && skipped.length === 0) {
        message.info('没有文件被删除，可能是文件已被其他进程占用或权限不足')
      }
      setSelectedFilenames([])
    } else {
      message.error('删除操作失败，请检查网络连接或稍后重试')
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
              <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
                <p className="text-base font-bold text-white md:text-2xl">团购管理平台</p>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="flex h-12 cursor-pointer items-center space-x-1 rounded-lg bg-white/20 p-3 text-white transition-colors hover:bg-white/30 lg:hidden"
                >
                  <MenuOutlined className="!mr-0 text-lg" />
                  <span className="hidden px-1 sm:inline">菜单</span>
                </button>
                <button
                  onClick={() => setStatisticsGuideOpen(true)}
                  className="flex h-12 cursor-pointer items-center space-x-1 rounded-lg bg-white/20 p-3 text-white transition-colors hover:bg-white/30"
                  title="统计字段说明"
                >
                  <InfoCircleOutlined className="!mr-0 text-lg" />
                  <span className="hidden px-1 lg:inline">统计数字说明</span>
                </button>
              </div>

              {/* 右侧：功能按钮组 */}
              <div className="ml-2 flex flex-shrink-0 items-center gap-2 md:ml-3 md:gap-3">
                <OrderStatsButton />
                <button
                  onClick={() => setSettingOpen(true)}
                  className="flex h-12 cursor-pointer items-center space-x-1 rounded-lg bg-white/20 p-3 text-white transition-colors hover:bg-white/30"
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
              className="flex-1 rounded-xl bg-white p-4 shadow-lg md:p-6"
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

      {/* 系统功能 Modal */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <SettingOutlined className="text-lg text-blue-600" />
            </div>
            <div>
              <Title
                level={4}
                className="!mb-0 !text-gray-900"
              >
                系统功能
              </Title>
              <Text className="text-sm text-gray-500">管理平台设置和系统维护</Text>
            </div>
          </div>
        }
        open={settingOpen}
        onCancel={() => setSettingOpen(false)}
        width={900}
        footer={null}
        className="system-settings-modal"
        styles={{
          body: { padding: '24px' },
          header: {
            borderBottom: '1px solid #f0f0f0',
            padding: '20px 24px',
            backgroundColor: '#fafafa'
          }
        }}
      >
        <div className="!space-y-6">
          {/* 基础设置卡片 */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span className="font-semibold text-gray-800">基础设置</span>
              </div>
            }
            className="shadow-sm"
            styles={{ body: { padding: '20px' } }}
          >
            <Form
              name="global_settings"
              layout="vertical"
              autoComplete="off"
            >
              <Form.Item className="!mb-0">
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">隐藏敏感数据</div>
                    <div className="text-sm text-gray-500">
                      在各个功能中隐藏利润及利润率等敏感信息
                    </div>
                  </div>
                  <Switch
                    loading={getGlobalSettingLoading || upsertGlobalSettingLoading}
                    checked={globalSetting?.value?.sensitive}
                    checkedChildren="开启"
                    unCheckedChildren="关闭"
                    onChange={onSensitiveChange}
                    size="default"
                  />
                </div>
              </Form.Item>
            </Form>
          </Card>

          {/* 系统维护卡片 */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                <span className="font-semibold text-gray-800">系统维护</span>
              </div>
            }
            className="shadow-sm"
            styles={{ body: { padding: '20px' } }}
          >
            <div className="space-y-4">
              {/* 操作按钮区域 */}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="primary"
                  size="large"
                  icon={<FileTextOutlined />}
                  onClick={handleScan}
                  loading={orphanScanLoading}
                  className="h-10 px-6"
                >
                  扫描孤立图片
                </Button>
                <Button
                  size="large"
                  icon={<Checkbox />}
                  onClick={() => toggleSelectAll(!allSelected)}
                  disabled={orphanImages.length === 0}
                  className="h-10 px-6"
                >
                  {allSelected ? '取消全选' : '全选图片'}
                </Button>
                <Button
                  danger
                  size="large"
                  icon={<FileTextOutlined />}
                  disabled={selectedFilenames.length === 0}
                  onClick={handleDeleteSelected}
                  loading={orphanDeleteLoading}
                  className="h-10 px-6"
                >
                  删除所选 ({selectedFilenames.length})
                </Button>
              </div>

              {/* 状态信息区域 */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                {!hasScanned && !orphanScanLoading ? (
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                      <span className="text-lg">ℹ</span>
                    </div>
                    <div>
                      <div className="font-medium">点击扫描按钮开始检查</div>
                      <div className="text-sm">扫描系统中未被引用的孤立图片</div>
                    </div>
                  </div>
                ) : orphanScanLoading ? (
                  <div className="flex items-center gap-3 text-blue-600">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                      <span className="text-lg">⟳</span>
                    </div>
                    <div>
                      <div className="font-medium">正在扫描中...</div>
                      <div className="text-sm">请稍候，正在检查系统图片文件</div>
                    </div>
                  </div>
                ) : hasScanned && orphanImages.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-blue-600">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                        <span className="text-lg">!</span>
                      </div>
                      <div>
                        <div className="font-medium">发现 {orphanImages.length} 张孤立图片</div>
                        <div className="text-sm">这些图片未被任何供货商或团购单引用</div>
                      </div>
                    </div>
                    {/* 统计信息 */}
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {(() => {
                        const safeDelete = orphanImages.filter(
                          item => item.inDisk && item.inDB
                        ).length
                        const diskOnly = orphanImages.filter(
                          item => item.inDisk && !item.inDB
                        ).length
                        const dbOnly = orphanImages.filter(item => !item.inDisk && item.inDB).length
                        const inconsistent = orphanImages.filter(
                          item => !item.inDisk && !item.inDB
                        ).length

                        return (
                          <>
                            {safeDelete > 0 && (
                              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3">
                                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                <div>
                                  <div className="text-sm font-medium text-green-800">
                                    {safeDelete}
                                  </div>
                                  <div className="text-xs text-green-600">可安全删除</div>
                                </div>
                              </div>
                            )}
                            {diskOnly > 0 && (
                              <div className="flex items-center gap-2 rounded-lg bg-orange-50 p-3">
                                <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                                <div>
                                  <div className="text-sm font-medium text-orange-800">
                                    {diskOnly}
                                  </div>
                                  <div className="text-xs text-orange-600">仅磁盘存在</div>
                                </div>
                              </div>
                            )}
                            {dbOnly > 0 && (
                              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3">
                                <div className="h-2 w-2 rounded-full bg-red-500"></div>
                                <div>
                                  <div className="text-sm font-medium text-red-800">{dbOnly}</div>
                                  <div className="text-xs text-red-600">数据库异常</div>
                                </div>
                              </div>
                            )}
                            {inconsistent > 0 && (
                              <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
                                <div className="h-2 w-2 rounded-full bg-gray-500"></div>
                                <div>
                                  <div className="text-sm font-medium text-gray-800">
                                    {inconsistent}
                                  </div>
                                  <div className="text-xs text-gray-600">数据不一致</div>
                                </div>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                ) : hasScanned && orphanImages.length === 0 ? (
                  <div className="flex items-center gap-3 text-green-600">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                      <span className="text-lg">✓</span>
                    </div>
                    <div>
                      <div className="font-medium">系统运行良好</div>
                      <div className="text-sm">未发现孤立图片，存储空间使用正常</div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* 图片预览区域 */}
              {orphanImages.length > 0 && (
                <div className="space-y-3">
                  <Divider className="!my-4">
                    <Text className="text-sm font-medium text-gray-500">图片预览</Text>
                  </Divider>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {orphanImages.map(item => (
                      <Card
                        key={item.filename}
                        size="small"
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedFilenames.includes(item.filename)
                            ? 'bg-blue-50 ring-2 ring-blue-500'
                            : 'hover:border-blue-300'
                        }`}
                        onClick={() =>
                          toggleSelectOne(item.filename, !selectedFilenames.includes(item.filename))
                        }
                        styles={{ body: { padding: '8px' } }}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <Checkbox
                              checked={selectedFilenames.includes(item.filename)}
                              onChange={e => {
                                e.stopPropagation()
                                toggleSelectOne(item.filename, e.target.checked)
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <span
                                className="block truncate text-xs text-gray-700"
                                title={item.filename}
                              >
                                {item.filename}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            <Tag
                              color={item.inDisk ? 'green' : 'red'}
                              className="text-xs"
                            >
                              {item.inDisk ? '磁盘' : '无磁盘'}
                            </Tag>
                            <Tag
                              color={item.inDB ? 'blue' : 'orange'}
                              className="text-xs"
                            >
                              {item.inDB ? '数据库' : '无数据库'}
                            </Tag>
                          </div>

                          <div className="aspect-square overflow-hidden rounded">
                            {item.inDisk ? (
                              <Image
                                src={buildImageUrl(item.filename)}
                                alt={item.filename}
                                className="h-full w-full object-cover"
                                preview={{
                                  mask: <div className="text-white">预览</div>
                                }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs text-gray-400">
                                无预览
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </Modal>

      {/* 统计字段说明Modal */}
      <StatisticsGuideModal
        visible={statisticsGuideOpen}
        onClose={() => setStatisticsGuideOpen(false)}
      />
    </>
  )
}
