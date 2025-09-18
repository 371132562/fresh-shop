import { InfoCircleOutlined, QuestionCircleOutlined, TrophyOutlined } from '@ant-design/icons'
import { Card, Col, Modal, Row, Skeleton, Tooltip } from 'antd'
import type { MergedGroupBuyOverviewDetailParams } from 'fresh-shop-backend/types/dto'
import React, { useEffect } from 'react'

import useAnalysisStore from '@/stores/analysisStore'
import dayjs from '@/utils/day'
import {
  getProfitBgColor,
  getProfitColor,
  getProfitIcon,
  getProfitIconColor,
  getProfitMarginColor
} from '@/utils/profitColor'

import CustomerListModal from '../CustomerAnalysis/CustomerListModal'
import CustomerLoyaltyAnalysis from '../CustomerAnalysis/CustomerLoyaltyAnalysis'
import CustomerStatsAnalysis from '../CustomerAnalysis/CustomerStatsAnalysis'
import GroupBuyHistoryAnalysis from '../GroupBuyHistoryAnalysis'
import RegionalSalesAnalysis from '../RegionalAnalysis/RegionalSalesAnalysis'

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
      title={
        <div className="flex items-center gap-2">
          <span>团购单（合并同名）详细数据</span>
          <Tooltip
            title={
              <div style={{ maxWidth: 500, lineHeight: 1.6 }}>
                <b>统计范围：</b>
                按当前选择的时间；未选择则统计全部时间。只计算已支付和已完成的订单，范围为同一供货商下所有同名团购单的合并结果。
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
      className="merged-groupbuy-detail-modal"
      style={{
        top: 20
      }}
    >
      {mergedGroupBuyOverviewDetailLoading ? (
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
            paragraph={{ rows: 6 }}
          />
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
                    （供货商：{mergedGroupBuyOverviewDetail.supplierName}）
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
            styles={{ header: { background: '#e6f7ff' } }}
          >
            {/* 核心指标区域 - 采用渐变背景和卡片式布局 */}
            <div className="mb-6 rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
              <div className="mb-4 text-center">
                <h3 className="text-lg font-semibold text-gray-800">核心业绩指标</h3>
                <div className="mx-auto mt-1 h-1 w-16 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"></div>
              </div>

              <Row gutter={[12, 12]}>
                {/* 总销售额 */}
                <Col
                  xs={24}
                  md={12}
                  lg={8}
                >
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-gray-600">总销售额</span>
                          <Tooltip title="已扣除退款金额">
                            <InfoCircleOutlined className="text-blue-500" />
                          </Tooltip>
                        </div>
                        <div className="mt-1 text-xl font-bold text-cyan-600">
                          ¥{mergedGroupBuyOverviewDetail.totalRevenue.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100">
                        <span className="text-xl text-cyan-600">💰</span>
                      </div>
                    </div>
                  </div>
                </Col>

                {/* 总利润 */}
                <Col
                  xs={24}
                  md={12}
                  lg={8}
                >
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-gray-600">总利润</span>
                          <Tooltip title="已扣除退款金额">
                            <InfoCircleOutlined className="text-blue-500" />
                          </Tooltip>
                        </div>
                        <div
                          className={`mt-1 text-xl font-bold ${getProfitColor(mergedGroupBuyOverviewDetail.totalProfit)}`}
                        >
                          ¥{mergedGroupBuyOverviewDetail.totalProfit.toFixed(2)}
                        </div>
                      </div>
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full ${getProfitBgColor(mergedGroupBuyOverviewDetail.totalProfit)}`}
                      >
                        <span
                          className={`text-xl ${getProfitIconColor(mergedGroupBuyOverviewDetail.totalProfit)}`}
                        >
                          {getProfitIcon(mergedGroupBuyOverviewDetail.totalProfit)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Col>

                {/* 利润率 */}
                <Col
                  xs={24}
                  md={12}
                  lg={8}
                >
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-600">利润率</div>
                        <div
                          className={`mt-1 text-xl font-bold ${getProfitMarginColor(mergedGroupBuyOverviewDetail.totalProfitMargin)}`}
                        >
                          {mergedGroupBuyOverviewDetail.totalProfitMargin.toFixed(1)}%
                        </div>
                      </div>
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full ${getProfitBgColor(mergedGroupBuyOverviewDetail.totalProfitMargin)}`}
                      >
                        <span
                          className={`text-xl ${getProfitIconColor(mergedGroupBuyOverviewDetail.totalProfitMargin)}`}
                        >
                          📊
                        </span>
                      </div>
                    </div>
                  </div>
                </Col>

                {/* 总订单量 */}
                <Col
                  xs={24}
                  md={12}
                  lg={8}
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
                  xs={24}
                  md={12}
                  lg={8}
                >
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-600">发起次数</div>
                        <div className="mt-1 text-xl font-bold text-blue-600">
                          {mergedGroupBuyOverviewDetail.totalGroupBuyCount}次
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                        <span className="text-xl text-orange-500">🚀</span>
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
                          ¥{(mergedGroupBuyOverviewDetail.totalRefundAmount || 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                        <span className="text-xl text-orange-600">💸</span>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </Card>

          {/* 团购发起历史 */}
          <GroupBuyHistoryAnalysis
            groupBuyHistory={mergedGroupBuyOverviewDetail?.groupBuyLaunchHistory || []}
            title="团购历史"
          />

          {/* 客户统计信息 */}
          <CustomerStatsAnalysis
            uniqueCustomerCount={mergedGroupBuyOverviewDetail.uniqueCustomerCount}
            averageCustomerOrderValue={mergedGroupBuyOverviewDetail.averageCustomerOrderValue}
            title="客户统计"
          />

          {/* 客户忠诚度分析 */}
          <CustomerLoyaltyAnalysis
            multiPurchaseCustomerCount={mergedGroupBuyOverviewDetail.multiPurchaseCustomerCount}
            multiPurchaseCustomerRatio={mergedGroupBuyOverviewDetail.multiPurchaseCustomerRatio}
            customerPurchaseFrequency={mergedGroupBuyOverviewDetail.customerPurchaseFrequency}
            onFrequencyClick={handleFrequencyClick}
            title="客户忠诚度分析"
            tooltip={
              <div style={{ maxWidth: 320, lineHeight: 1.5 }}>
                <div>说明：</div>
                <div>1）时间：仅统计当前选择的时间范围；若未选择则统计全部时间。</div>
                <div>2）范围：同一供货商下、全部同名团购单合并计算。</div>
                <div>3）订单：只计算已支付/已完成的订单。</div>
                <div>4）去重：同一个客户只统计一次。</div>
                <div>5）判定：多次购买指有效订单笔数≥2。</div>
                <div>6）分布：按有效订单次数分段统计，如“3-4次”表示下过3到4单的客户量。</div>
              </div>
            }
          />

          {/* 地域销售分析 */}
          <RegionalSalesAnalysis
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
