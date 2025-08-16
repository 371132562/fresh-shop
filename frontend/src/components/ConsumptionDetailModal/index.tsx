import {
  CaretDownOutlined,
  CaretRightOutlined,
  DownOutlined,
  ShoppingCartOutlined,
  UpOutlined,
  UserOutlined
} from '@ant-design/icons'
import { Button, Card, Col, Divider, Modal, Row, Statistic } from 'antd'
import dayjs from 'dayjs'
import React, { useState } from 'react'

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
  // 展开状态管理 - 记录每个商品的展开状态
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  // 格式化金额显示
  const formatAmount = (amount: number) => {
    return `¥${amount.toFixed(2)}`
  }

  // 切换商品展开状态
  const toggleProductExpand = (productId: string) => {
    const newExpanded = new Set(expandedProducts)
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId)
    } else {
      newExpanded.add(productId)
    }
    setExpandedProducts(newExpanded)
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
              <div className="flex h-12 items-center gap-2">
                <UserOutlined className="text-blue-500" />
                <span className="text-lg font-medium">客户： {consumptionDetail.customerName}</span>
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
              <div className="flex h-12 items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCartOutlined className="text-blue-500" />
                  <span className="text-lg font-medium">商品消费详情</span>
                </div>
                {/* 全部展开/收起按钮 */}
                {consumptionDetail.topProducts.length > 0 && (
                  <Button
                    type="primary"
                    ghost
                    size="middle"
                    icon={
                      consumptionDetail.topProducts.every(
                        p =>
                          !p.groupBuys ||
                          p.groupBuys.length === 0 ||
                          expandedProducts.has(p.productId)
                      ) ? (
                        <UpOutlined />
                      ) : (
                        <DownOutlined />
                      )
                    }
                    onClick={() => {
                      const hasGroupBuys = consumptionDetail.topProducts.some(
                        p => p.groupBuys && p.groupBuys.length > 0
                      )
                      if (hasGroupBuys) {
                        const allExpanded = consumptionDetail.topProducts.every(
                          p =>
                            !p.groupBuys ||
                            p.groupBuys.length === 0 ||
                            expandedProducts.has(p.productId)
                        )
                        if (allExpanded) {
                          // 全部收起
                          setExpandedProducts(new Set())
                        } else {
                          // 全部展开
                          const allProductIds = new Set(
                            consumptionDetail.topProducts
                              .filter(p => p.groupBuys && p.groupBuys.length > 0)
                              .map(p => p.productId)
                          )
                          setExpandedProducts(allProductIds)
                        }
                      }
                    }}
                    className="text-blue-500 hover:text-blue-600"
                  >
                    {consumptionDetail.topProducts.every(
                      p =>
                        !p.groupBuys ||
                        p.groupBuys.length === 0 ||
                        expandedProducts.has(p.productId)
                    )
                      ? '全部收起'
                      : '全部展开'}
                  </Button>
                )}
              </div>
            }
            size="small"
          >
            <div className="space-y-2">
              {consumptionDetail.topProducts.map((product, index) => {
                const totalGroupBuys = product.groupBuys?.length || 0
                const totalGroupBuyAmount =
                  product.groupBuys?.reduce((sum, gb) => sum + (gb.totalAmount || 0), 0) || 0

                return (
                  <div key={product.productId}>
                    {/* 商品头部信息 - 可点击展开收起 */}
                    <div
                      className="flex cursor-pointer items-center justify-between rounded-lg p-3 transition-all duration-200 hover:bg-blue-50 hover:shadow-sm"
                      onClick={() => toggleProductExpand(product.productId)}
                    >
                      <div className="flex items-center gap-4">
                        {/* 展开收起按钮 - 移到序号左侧 */}
                        {totalGroupBuys > 0 && (
                          <div className="flex h-6 w-6 items-center justify-center">
                            {expandedProducts.has(product.productId) ? (
                              <CaretDownOutlined className="text-lg text-blue-500 transition-transform duration-200" />
                            ) : (
                              <CaretRightOutlined className="text-lg text-blue-500 transition-transform duration-200" />
                            )}
                          </div>
                        )}
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-base font-bold text-white shadow-md">
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-gray-800">
                            {product.productName}
                          </div>
                          <div className="text-sm text-gray-500">
                            共购买 {product.count} 次 · {totalGroupBuys} 个团购规格
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-blue-600">
                          {formatAmount(totalGroupBuyAmount)}
                        </div>
                        <div className="text-sm text-gray-500">总消费</div>
                      </div>
                    </div>
                    {/* 团购详情列表 - 根据展开状态显示 */}
                    {product.groupBuys &&
                      product.groupBuys.length > 0 &&
                      expandedProducts.has(product.productId) && (
                        <div className="border-l-3 my-2 ml-4 space-y-2 border-blue-300 pl-4">
                          {product.groupBuys.map((groupBuy, gbIndex) => (
                            <div
                              key={`${product.productId}-${gbIndex}`}
                              className="flex items-center justify-between rounded-md bg-gray-50 p-3"
                            >
                              <div className="flex items-center gap-3">
                                <div>
                                  <div className="font-medium text-gray-800">
                                    {groupBuy.groupBuyName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    规格：{groupBuy.unitName}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    最近参与：
                                    {dayjs(groupBuy.latestGroupBuyStartDate).format('YYYY-MM-DD')}
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
                    {/* 商品分割线 */}
                    {index < consumptionDetail.topProducts.length - 1 && (
                      <Divider className="!my-2 !border-gray-400" />
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
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
