import { CheckCircleOutlined, ClockCircleOutlined, ShoppingCartOutlined } from '@ant-design/icons'
import { Badge, Button, Card, Col, Divider, Modal, Popconfirm, Row, Space } from 'antd'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'

import useOrderStore, { OrderStatus, OrderStatusMap } from '@/stores/orderStore'
import dayjs from '@/utils/day'

type OrderStatsButtonProps = {
  className?: string
}

/**
 * 订单统计按钮组件
 * 显示待付款和已付款订单数量，点击可查看详细列表
 */
const OrderStatsButton = ({ className }: OrderStatsButtonProps) => {
  const [modalVisible, setModalVisible] = useState(false)

  const orderStats = useOrderStore(state => state.orderStats)
  const getOrderStats = useOrderStore(state => state.getOrderStats)
  const updateOrder = useOrderStore(state => state.updateOrder)
  const canUpdateOrderStatus = useOrderStore(state => state.canUpdateOrderStatus)
  const getNextOrderStatusLabel = useOrderStore(state => state.getNextOrderStatusLabel)
  const handleUpdateOrderStatus = useOrderStore(state => state.handleUpdateOrderStatus)

  // 组件挂载时获取订单统计数据
  useEffect(() => {
    getOrderStats()
  }, [])

  // 计算总的待处理订单数量（待付款 + 已付款）
  const totalPendingCount = (orderStats?.notPaidCount || 0) + (orderStats?.paidCount || 0)

  // 处理悬浮按钮点击
  const handleFloatButtonClick = () => {
    setModalVisible(true)
  }

  // 处理关闭弹窗
  const handleCloseModal = () => setModalVisible(false)

  // 如果没有待处理订单，不显示悬浮按钮
  if (!orderStats || totalPendingCount === 0) {
    return null
  }

  return (
    <>
      {/* 订单统计按钮 */}
      <div className={className}>
        <Badge
          count={totalPendingCount}
          overflowCount={99}
          size="small"
        >
          <Button
            type="text"
            shape="round"
            size="large"
            icon={<ShoppingCartOutlined className="!text-2xl !text-white" />}
            onClick={handleFloatButtonClick}
            className="!text-white transition duration-200 hover:bg-blue-600/50 active:bg-blue-600/50"
          />
        </Badge>
      </div>

      {/* 订单详情弹窗 */}
      <Modal
        title={
          <div className="text-center text-lg font-semibold text-slate-700">📋 未完成状态订单</div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
        style={{
          top: 20
        }}
      >
        <Space
          direction="vertical"
          className="w-full"
          size="large"
        >
          {/* 统计概览卡片 */}
          <Card
            className="!rounded-xl !border-none !bg-gradient-to-br !from-sky-600 !to-purple-600"
            styles={{ body: { padding: '20px' } }}
          >
            <div className="text-center text-white">
              <div className="mb-3 text-base font-medium">📊 订单统计</div>
              <Space size="large">
                <div>
                  <div className="text-2xl font-bold">{orderStats.notPaidCount}</div>
                  <div className="text-xs opacity-90">待付款</div>
                </div>
                <Divider
                  type="vertical"
                  className="!h-10 !border-white/30"
                />
                <div>
                  <div className="text-2xl font-bold">{orderStats.paidCount}</div>
                  <div className="text-xs opacity-90">已付款</div>
                </div>
              </Space>
            </div>
          </Card>

          {/* 两列布局 */}
          <Row gutter={24}>
            {/* 左列：待付款订单列表 */}
            <Col span={12}>
              {orderStats.notPaidOrders.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center text-base font-semibold text-orange-500">
                    <ClockCircleOutlined className="mr-2" />
                    待付款订单
                  </div>
                  <Space
                    direction="vertical"
                    className="w-full"
                    size="small"
                  >
                    {orderStats.notPaidOrders.map((order, index) => (
                      <NavLink
                        key={index}
                        to={`/groupBuy/detail/${order.groupBuy.id}`}
                        onClick={handleCloseModal}
                        className="block"
                      >
                        <Card
                          className="cursor-pointer rounded-lg border border-orange-200 bg-orange-50 transition-all duration-300 hover:shadow-md"
                          styles={{ body: { padding: '12px 16px' } }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="mb-1 text-sm font-semibold text-slate-700">
                                👤 {order.customer.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                🛒 {order.groupBuy.name} (
                                {dayjs(order.groupBuy.groupBuyStartDate).format('MM-DD')})
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className="rounded-xl px-2 py-1 text-xs font-medium text-white"
                                style={{
                                  backgroundColor: OrderStatusMap[OrderStatus.NOTPAID].color
                                }}
                              >
                                待付款
                              </div>
                              {canUpdateOrderStatus(order.status) && (
                                <Popconfirm
                                  title={
                                    <div className="text-lg">
                                      确定要将订单状态变更为{' '}
                                      <span className="text-blue-500">
                                        {getNextOrderStatusLabel(order.status)}
                                      </span>{' '}
                                      吗？
                                    </div>
                                  }
                                  onConfirm={e => {
                                    e?.preventDefault()
                                    e?.stopPropagation()
                                    handleUpdateOrderStatus(order, updateOrder)
                                  }}
                                  onCancel={e => {
                                    e?.preventDefault()
                                    e?.stopPropagation()
                                  }}
                                  okText="确定"
                                  cancelText="取消"
                                >
                                  <Button
                                    type="primary"
                                    size="small"
                                    onClick={e => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                    }}
                                  >
                                    更新状态
                                  </Button>
                                </Popconfirm>
                              )}
                            </div>
                          </div>
                        </Card>
                      </NavLink>
                    ))}
                  </Space>
                </div>
              )}
            </Col>

            {/* 右列：已付款订单列表 */}
            <Col span={12}>
              {orderStats.paidOrders.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center text-base font-semibold text-green-500">
                    <CheckCircleOutlined className="mr-2" />
                    已付款订单
                  </div>
                  <Space
                    direction="vertical"
                    className="w-full"
                    size="small"
                  >
                    {orderStats.paidOrders.map((order, index) => (
                      <NavLink
                        key={index}
                        to={`/groupBuy/detail/${order.groupBuy.id}`}
                        onClick={handleCloseModal}
                        className="block"
                      >
                        <Card
                          className="cursor-pointer rounded-lg border border-green-200 bg-green-50 transition-all duration-300"
                          styles={{ body: { padding: '12px 16px' } }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="mb-1 text-sm font-semibold text-slate-700">
                                👤 {order.customer.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                🛒 {order.groupBuy.name} (
                                {dayjs(order.groupBuy.groupBuyStartDate).format('MM-DD')})
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className="rounded-xl px-2 py-1 text-xs font-medium text-white"
                                style={{
                                  backgroundColor: OrderStatusMap[OrderStatus.PAID].color
                                }}
                              >
                                已付款待完成
                              </div>
                              {canUpdateOrderStatus(order.status) && (
                                <Popconfirm
                                  title={
                                    <div className="text-lg">
                                      确定要将订单状态变更为{' '}
                                      <span className="text-blue-500">
                                        {getNextOrderStatusLabel(order.status)}
                                      </span>{' '}
                                      吗？
                                    </div>
                                  }
                                  onConfirm={e => {
                                    e?.preventDefault()
                                    e?.stopPropagation()
                                    handleUpdateOrderStatus(order, updateOrder)
                                  }}
                                  onCancel={e => {
                                    e?.preventDefault()
                                    e?.stopPropagation()
                                  }}
                                  okText="确定"
                                  cancelText="取消"
                                >
                                  <Button
                                    type="primary"
                                    size="small"
                                    onClick={e => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                    }}
                                  >
                                    更新状态
                                  </Button>
                                </Popconfirm>
                              )}
                            </div>
                          </div>
                        </Card>
                      </NavLink>
                    ))}
                  </Space>
                </div>
              )}
            </Col>
          </Row>
        </Space>
      </Modal>
    </>
  )
}

export default OrderStatsButton
