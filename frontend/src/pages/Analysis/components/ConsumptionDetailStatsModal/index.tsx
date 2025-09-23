import { InfoCircleOutlined, QuestionCircleOutlined, TrophyOutlined } from '@ant-design/icons'
import { Card, Col, Modal, Row, Skeleton, Tooltip } from 'antd'
import type {
  CustomerAddressConsumptionDetailDto,
  CustomerConsumptionDetailDto
} from 'fresh-shop-backend/types/dto'
import React, { useEffect } from 'react'

import useCustomerStore from '@/stores/customerStore'
import dayjs from '@/utils/day'

import AddressCustomerTable from './components/AddressCustomerTable'
import FifteenDayComparison from './components/FifteenDayComparison'
import ProductConsumptionRanks from './components/ProductConsumptionRanks'

type ConsumptionDetailStatsModalProps = {
  visible: boolean
  onClose: () => void
  id: string
  type?: 'customer' | 'address'
  startDate?: Date
  endDate?: Date
  // 兼容旧用法：仍可直接传入数据与loading
  title?: string
  width?: number
}

/**
 * 消费详情统计模态框（客户/客户地址通用）
 * 展示实体的消费详情，包括基础信息、购买商品排行和参团团购排行
 */
const ConsumptionDetailStatsModal: React.FC<ConsumptionDetailStatsModalProps> = ({
  visible,
  onClose,
  id,
  type = 'customer',
  startDate,
  endDate,
  title = '消费详情',
  width = 1000
}: ConsumptionDetailStatsModalProps) => {
  const getConsumptionDetail = useCustomerStore(state => state.getConsumptionDetail)
  const getAddressConsumptionDetail = useCustomerStore(state => state.getAddressConsumptionDetail)
  const storeCustomerDetail = useCustomerStore(state => state.consumptionDetail)
  const storeCustomerLoading = useCustomerStore(state => state.consumptionDetailLoading)
  const storeAddressDetail = useCustomerStore(state => state.addressConsumptionDetail)
  const storeAddressLoading = useCustomerStore(state => state.addressConsumptionDetailLoading)

  const internalDetail = type === 'address' ? storeAddressDetail : storeCustomerDetail
  const internalLoading = type === 'address' ? storeAddressLoading : storeCustomerLoading
  const consumptionDetail = internalDetail
  const effectiveLoading = internalLoading

  useEffect(() => {
    if (!visible) return
    if (!id) return
    if (type === 'address') {
      getAddressConsumptionDetail(id)
    } else {
      // 支持带时间范围
      if (startDate && endDate) {
        getConsumptionDetail({ id, startDate, endDate })
      } else {
        getConsumptionDetail({ id })
      }
    }
  }, [visible, id, type, startDate, endDate])

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
      {effectiveLoading ? (
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
                {/* 订单量 */}
                <Col
                  xs={24}
                  md={12}
                  lg={8}
                >
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-600">订单量</div>
                        <div className="mt-1 text-xl font-bold text-blue-600">
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
                        <div className="mt-1 text-xl font-bold text-blue-400">
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
                        <div className="mt-1 text-xl font-bold text-blue-400">
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

                {/* 部分退款/退款订单量 */}
                <Col
                  xs={24}
                  md={12}
                  lg={8}
                >
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-600">部分退款/退款订单</div>
                        <div className="mt-1 text-xl font-bold text-orange-600">
                          {consumptionDetail.totalPartialRefundOrderCount || 0}/
                          {consumptionDetail.totalRefundedOrderCount || 0} 单
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                        <span className="text-xl">📋</span>
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
          <ProductConsumptionRanks
            ranks={consumptionDetail.productConsumptionRanks}
            type={type}
          />

          {/* 地址维度：客户列表表格 */}
          {type === 'address' &&
            (consumptionDetail as CustomerAddressConsumptionDetailDto).addressCustomerStats && (
              <AddressCustomerTable
                stats={
                  (consumptionDetail as CustomerAddressConsumptionDetailDto).addressCustomerStats!
                }
              />
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

export default ConsumptionDetailStatsModal
