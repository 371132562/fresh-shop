import {
  CaretDownOutlined,
  CaretRightOutlined,
  DownOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  ShoppingCartOutlined,
  TrophyOutlined,
  UpOutlined
} from '@ant-design/icons'
import { Button, Card, Col, Modal, Row, Skeleton, Tag, Tooltip } from 'antd'
import type {
  CustomerAddressConsumptionDetailDto,
  CustomerConsumptionDetailDto
} from 'fresh-shop-backend/types/dto'
import React, { useState } from 'react'

import dayjs from '@/utils/day'

import FifteenDayComparison from './components/FifteenDayComparison'

// 使用后端DTO类型定义
type ProductItem = CustomerConsumptionDetailDto['productConsumptionRanks'][0]
type GroupBuyItem = ProductItem['groupBuys'][0]

type ConsumptionDetailStatsModalProps = {
  visible: boolean
  onClose: () => void
  consumptionDetail: CustomerConsumptionDetailDto | CustomerAddressConsumptionDetailDto | null
  loading?: boolean
  title?: string
  width?: number
  type?: 'customer' | 'address' // 新增 type 参数区分消费详情类型
  startDate?: Date
  endDate?: Date
}

/**
 * 消费详情统计模态框（客户/客户地址通用）
 * 展示实体的消费详情，包括基础信息、购买商品排行和参团团购排行
 */
