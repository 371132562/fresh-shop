import { CheckCircleOutlined, ClockCircleOutlined, ShoppingCartOutlined } from '@ant-design/icons'
import {
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Modal,
  notification,
  Popconfirm,
  Row,
  Space
} from 'antd'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import useOrderStore, { OrderStatus, OrderStatusMap } from '@/stores/orderStore'

type OrderStatsButtonProps = {
  className?: string
}

/**
 * 订单统计按钮组件
 * 显示未付款和已付款订单数量，点击可查看详细列表
 */
const OrderStatsButton = ({ className }: OrderStatsButtonProps) => {
  const navigate = useNavigate()
  const [modalVisible, setModalVisible] = useState(false)

  const orderStats = useOrderStore(state => state.orderStats)
  const getOrderStats = useOrderStore(state => state.getOrderStats)
  const refreshOrderStats = useOrderStore(state => state.refreshOrderStats)
  const updateOrder = useOrderStore(state => state.updateOrder)
  const statsLoading = useOrderStore(state => state.statsLoading)

  // 组件挂载时获取订单统计数据
  useEffect(() => {
    getOrderStats()
  }, [])

  // 计算总的待处理订单数量（未付款 + 已付款）
  const totalPendingCount = (orderStats?.notPaidCount || 0) + (orderStats?.paidCount || 0)

  // 处理悬浮按钮点击
  const handleFloatButtonClick = () => {
    setModalVisible(true)
    // 点击时刷新数据
    refreshOrderStats()
  }

  // 处理订单条目点击，跳转到团购单详情页
  const handleOrderClick = (groupBuyId: string) => {
    // 使用window.location进行页面跳转
    navigate(`/groupBuy/detail/${groupBuyId}`)
    setModalVisible(false)
  }

  // 处理订单状态更新
  const handleUpdateOrderStatus = async (order: any) => {
    if (!order.id) return
    // 统一使用前端 OrderStatus 类型，避免类型不兼容
    const orderStatusValues = Object.values(OrderStatus) as OrderStatus[]
    const currentIndex = orderStatusValues.findIndex(status => status === order.status)
    if (currentIndex < orderStatusValues.length - 1) {
      const nextStatus = orderStatusValues[currentIndex + 1]
      const res = await updateOrder({
        id: order.id,
        status: nextStatus
      })
      if (res) {
        notification.success({
          message: '成功',
          description: `订单状态已更新为：${OrderStatusMap[nextStatus].label}`
        })
        // 重新获取订单统计数据
        await refreshOrderStats()
      } else {
        notification.error({
          message: '失败',
          description: '更新订单状态失败'
        })
      }
    } else {
      notification.info({
        message: '提示',
        description: '订单已是最终状态，无法继续修改'
      })
    }
  }

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
            loading={statsLoading}
            className="!text-white transition duration-200 hover:bg-blue-600/50 active:bg-blue-600/50"
          />
        </Badge>
      </div>

      {/* 订单详情弹窗 */}
      <Modal
        title={
          <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 600, color: '#2c3e50' }}>
            📋 未完成状态订单
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
        centered
        style={{ top: 20 }}
      >
        <Space
          direction="vertical"
          style={{ width: '100%' }}
          size="large"
        >
          {/* 统计概览卡片 */}
          <Card
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <div style={{ color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '12px' }}>
                📊 订单统计
              </div>
              <Space size="large">
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {orderStats.notPaidCount}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>未付款</div>
                </div>
                <Divider
                  type="vertical"
                  style={{ borderColor: 'rgba(255,255,255,0.3)', height: '40px' }}
                />
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{orderStats.paidCount}</div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>已付款</div>
                </div>
              </Space>
            </div>
          </Card>

          {/* 两列布局 */}
          <Row gutter={24}>
            {/* 左列：未付款订单列表 */}
            <Col span={12}>
              {orderStats.notPaidOrders.length > 0 && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '12px',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#fa8c16'
                    }}
                  >
                    <ClockCircleOutlined style={{ marginRight: '8px' }} />
                    未付款订单
                  </div>
                  <Space
                    direction="vertical"
                    style={{ width: '100%' }}
                    size="small"
                  >
                    {orderStats.notPaidOrders.map((order, index) => (
                      <Card
                        key={index}
                        onClick={() => handleOrderClick(order.groupBuy.id)}
                        style={{
                          borderRadius: '8px',
                          border: '1px solid #ffe7ba',
                          backgroundColor: '#fffbf0',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        styles={{ body: { padding: '12px 16px' } }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: '14px',
                                color: '#2c3e50',
                                marginBottom: '4px'
                              }}
                            >
                              👤 {order.customer.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                              🛒 {order.groupBuy.name} (
                              {dayjs(order.groupBuy.groupBuyStartDate).format('MM-DD')})
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                padding: '4px 8px',
                                borderRadius: '12px',
                                backgroundColor: '#fa8c16',
                                color: 'white',
                                fontSize: '10px',
                                fontWeight: 500
                              }}
                            >
                              待付款
                            </div>
                            {(() => {
                              const orderStatusValues = Object.values(OrderStatus) as OrderStatus[]
                              const currentIndex = orderStatusValues.findIndex(
                                status => status === order.status
                              )
                              const nextStatusLabel =
                                currentIndex < orderStatusValues.length - 1
                                  ? OrderStatusMap[orderStatusValues[currentIndex + 1]].label
                                  : '无'
                              return (
                                <Popconfirm
                                  title={
                                    <div className="text-lg">
                                      确定要将订单状态变更为{' '}
                                      <span className="text-blue-500">{nextStatusLabel}</span> 吗？
                                    </div>
                                  }
                                  onConfirm={e => {
                                    e?.stopPropagation()
                                    handleUpdateOrderStatus(order)
                                  }}
                                  onCancel={e => e?.stopPropagation()}
                                  okText="确定"
                                  cancelText="取消"
                                  disabled={currentIndex === orderStatusValues.length - 1}
                                >
                                  <Button
                                    type="primary"
                                    size="small"
                                    disabled={currentIndex === orderStatusValues.length - 1}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    更新状态
                                  </Button>
                                </Popconfirm>
                              )
                            })()}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </Space>
                </div>
              )}
            </Col>

            {/* 右列：已付款订单列表 */}
            <Col span={12}>
              {orderStats.paidOrders.length > 0 && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '12px',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#52c41a'
                    }}
                  >
                    <CheckCircleOutlined style={{ marginRight: '8px' }} />
                    已付款订单
                  </div>
                  <Space
                    direction="vertical"
                    style={{ width: '100%' }}
                    size="small"
                  >
                    {orderStats.paidOrders.map((order, index) => (
                      <Card
                        key={index}
                        hoverable
                        onClick={() => handleOrderClick(order.groupBuy.id)}
                        style={{
                          borderRadius: '8px',
                          border: '1px solid #b7eb8f',
                          backgroundColor: '#f6ffed',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        styles={{ body: { padding: '12px 16px' } }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: '14px',
                                color: '#2c3e50',
                                marginBottom: '4px'
                              }}
                            >
                              👤 {order.customer.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                              🛒 {order.groupBuy.name} (
                              {dayjs(order.groupBuy.groupBuyStartDate).format('MM-DD')})
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                padding: '4px 8px',
                                borderRadius: '12px',
                                backgroundColor: '#52c41a',
                                color: 'white',
                                fontSize: '10px',
                                fontWeight: 500
                              }}
                            >
                              待完成
                            </div>
                            {(() => {
                              const orderStatusValues = Object.values(OrderStatus) as OrderStatus[]
                              const currentIndex = orderStatusValues.findIndex(
                                status => status === order.status
                              )
                              const nextStatusLabel =
                                currentIndex < orderStatusValues.length - 1
                                  ? OrderStatusMap[orderStatusValues[currentIndex + 1]].label
                                  : '无'
                              return (
                                <Popconfirm
                                  title={`确定要将订单状态变更为 ${nextStatusLabel} 吗？`}
                                  onConfirm={e => {
                                    e?.stopPropagation()
                                    handleUpdateOrderStatus(order)
                                  }}
                                  onCancel={e => e?.stopPropagation()}
                                  okText="确定"
                                  cancelText="取消"
                                  disabled={currentIndex === orderStatusValues.length - 1}
                                >
                                  <Button
                                    type="primary"
                                    size="small"
                                    disabled={currentIndex === orderStatusValues.length - 1}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    更新状态
                                  </Button>
                                </Popconfirm>
                              )
                            })()}
                          </div>
                        </div>
                      </Card>
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
