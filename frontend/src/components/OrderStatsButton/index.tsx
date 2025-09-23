import { CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { Modal } from 'antd'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'

import UpdateOrderStatusButton from '@/pages/Order/components/UpdateOrderStatusButton'
import useOrderStore from '@/stores/orderStore'
import dayjs from '@/utils/day'

/**
 * 订单统计按钮组件
 * 显示待付款和已付款订单量，点击可查看详细列表
 */
const OrderStatsButton = () => {
  const [modalVisible, setModalVisible] = useState(false)

  const orderStats = useOrderStore(state => state.orderStats)
  const getOrderStats = useOrderStore(state => state.getOrderStats)

  // 组件挂载时获取订单统计数据
  useEffect(() => {
    getOrderStats()
  }, [])

  // 处理按钮点击
  const handleButtonClick = () => {
    setModalVisible(true)
  }

  // 处理关闭弹窗
  const handleCloseModal = () => setModalVisible(false)

  // 如果没有订单数据，不显示按钮
  if (!orderStats) {
    return null
  }

  return (
    <>
      {/* 待付款订单按钮 */}
      {orderStats.notPaidCount > 0 && (
        <button
          onClick={handleButtonClick}
          className="flex cursor-pointer items-center space-x-1 rounded-lg bg-orange-500/95 px-4 py-2 text-white transition-colors hover:bg-orange-400"
        >
          <ClockCircleOutlined className="text-lg" />
          <span className="hidden px-1 md:inline">待付款</span>
          <span className="box-border rounded-full bg-white/20 px-2 py-1 font-bold">
            {orderStats.notPaidCount}
          </span>
        </button>
      )}

      {/* 已付款订单按钮 */}
      {orderStats.paidCount > 0 && (
        <button
          onClick={handleButtonClick}
          className="flex cursor-pointer items-center space-x-1 rounded-lg bg-green-500/95 px-4 py-2 text-white transition-colors hover:bg-green-400"
        >
          <CheckCircleOutlined className="text-lg" />
          <span className="hidden px-1 md:inline">已付款</span>
          <span className="rounded-full bg-white/20 px-2 py-1 font-bold">
            {orderStats.paidCount}
          </span>
        </button>
      )}

      {/* 订单详情弹窗 */}
      <Modal
        title={<div className="text-center text-lg font-semibold text-gray-900">订单管理</div>}
        open={modalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width={900}
        styles={{
          body: { padding: '24px' }
        }}
        className="order-stats-modal"
      >
        <div className="space-y-6">
          {/* 两列布局 */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* 左列：待付款订单列表 */}
            <div>
              {orderStats.notPaidOrders.length > 0 && (
                <div>
                  <div className="mb-4 flex items-center text-lg font-semibold text-orange-600">
                    <ClockCircleOutlined className="mr-2" />
                    待付款订单 ({orderStats.notPaidCount})
                  </div>
                  <div className="space-y-3">
                    {orderStats.notPaidOrders.map((order, index) => (
                      <NavLink
                        key={index}
                        to={`/groupBuy/detail/${order.groupBuy.id}`}
                        onClick={handleCloseModal}
                        className="block"
                      >
                        <div className="cursor-pointer rounded-xl border border-orange-200 bg-orange-50 p-4 transition-all duration-300 hover:border-orange-300 hover:shadow-md">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="mb-2 text-sm font-semibold text-gray-900">
                                {order.customer.name}
                              </div>
                              <div className="text-xs text-gray-600">
                                {order.groupBuy.name} (
                                {dayjs(order.groupBuy.groupBuyStartDate).format('MM-DD')})
                              </div>
                              {(() => {
                                const unit = order.groupBuy.units?.find(u => u.id === order.unitId)
                                if (!unit) return null
                                return (
                                  <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                                    <div>规格：{unit.unit}</div>
                                    <div>份数：{order.quantity}</div>
                                    <div>售价：¥{unit.price.toFixed(2)}</div>
                                  </div>
                                )
                              })()}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-medium text-white">
                                待付款
                              </span>
                              <div
                                onClick={e => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                }}
                              >
                                <UpdateOrderStatusButton
                                  orderId={order.id}
                                  status={order.status}
                                  onSuccess={() => {
                                    // 成功后自动刷新统计：store.updateOrder 已在 finally 调用了 getOrderStats
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 右列：已付款订单列表 */}
            <div>
              {orderStats.paidOrders.length > 0 && (
                <div>
                  <div className="mb-4 flex items-center text-lg font-semibold text-green-600">
                    <CheckCircleOutlined className="mr-2" />
                    已付款订单 ({orderStats.paidCount})
                  </div>
                  <div className="space-y-3">
                    {orderStats.paidOrders.map((order, index) => (
                      <NavLink
                        key={index}
                        to={`/groupBuy/detail/${order.groupBuy.id}`}
                        onClick={handleCloseModal}
                        className="block"
                      >
                        <div className="cursor-pointer rounded-xl border border-green-200 bg-green-50 p-4 transition-all duration-300 hover:border-green-300 hover:shadow-md">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="mb-2 text-sm font-semibold text-gray-900">
                                {order.customer.name}
                              </div>
                              <div className="text-xs text-gray-600">
                                {order.groupBuy.name} (
                                {dayjs(order.groupBuy.groupBuyStartDate).format('MM-DD')})
                              </div>
                              {(() => {
                                const unit = order.groupBuy.units?.find(u => u.id === order.unitId)
                                if (!unit) return null
                                return (
                                  <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                                    <div>规格：{unit.unit}</div>
                                    <div>份数：{order.quantity}</div>
                                    <div>售价：¥{unit.price.toFixed(2)}</div>
                                  </div>
                                )
                              })()}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-medium text-white">
                                已付款
                              </span>
                              <div
                                onClick={e => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                }}
                              >
                                <UpdateOrderStatusButton
                                  orderId={order.id}
                                  status={order.status}
                                  onSuccess={() => {
                                    // 成功后自动刷新统计：store.updateOrder 已在 finally 调用了 getOrderStats
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default OrderStatsButton