const ConsumptionDetailStatsModal: React.FC<ConsumptionDetailStatsModalProps> = ({
  visible,
  onClose,
  consumptionDetail,
  loading,
  title = '消费详情',
  width = 1000,
  type = 'customer',
  startDate,
  endDate
}: ConsumptionDetailStatsModalProps) => {
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
      title={
        <div className="flex items-center gap-2">
          <span>{title}</span>
          <Tooltip
            title={
              <div style={{ maxWidth: 500, lineHeight: 1.6 }}>
                <b>统计说明：</b>
                {type === 'customer' ? (
                  <div>
                    <div className="mb-2">
                      <b>客户维度统计：</b>展示单个客户的详细消费数据
                    </div>
                    <div className="mb-1">
                      • <b>订单统计：</b>该客户的所有订单数量、消费总额、平均单价
                    </div>
                    <div className="mb-1">
                      • <b>商品排行：</b>按消费金额排序，显示该客户购买最多的商品
                    </div>
                    <div className="mb-1">
                      • <b>参团明细（按商品展开）：</b>查看该客户在各商品下的参团记录与小计
                    </div>
                    <div className="mb-1">
                      • <b>最新购买：</b>标记该客户最近一次购买的商品
                    </div>
                    <div className="border-white-200 mt-2 rounded-md border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">
                          数据已扣除退款金额，仅统计已付款、已完成、已退款的订单
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-2">
                      <b>地址维度统计：</b>展示该地址下所有客户的消费数据汇总
                    </div>
                    <div className="mb-1">
                      • <b>订单统计：</b>该地址下所有客户的订单数量、消费总额、平均单价
                    </div>
                    <div className="mb-1">
                      • <b>商品排行：</b>按消费金额排序，显示该地址购买最多的商品
                    </div>
                    <div className="mb-1">
                      • <b>参团明细（按商品展开）：</b>查看该地址下所有客户在各商品的参团记录与小计
                    </div>
                    <div className="border-white-200 mt-2 rounded-md border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">
                          数据已扣除退款金额，仅统计已付款、已完成、已退款的订单
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            }
          >
            <QuestionCircleOutlined className="text-gray-400" />
          </Tooltip>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={width}
      className="consumption-detail-modal"
      style={{
        top: 20
      }}
      destroyOnHidden
    >
      {loading ? (
        <div className="space-y-3 py-2">
          <Skeleton
            active
            title={{ width: 200 }}
            paragraph={{ rows: 1 }}
          />
          <Skeleton
            active
            paragraph={{ rows: 4 }}
          />
          <Skeleton
            active
            paragraph={{ rows: 8 }}
          />
        </div>
      ) : consumptionDetail ? (
        <div className="!space-y-2">
          {/* 基本信息 */}
          <Card
            title={
              <div className="flex h-12 items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrophyOutlined className="text-blue-500" />
                  <span className="text-lg font-medium">
                    {type === 'address'
                      ? (consumptionDetail as CustomerAddressConsumptionDetailDto).addressName
                      : (consumptionDetail as CustomerConsumptionDetailDto).customerName}
                  </span>
                </div>
                {startDate && endDate ? (
                  <span className="text-sm text-orange-500">
                    统计时间：{dayjs(startDate).format('YYYY-MM-DD')} -{' '}
                    {dayjs(endDate).format('YYYY-MM-DD')}
                  </span>
                ) : (
                  <span className="text-sm text-orange-500">当前为全部时间统计</span>
                )}
              </div>
            }
            size="small"
            className="overflow-hidden"
            styles={{ header: { background: '#e6f7ff' } }}
          >
            {/* 核心指标区域 - 采用渐变背景和卡片式布局 */}
            <div className="mb-6 rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
              <div className="mb-4 text-center">
                <h3 className="text-lg font-semibold text-gray-800">消费核心指标</h3>
                <div className="mx-auto mt-1 h-1 w-16 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"></div>
              </div>

              <Row gutter={[12, 12]}>
                {/* 订单数量 */}
                <Col
                  xs={24}
                  md={12}
                  lg={8}
                >
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-600">订单数量</div>
                        <div className="mt-1 text-xl font-bold text-purple-600">
                          {consumptionDetail.orderCount}单
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                        <span className="text-xl text-purple-600">📋</span>
                      </div>
                    </div>
                  </div>
                </Col>

                {/* 消费总额 */}
                <Col
                  xs={24}
                  md={12}
                  lg={8}
                >
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-gray-600">消费总额</span>
                          <Tooltip title="已扣除退款金额">
                            <InfoCircleOutlined className="text-blue-500" />
                          </Tooltip>
                        </div>
                        <div className="mt-1 text-xl font-bold text-cyan-600">
                          ¥{consumptionDetail.totalAmount.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100">
                        <span className="text-xl text-cyan-600">💰</span>
                      </div>
                    </div>
                  </div>
                </Col>

                {/* 平均单价 */}
                <Col
                  xs={24}
                  md={12}
                  lg={8}
                >
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-600">平均单价</div>
                        <div className="mt-1 text-xl font-bold text-blue-500">
                          ¥{consumptionDetail.averagePricePerOrder.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                        <span className="text-xl text-blue-500">📊</span>
                      </div>
                    </div>
                  </div>
                </Col>

                {/* 退款金额 */}
                <Col
                  xs={24}
                  md={12}
                  lg={8}
                >
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-600">退款金额</div>
                        <div className="mt-1 text-xl font-bold text-orange-600">
                          ¥{(consumptionDetail.totalRefundAmount || 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                        <span className="text-xl">💸</span>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </Card>

          {/* 15天窗口总体+商品对比合并卡片 */}
          {consumptionDetail.fifteenDayComparison && (
            <FifteenDayComparison
              comparison={consumptionDetail.fifteenDayComparison}
              productComparisons={consumptionDetail.fifteenDayProductComparisons || []}
            />
          )}

          {/* 商品消费详情 */}
          <Card
            title={
              <div className="flex h-12 items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCartOutlined className="text-blue-500" />
                  <span className="text-lg font-medium">商品消费排行</span>
                </div>
                {/* 全部展开/收起按钮 */}
                {consumptionDetail.productConsumptionRanks.length > 0 && (
                  <Button
                    type="primary"
                    ghost
                    size="middle"
                    icon={
                      consumptionDetail.productConsumptionRanks.every(
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
                      const hasGroupBuys = consumptionDetail.productConsumptionRanks.some(
                        (p: ProductItem) => p.groupBuys && p.groupBuys.length > 0
                      )
                      if (hasGroupBuys) {
                        const allExpanded = consumptionDetail.productConsumptionRanks.every(
                          (p: ProductItem) =>
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
                            consumptionDetail.productConsumptionRanks
                              .filter((p: ProductItem) => p.groupBuys && p.groupBuys.length > 0)
                              .map((p: ProductItem) => p.productId)
                          )
                          setExpandedProducts(allProductIds)
                        }
                      }
                    }}
                    className="text-blue-500 hover:text-blue-600"
                  >
                    {consumptionDetail.productConsumptionRanks.every(
                      (p: ProductItem) =>
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
            className="overflow-hidden"
          >
            <div className="space-y-3">
              {consumptionDetail.productConsumptionRanks.map(
                (product: ProductItem, index: number) => {
                  const totalGroupBuys = product.groupBuys?.length || 0
                  const totalGroupBuyAmount =
                    product.groupBuys?.reduce(
                      (sum: number, gb: GroupBuyItem) => sum + (gb.totalAmount || 0),
                      0
                    ) || 0
                  const totalGroupBuyRefund =
                    product.groupBuys?.reduce(
                      (sum: number, gb: GroupBuyItem) => sum + (gb.totalRefundAmount || 0),
                      0
                    ) || 0

                  // 找到该商品中最新的团购时间（用于显示最近参团时间）
                  const latestGroupBuyDate = product.groupBuys?.reduce(
                    (latest: Date | null, gb: GroupBuyItem) => {
                      const gbDate = new Date(gb.latestGroupBuyStartDate)
                      return !latest || gbDate > latest ? gbDate : latest
                    },
                    null as Date | null
                  )

                  // 直接使用后端返回的 isLatestConsumption 字段
                  const isLatestConsumption = product.isLatestConsumption

                  return (
                    <div
                      key={product.productId}
                      className="group"
                    >
                      {/* 商品卡片 - 现代化设计 */}
                      <div
                        className={`relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-lg ${
                          totalGroupBuys > 0 ? 'cursor-pointer' : ''
                        } ${expandedProducts.has(product.productId) ? 'border-blue-400 shadow-md' : ''}`}
                        onClick={() => {
                          if (totalGroupBuys > 0) {
                            toggleProductExpand(product.productId)
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* 排名徽章 - 左侧设计 */}
                            <div className="flex items-center gap-3">
                              {/* 排名徽章 */}
                              <div
                                className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold shadow-lg transition-all duration-200 ${
                                  index === 0
                                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-orange-800 ring-2 ring-yellow-200'
                                    : index === 1
                                      ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-800 ring-2 ring-gray-200'
                                      : index === 2
                                        ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-amber-800 ring-2 ring-amber-200'
                                        : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white ring-2 ring-blue-200'
                                }`}
                              >
                                {index < 3 ? (
                                  <span className="text-xl">
                                    {index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}
                                  </span>
                                ) : (
                                  <span className="text-sm font-bold">{index + 1}</span>
                                )}
                              </div>

                              {/* 展开收起图标 */}
                              <div className="flex w-6 items-center justify-center">
                                {totalGroupBuys > 0 && (
                                  <div className="text-gray-400 transition-all duration-300 group-hover:text-blue-500">
                                    {expandedProducts.has(product.productId) ? (
                                      <CaretDownOutlined className="text-lg" />
                                    ) : (
                                      <CaretRightOutlined className="text-lg" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 商品信息 */}
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="text-lg font-semibold text-gray-800">
                                  {product.productName}
                                </div>
                                {isLatestConsumption && type === 'customer' && (
                                  <Tag
                                    color="red"
                                    className="text-xs"
                                  >
                                    最新购买
                                  </Tag>
                                )}
                              </div>
                              <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                                <span>购买 {product.count} 次</span>
                                {latestGroupBuyDate && (
                                  <span>
                                    最后购买: {dayjs(latestGroupBuyDate).format('YYYY-MM-DD')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 金额信息 */}
                          <div className="text-right">
                            <div className="text-2xl font-bold text-cyan-600">
                              {formatAmount(totalGroupBuyAmount)}
                            </div>
                            <div className="flex items-center justify-end gap-1 text-sm text-gray-500">
                              <span>总消费</span>
                              {totalGroupBuyRefund > 0 && (
                                <Tooltip title="已扣除退款金额">
                                  <InfoCircleOutlined className="text-orange-500" />
                                </Tooltip>
                              )}
                            </div>
                            {totalGroupBuyRefund > 0 && (
                              <div className="text-xs text-orange-600">
                                退款: {formatAmount(totalGroupBuyRefund)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* 参团明细列表（按商品展开） */}
                      {product.groupBuys &&
                        product.groupBuys.length > 0 &&
                        expandedProducts.has(product.productId) && (
                          <div className="ml-6 mt-3 space-y-2">
                            <div className="border-l-2 border-blue-200 pl-4">
                              {product.groupBuys.map((groupBuy: GroupBuyItem, gbIndex: number) => (
                                <div
                                  key={`${product.productId}-${gbIndex}`}
                                  className="mb-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-3 shadow-sm transition-all hover:shadow-md"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <div className="text-base font-semibold text-gray-800">
                                          {groupBuy.groupBuyName}
                                        </div>
                                        <div className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-600">
                                          {groupBuy.unitName}
                                        </div>
                                      </div>
                                      <div className="mt-1 text-sm text-gray-500">
                                        发起时间:{' '}
                                        {dayjs(groupBuy.latestGroupBuyStartDate).format(
                                          'YYYY-MM-DD'
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                      <div className="text-center">
                                        <div className="text-lg font-bold text-purple-600">
                                          {groupBuy.count}
                                        </div>
                                        <div className="text-xs text-gray-500">购买次数</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xl font-bold text-cyan-600">
                                          {formatAmount(groupBuy.totalAmount || 0)}
                                        </div>
                                        <div className="flex items-center justify-end gap-1 text-xs text-gray-500">
                                          <span>小计</span>
                                          {(groupBuy.totalRefundAmount || 0) > 0 && (
                                            <Tooltip title="已扣除退款金额">
                                              <InfoCircleOutlined className="text-orange-500" />
                                            </Tooltip>
                                          )}
                                        </div>
                                        {(groupBuy.totalRefundAmount || 0) > 0 && (
                                          <div className="text-xs text-orange-600">
                                            退款: {formatAmount(groupBuy.totalRefundAmount || 0)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  )
                }
              )}
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

export default ConsumptionDetailStatsModal
