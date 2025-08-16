import { GiftOutlined, ShoppingCartOutlined, UserOutlined } from '@ant-design/icons'
import { Card, Col, List, Modal, Row, Statistic, Tag } from 'antd'
import React from 'react'

import type { CustomerConsumptionDetailDto } from '../../../../backend/types/dto'

type ConsumptionDetailModalProps = {
  visible: boolean
  onClose: () => void
  consumptionDetail: CustomerConsumptionDetailDto | null
  loading?: boolean
  title?: string
  width?: number
}

/**
 * 消费详情模态框组件
 * 展示客户的消费详情，包括基础信息、购买商品排行和参与团购排行
 */
const ConsumptionDetailModal: React.FC<ConsumptionDetailModalProps> = ({
  visible,
  onClose,
  consumptionDetail,
  loading,
  title = '消费详情',
  width = 900
}: ConsumptionDetailModalProps) => {
  // 格式化金额显示
  const formatAmount = (amount: number) => {
    return `¥${amount.toFixed(2)}`
  }

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={width}
      className="consumption-detail-modal"
      style={{
        top: 20
      }}
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div>加载中...</div>
        </div>
      ) : consumptionDetail ? (
        <div className="!space-y-4">
          {/* 统计概览 */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <UserOutlined className="text-blue-500" />
                <span>客户： {consumptionDetail.customerName}</span>
              </div>
            }
            size="small"
          >
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="订单数量"
                  value={consumptionDetail.orderCount}
                  suffix="单"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="消费总额"
                  value={consumptionDetail.totalAmount}
                  precision={2}
                  prefix="¥"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="平均单价"
                  value={consumptionDetail.averagePricePerOrder}
                  precision={2}
                  prefix="¥"
                />
              </Col>
            </Row>
          </Card>

          {/* 商品消费详情（融合商品和团购） */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <ShoppingCartOutlined className="text-blue-500" />
                <span>商品消费详情</span>
              </div>
            }
            size="small"
          >
            <div className="space-y-4">
              {consumptionDetail.topProducts.map((product, index) => {
                const totalGroupBuys = product.groupBuys?.length || 0
                const totalGroupBuyAmount =
                  product.groupBuys?.reduce((sum, gb) => sum + (gb.totalAmount || 0), 0) || 0

                return (
                  <div
                    key={product.productId}
                    className="border-b border-gray-200 pb-4 last:border-b-0"
                  >
                    {/* 商品头部信息 */}
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-base font-medium text-gray-800">
                            {product.productName}
                          </div>
                          <div className="text-sm text-gray-500">
                            共购买 {product.count} 次 · {totalGroupBuys} 个团购规格
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-blue-600">
                          {formatAmount(totalGroupBuyAmount)}
                        </div>
                        <div className="text-sm text-gray-500">总消费</div>
                      </div>
                    </div>
                    {/* 团购详情列表 */}
                    {product.groupBuys && product.groupBuys.length > 0 && (
                      <div className="ml-4 space-y-2 border-l-2 border-blue-100 pl-4">
                        {product.groupBuys.map((groupBuy, gbIndex) => (
                          <div
                            key={`${product.productId}-${gbIndex}`}
                            className="flex items-center justify-between rounded-md bg-gray-50 p-3"
                          >
                            <div className="flex items-center gap-3">
                              <GiftOutlined className="text-green-500" />
                              <div>
                                <div className="font-medium text-gray-800">
                                  {groupBuy.groupBuyName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  规格：{groupBuy.unitName}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="w-14 text-center">
                                <div className="text-sm font-medium text-gray-600">
                                  {groupBuy.count}
                                </div>
                                <div className="text-xs text-gray-500">次数</div>
                              </div>
                              <div className="w-20 text-right">
                                <div className="text-base font-semibold text-green-600">
                                  {formatAmount(groupBuy.totalAmount || 0)}
                                </div>
                                <div className="text-xs text-gray-500">小计</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* 团购排行（保留兼容性，可选择性展示） */}
          {consumptionDetail.topGroupBuys && consumptionDetail.topGroupBuys.length > 0 && (
            <Card
              title={
                <div className="flex items-center gap-2">
                  <GiftOutlined className="text-green-500" />
                  <span>团购参与排行</span>
                  <Tag color="orange">快速概览</Tag>
                </div>
              }
              size="small"
            >
              <List
                dataSource={consumptionDetail.topGroupBuys.slice(0, 5)}
                renderItem={(item, index) => (
                  <List.Item>
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-600">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{item.groupBuyName}</div>
                          <div className="text-sm text-gray-500">规格：{item.unitName}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-semibold text-green-600">{item.count}</span>
                        <span className="ml-1 text-gray-500">次</span>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center py-8">
          <div>暂无数据</div>
        </div>
      )}
    </Modal>
  )
}

export default ConsumptionDetailModal
