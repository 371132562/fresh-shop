import { TrophyOutlined } from '@ant-design/icons'
import { Card, Col, Modal, Row } from 'antd'
import dayjs from 'dayjs'
import type { MergedGroupBuyOverviewDetailParams } from 'fresh-shop-backend/types/dto'
import React, { useEffect } from 'react'

import {
  CustomerLoyaltyCard,
  CustomerStatsCard,
  GroupBuyHistoryCard,
  RegionalSalesCard
} from '@/components/SalesDataAnalysis'
import CustomerListModal from '@/components/SalesDataAnalysis/CustomerListModal'
import useAnalysisStore from '@/stores/analysisStore'

type MergedGroupBuyDetailModalProps = {
  visible: boolean
  onClose: () => void
  params?: MergedGroupBuyOverviewDetailParams
  width?: number
}

/**
 * 团购单合并概况详情模态框组件
 * 展示团购单的详细数据分析，包括销售统计、客户分析、地域分布等
 */
const MergedGroupBuyDetailModal: React.FC<MergedGroupBuyDetailModalProps> = ({
  visible,
  onClose,
  params,
  width = 1000
}: MergedGroupBuyDetailModalProps) => {
  // 客户列表模态框状态

  // 从 Zustand store 中获取分析数据的方法和状态
  const getMergedGroupBuyOverviewDetail = useAnalysisStore(
    state => state.getMergedGroupBuyOverviewDetail
  )
  const mergedGroupBuyOverviewDetail = useAnalysisStore(state => state.mergedGroupBuyOverviewDetail)
  const mergedGroupBuyOverviewDetailLoading = useAnalysisStore(
    state => state.mergedGroupBuyOverviewDetailLoading
  )
  const resetMergedGroupBuyOverviewDetail = useAnalysisStore(
    state => state.resetMergedGroupBuyOverviewDetail
  )
  const resetSupplierOverviewDetail = useAnalysisStore(state => state.resetSupplierOverviewDetail)
  const handleFrequencyClick = useAnalysisStore(state => state.handleFrequencyClick)
  const handleRegionalClick = useAnalysisStore(state => state.handleRegionalClick)

  // 当模态框打开且有参数时，获取详情数据
  useEffect(() => {
    if (visible && params) {
      // 清理供货商详情数据，避免状态冲突
      resetSupplierOverviewDetail()
      getMergedGroupBuyOverviewDetail(params)
    } else if (!visible) {
      // 当模态框关闭时，清理数据
      resetMergedGroupBuyOverviewDetail()
    }
  }, [visible, params])

  // 转换团购发起历史数据为公共组件需要的格式

  return (
    <Modal
      title="团购单（合并同名）详细数据"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={width}
      className="merged-groupbuy-detail-modal"
      style={{
        top: 20
      }}
    >
      {mergedGroupBuyOverviewDetailLoading ? (
        <div className="flex items-center justify-center py-8">
          <div>加载中...</div>
        </div>
      ) : mergedGroupBuyOverviewDetail ? (
        <div className="!space-y-2">
          {/* 团购单基本信息 */}
          <Card
            title={
              <div className="flex h-12 items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrophyOutlined className="text-blue-500" />
                  <span className="text-lg font-medium">
                    团购单：{mergedGroupBuyOverviewDetail.groupBuyName}
                  </span>
                </div>
                {mergedGroupBuyOverviewDetail.startDate && mergedGroupBuyOverviewDetail.endDate ? (
                  <span className="text-sm text-orange-500">
                    统计时间：{dayjs(mergedGroupBuyOverviewDetail.startDate).format('YYYY-MM-DD')} -{' '}
                    {dayjs(mergedGroupBuyOverviewDetail.endDate).format('YYYY-MM-DD')}
                  </span>
                ) : (
                  <span className="text-sm text-orange-500">当前为全部同名团购单统计</span>
                )}
              </div>
            }
            size="small"
            className="overflow-hidden"
          >
            {/* 核心指标区域 - 采用渐变背景和卡片式布局 */}
            <div className="mb-6 rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
              <div className="mb-4 text-center">
                <h3 className="text-lg font-semibold text-gray-800">核心业绩指标</h3>
                <div className="mx-auto mt-1 h-1 w-16 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"></div>
              </div>

              <Row gutter={[24, 24]}>
                {/* 总销售额 */}
                <Col
                  xs={12}
                  sm={8}
                >
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-600">总销售额</div>
                        <div className="mt-1 text-xl font-bold text-emerald-600">
                          ¥{mergedGroupBuyOverviewDetail.totalRevenue.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                        <span className="text-xl text-emerald-600">💰</span>
                      </div>
                    </div>
                  </div>
                </Col>

                {/* 总利润 */}
                <Col
                  xs={12}
                  sm={8}
                >
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-600">总利润</div>
                        <div className="mt-1 text-xl font-bold text-red-500">
                          ¥{mergedGroupBuyOverviewDetail.totalProfit.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <span className="text-xl text-red-500">📈</span>
                      </div>
                    </div>
                  </div>
                </Col>

                {/* 利润率 */}
                <Col
                  xs={12}
                  sm={8}
                >
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-600">利润率</div>
                        <div className="mt-1 text-xl font-bold text-blue-500">
                          {mergedGroupBuyOverviewDetail.totalProfitMargin.toFixed(1)}%
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                        <span className="text-xl text-blue-500">📊</span>
                      </div>
                    </div>
                  </div>
                </Col>

                {/* 总订单量 */}
                <Col
                  xs={12}
                  sm={8}
                >
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-600">总订单量</div>
                        <div className="mt-1 text-xl font-bold text-purple-600">
                          {mergedGroupBuyOverviewDetail.totalOrderCount}单
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                        <span className="text-xl text-purple-600">📋</span>
                      </div>
                    </div>
                  </div>
                </Col>

                {/* 发起次数 */}
                <Col
                  xs={12}
                  sm={8}
                >
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-600">发起次数</div>
                        <div className="mt-1 text-xl font-bold text-orange-500">
                          {mergedGroupBuyOverviewDetail.totalGroupBuyCount}次
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                        <span className="text-xl text-orange-500">🚀</span>
                      </div>
                    </div>
                  </div>
                </Col>

                {/* 供货商信息 */}
                <Col
                  xs={12}
                  sm={8}
                >
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-600">供货商</div>
                        <div className="mt-1 text-xl font-bold text-green-600">
                          {mergedGroupBuyOverviewDetail.supplierName || '暂无供货商'}
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                        <span className="text-xl text-green-600">🏪</span>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </Card>

          {/* 团购发起历史 */}
          <GroupBuyHistoryCard
            groupBuyHistory={mergedGroupBuyOverviewDetail?.groupBuyLaunchHistory || []}
            title="团购历史"
          />

          {/* 客户统计信息 */}
          <CustomerStatsCard
            uniqueCustomerCount={mergedGroupBuyOverviewDetail.uniqueCustomerCount}
            averageCustomerOrderValue={mergedGroupBuyOverviewDetail.averageCustomerOrderValue}
            title="客户统计"
          />

          {/* 客户忠诚度分析 */}
          <CustomerLoyaltyCard
            multiPurchaseCustomerCount={mergedGroupBuyOverviewDetail.multiPurchaseCustomerCount}
            multiPurchaseCustomerRatio={mergedGroupBuyOverviewDetail.multiPurchaseCustomerRatio}
            customerPurchaseFrequency={mergedGroupBuyOverviewDetail.customerPurchaseFrequency}
            onFrequencyClick={handleFrequencyClick}
            title="客户忠诚度分析"
          />

          {/* 地域销售分析 */}
          <RegionalSalesCard
            regionalSales={mergedGroupBuyOverviewDetail.regionalSales}
            onRegionalClick={handleRegionalClick}
            title="地域销售分析"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">暂无数据</div>
        </div>
      )}

      <CustomerListModal />
    </Modal>
  )
}

export default MergedGroupBuyDetailModal
