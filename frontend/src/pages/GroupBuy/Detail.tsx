import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button, Flex, Image, List, notification, Popconfirm, Skeleton, Spin, Tag } from 'antd'
import {
  GroupBuy,
  GroupBuyUnit,
  MergedGroupBuyOverviewDetailParams,
  Order
} from 'fresh-shop-backend/types/dto.ts'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router'

import MergedGroupBuyDetailModal from '@/pages/Analysis/components/MergedGroupBuyDetailModal'
import DeleteGroupBuyButton from '@/pages/GroupBuy/components/DeleteGroupBuyButton'
import Modify from '@/pages/GroupBuy/Modify.tsx'
import { PartialRefundButton } from '@/pages/Order/components/PartialRefundModal.tsx'
import OrderModify from '@/pages/Order/Modify.tsx'
import useGlobalSettingStore from '@/stores/globalSettingStore.ts'
import useGroupBuyStore from '@/stores/groupBuyStore.ts'
import useOrderStore, { OrderStatusMap } from '@/stores/orderStore.ts'
import { buildImageUrl, formatDate } from '@/utils'
import { getProfitColor } from '@/utils/profitColor'

export const Component = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const [againVisible, setAgainVisible] = useState(false)
  const [againGroupBuy, setAgainGroupBuy] = useState<GroupBuy | null>(null)
  const [orderModifyVisible, setOrderModifyVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)

  const groupBuy = useGroupBuyStore(state => state.groupBuy)
  const getGroupBuy = useGroupBuyStore(state => state.getGroupBuy)
  const getLoading = useGroupBuyStore(state => state.getLoading)
  const setGroupBuy = useGroupBuyStore(state => state.setGroupBuy)
  const globalSetting = useGlobalSettingStore(state => state.globalSetting)
  const updateOrder = useOrderStore(state => state.updateOrder)
  const getNextOrderStatus = useOrderStore(state => state.getNextOrderStatus)
  const canUpdateOrderStatus = useOrderStore(state => state.canUpdateOrderStatus)
  const getNextOrderStatusLabel = useOrderStore(state => state.getNextOrderStatusLabel)

  // 详情模态框相关状态

  const images: string[] = useMemo(() => {
    return Array.isArray(groupBuy?.images)
      ? groupBuy.images
          .filter((image): image is string => typeof image === 'string')
          .map(image => buildImageUrl(image))
      : []
  }, [groupBuy])

  useEffect(() => {
    if (id) {
      getGroupBuy({ id })
    }
    // 清除数据，避免在切换页面时显示旧数据
    return () => {
      setGroupBuy(null)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      getGroupBuy({ id })
    }
  }, [orderModifyVisible])

  // 删除交互由子组件负责

  const [detailParams, setDetailParams] = useState<MergedGroupBuyOverviewDetailParams | undefined>()

  // 处理查看详情
  const handleViewDetail = () => {
    if (groupBuy?.name && groupBuy?.supplierId) {
      setDetailParams({
        groupBuyName: groupBuy.name,
        supplierId: groupBuy.supplierId
      })
      setDetailVisible(true)
    }
  }

  // 关闭详情模态框
  const handleDetailCancel = () => {
    setDetailVisible(false)
    setDetailParams(undefined)
  }

  const handleUpdateOrderStatus = async (order: Order) => {
    const nextStatus = getNextOrderStatus(order.status)
    if (!nextStatus) {
      notification.info({
        message: '提示',
        description: '订单已是最终状态，无法继续修改'
      })
      return
    }

    const res = await updateOrder({
      id: order.id,
      status: nextStatus
    })

    if (res) {
      notification.success({
        message: '成功',
        description: `订单状态已更新为：${OrderStatusMap[nextStatus].label}`
      })

      // 直接更新本地状态，避免重新获取整个团购数据
      if (groupBuy && groupBuy.order) {
        const updatedOrders = groupBuy.order.map(o =>
          o.id === order.id ? { ...o, status: nextStatus } : o
        )
        setGroupBuy({ ...groupBuy, order: updatedOrders })
      }
    } else {
      notification.error({
        message: '失败',
        description: '更新订单状态失败'
      })
    }
  }

  return (
    <div className="w-full">
      {getLoading ? (
        <div className="space-y-4">
          <Skeleton
            active
            title={{ width: 200 }}
            paragraph={{ rows: 2 }}
          />
          <Skeleton
            active
            paragraph={{ rows: 6 }}
          />
          <Skeleton
            active
            paragraph={{ rows: 10 }}
          />
        </div>
      ) : (
        <>
          {/* 主要信息卡片 */}
          <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
            {/* 卡片标题及操作按钮 */}
            <h3 className="mb-4 border-b border-gray-100 pb-3 text-xl font-bold text-gray-800">
              <div className="mb-3 flex items-center gap-3">
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate(-1)}
                  className="flex items-center justify-center p-1"
                />
                {groupBuy?.name}
              </div>
              <div className="flex items-center justify-between">
                <Button
                  type="primary"
                  ghost
                  onClick={handleViewDetail}
                >
                  查看详细数据
                </Button>
                <Flex
                  gap="small"
                  wrap
                >
                  <Button
                    type="primary"
                    onClick={() => setOrderModifyVisible(true)}
                  >
                    添加订单
                  </Button>
                  <Button
                    color="primary"
                    variant="solid"
                    onClick={() => {
                      setAgainVisible(true)
                      setAgainGroupBuy(groupBuy)
                    }}
                  >
                    再次发起
                  </Button>
                  <Button
                    color="primary"
                    variant="outlined"
                    onClick={() => setVisible(true)}
                  >
                    编辑
                  </Button>
                  {id && (
                    <DeleteGroupBuyButton
                      id={id}
                      name={groupBuy?.name}
                      orders={groupBuy?.order}
                      size="middle"
                      onDeleted={() => navigate(-1)}
                    />
                  )}
                </Flex>
              </div>
            </h3>

            {/* 团购基础信息 */}
            <div className="space-y-3">
              {/* 发起时间 */}
              <div className="flex items-start text-base">
                <span className="w-20 flex-shrink-0 font-medium text-gray-500">发起时间：</span>
                <span className="word-break-all flex-grow break-words text-gray-700">
                  {groupBuy?.groupBuyStartDate ? (
                    formatDate(groupBuy.groupBuyStartDate)
                  ) : (
                    <span className="italic text-gray-400">无</span>
                  )}
                </span>
              </div>

              {/* 供货商 */}
              <div className="flex items-start text-base">
                <span className="w-20 flex-shrink-0 font-medium text-gray-500">供货商：</span>
                <span className="word-break-all flex-grow break-words text-gray-700">
                  {groupBuy?.supplier?.name || <span className="italic text-gray-400">无</span>}
                </span>
              </div>

              {/* 商品 */}
              <div className="flex items-start text-base">
                <span className="w-20 flex-shrink-0 font-medium text-gray-500">商品：</span>
                <span className="word-break-all flex-grow break-words text-gray-700">
                  {groupBuy?.product?.name || <span className="italic text-gray-400">无</span>}
                </span>
              </div>

              {/* 备注 */}
              <div className="flex items-start text-base">
                <span className="w-20 flex-shrink-0 font-medium text-gray-500">备注：</span>
                <span className="word-break-all flex-grow break-words text-gray-700">
                  {groupBuy?.description || <span className="italic text-gray-400">无</span>}
                </span>
              </div>

              {/* 订单量 */}
              <div className="flex items-start text-base">
                <span className="w-20 flex-shrink-0 font-medium text-gray-500">订单量：</span>
                <span className="word-break-all flex-grow break-words font-bold text-blue-600">
                  {groupBuy?.order?.length || <span className="italic text-gray-400">无</span>}
                </span>
              </div>

              {/* 销售额 */}
              <div className="flex items-start text-base">
                <span className="w-20 flex-shrink-0 font-medium text-gray-500">销售额：</span>
                <span className="word-break-all flex-grow break-words text-gray-700">
                  <span className="font-bold text-blue-400">
                    ¥{(groupBuy?.totalSalesAmount || 0).toFixed(2)}
                  </span>
                </span>
              </div>

              {/* 利润 */}
              <div className="flex items-start text-base">
                <span className="w-20 flex-shrink-0 font-medium text-gray-500">利润：</span>
                <span className="word-break-all flex-grow break-words text-gray-700">
                  <span className={`font-bold ${getProfitColor(groupBuy?.totalProfit || 0)}`}>
                    ¥{(groupBuy?.totalProfit || 0).toFixed(2)}
                  </span>
                </span>
              </div>

              {/* 退款金额 */}
              {(groupBuy?.totalRefundAmount || 0) > 0 && (
                <div className="flex items-start text-base">
                  <span className="w-20 flex-shrink-0 font-medium text-gray-500">退款金额：</span>
                  <span className="word-break-all flex-grow break-words text-gray-700">
                    <span className="font-bold text-orange-600">
                      ¥{(groupBuy?.totalRefundAmount || 0).toFixed(2)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 规格信息卡片 - 优化显示方式 */}
          <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
            <h3 className="mb-3 border-b border-gray-100 pb-2 text-base font-semibold text-gray-700">
              所有规格
            </h3>
            <div className="space-y-4">
              {/* 增加每项规格之间的垂直间距 */}
              {groupBuy && Array.isArray(groupBuy?.units) ? (
                (groupBuy.units as GroupBuyUnit[]).map((item, index: number) => (
                  <div
                    key={index}
                    className="rounded-md bg-gray-50 p-3"
                  >
                    {/* 为每项规格添加背景和内边距，形成独立区块 */}
                    <div className="mb-3 flex items-center">
                      {/* 规格名称单独一行，更醒目 */}
                      <span className="w-20 flex-shrink-0 text-gray-500">计量单位：</span>
                      <span className="font-bold text-blue-500">{item.unit}</span>
                      {/* 规格值加粗并使用蓝色强调 */}
                    </div>
                    <div className="mb-3 flex items-center">
                      <span className="w-20 flex-shrink-0 text-gray-500">售价：</span>
                      <span className="mr-2 font-bold text-blue-400">￥{item.price}</span>
                    </div>
                    {!globalSetting?.value?.sensitive && (
                      <div className="flex items-center">
                        <span className="w-20 flex-shrink-0 text-gray-500">成本价：</span>
                        <span className="font-bold text-blue-400">￥{item.costPrice}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-2 text-base text-gray-700">
                  <span className="italic text-gray-400">无规格信息</span>
                </div>
              )}
            </div>
          </div>

          {/* 图片展示区卡片 */}
          {images.length > 0 && (
            <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
              {/* 保持 p-4 */}
              <h3 className="mb-3 border-b border-gray-100 pb-2 text-base font-semibold text-gray-700">
                相关图片
              </h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {/* 保持原有的图片网格布局 */}
                <Image.PreviewGroup>
                  {images.map((image, index) => (
                    <div
                      key={index}
                      className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-gray-100" // 保持圆角 md
                    >
                      <Image
                        src={image}
                        alt={`商品图片 ${index + 1}`}
                        className="h-full w-full object-cover"
                        fallback="/placeholder.svg"
                        placeholder={
                          <div className="flex h-full w-full items-center justify-center bg-gray-200">
                            <Spin size="small" />
                          </div>
                        }
                      />
                    </div>
                  ))}
                </Image.PreviewGroup>
              </div>
            </div>
          )}

          {/* 订单信息卡片 */}
          <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
            <h3 className="mb-3 border-b border-gray-100 pb-2 text-base font-semibold text-gray-700">
              订单信息 共 {groupBuy?.order?.length || 0} 条
            </h3>
            <List
              itemLayout="horizontal"
              dataSource={groupBuy?.order}
              renderItem={order => {
                const unit = (groupBuy?.units as GroupBuyUnit[])?.find(
                  item => item.id === order.unitId
                )
                const nextStatusLabel = getNextOrderStatusLabel(order.status)
                const canUpdate = canUpdateOrderStatus(order.status)

                // 计算订单总金额
                const orderTotalAmount = unit ? unit.price * order.quantity : 0

                const actions = []

                if (canUpdate) {
                  actions.push(
                    <Popconfirm
                      key="update-status"
                      title={
                        <div className="text-lg">
                          确定要将订单状态变更为{' '}
                          <span className="text-blue-500">{nextStatusLabel}</span> 吗？
                        </div>
                      }
                      placement="left"
                      onConfirm={() => handleUpdateOrderStatus(order)}
                      okText="确定"
                      cancelText="取消"
                      okButtonProps={{ size: 'large', color: 'primary', variant: 'solid' }}
                      cancelButtonProps={{
                        size: 'large',
                        color: 'primary',
                        variant: 'outlined'
                      }}
                    >
                      <Button type="primary">更新状态</Button>
                    </Popconfirm>
                  )
                  // 添加部分退款按钮
                  actions.push(
                    <PartialRefundButton
                      key="partial-refund"
                      orderId={order.id}
                      orderTotalAmount={orderTotalAmount}
                      currentRefundAmount={order.partialRefundAmount || 0}
                      orderStatus={order.status}
                      onSuccess={(refundAmount: number) => {
                        // 局部更新：仅更新该订单的部分退款金额，避免滚动位置丢失
                        if (groupBuy && groupBuy.order) {
                          const updatedOrders = groupBuy.order.map(o =>
                            o.id === order.id
                              ? {
                                  ...o,
                                  partialRefundAmount: (o.partialRefundAmount || 0) + refundAmount
                                }
                              : o
                          )
                          setGroupBuy({ ...groupBuy, order: updatedOrders })
                        }
                      }}
                    />
                  )
                }

                return (
                  <List.Item actions={actions}>
                    <List.Item.Meta
                      title={
                        <span className="text-base font-medium text-gray-800">
                          {order?.customer?.name ? (
                            <NavLink
                              to={`/order/detail/${order.id}`}
                              className="text-base font-medium text-gray-800 hover:text-blue-500"
                            >
                              {order.customer.name}
                            </NavLink>
                          ) : (
                            '无客户信息'
                          )}
                        </span>
                      }
                      description={
                        <div className="space-y-2 py-2 text-sm text-gray-600">
                          <p className="flex items-center">
                            <span className="w-20 flex-shrink-0">手机号:</span>
                            <span className="flex-grow">{order?.customer?.phone || '无'}</span>
                          </p>
                          <p className="flex items-center">
                            <span className="w-20 flex-shrink-0">所选规格:</span>
                            <span className="flex-grow">{unit ? unit.unit : '无'}</span>
                          </p>
                          <p className="flex items-center">
                            <span className="w-20 flex-shrink-0">份数:</span>
                            <span className="flex-grow">{order.quantity}</span>
                          </p>
                          <p className="flex items-center">
                            <span className="w-20 flex-shrink-0">订单状态:</span>
                            <span className="flex-grow">
                              <Tag color={OrderStatusMap[order.status].color}>
                                {OrderStatusMap[order.status].label}
                              </Tag>
                            </span>
                          </p>
                          {(order.partialRefundAmount || 0) > 0 && order.status !== 'REFUNDED' && (
                            <p className="flex items-center">
                              <span className="w-20 flex-shrink-0 text-gray-600">退款:</span>
                              <span className="flex-grow">
                                <span className="font-bold text-orange-600">
                                  ¥{order.partialRefundAmount.toFixed(2)}
                                </span>
                                /
                                <span className="font-bold text-cyan-600">
                                  ¥{orderTotalAmount.toFixed(2)}
                                </span>
                              </span>
                            </p>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )
              }}
            />
            {!groupBuy?.order?.length && (
              <div className="py-2 text-base text-gray-700">
                <span className="italic text-gray-400">无订单信息</span>
              </div>
            )}
          </div>

          {/* 如果没有数据，显示提示 */}
          {!getLoading && !groupBuy?.id && (
            <div className="py-8 text-center text-gray-500">
              {/* 保持 py-8 */}
              <p className="mb-2">暂无团购单信息。</p>
              <p className="text-sm">请检查ID或稍后重试。</p>
            </div>
          )}
        </>
      )}
      {visible && (
        <Modify
          id={id}
          visible={visible}
          setVisible={setVisible}
        />
      )}
      {againVisible && (
        <Modify
          visible={againVisible}
          setVisible={setAgainVisible}
          againGroupBuy={againGroupBuy}
        />
      )}
      {orderModifyVisible && (
        <OrderModify
          visible={orderModifyVisible}
          setVisible={setOrderModifyVisible}
          groupBuyId={id}
        />
      )}
      <MergedGroupBuyDetailModal
        visible={detailVisible}
        onClose={handleDetailCancel}
        params={detailParams}
      />
      {/* 删除交互已由 DeleteGroupBuyButton 负责 */}
    </div>
  )
}
