import { InfoCircleOutlined, QuestionCircleOutlined, TrophyOutlined } from '@ant-design/icons'
import { Card, Col, Modal, Row, Skeleton, Tooltip } from 'antd'
import type { MergedGroupBuyOverviewDetailParams } from 'fresh-shop-backend/types/dto'
import React, { useEffect } from 'react'

import useAnalysisStore from '@/stores/analysisStore'
import useGlobalSettingStore from '@/stores/globalSettingStore'
import dayjs from '@/utils/day'
import {
  getProfitBgColor,
  getProfitColor,
  getProfitIcon,
  getProfitIconColor,
  getProfitMarginColor
} from '@/utils/profitColor'

import CustomerListModal from '../../CustomerOverview/components/CustomerListModal'
import CustomerLoyaltyAnalysis from '../../CustomerOverview/components/CustomerLoyaltyAnalysis'
import CustomerStatsAnalysis from '../../CustomerOverview/components/CustomerStatsAnalysis'
import RegionalSalesAnalysis from '../../Regional'
import GroupBuyHistoryAnalysis from './GroupBuyHistoryAnalysis'

type MergedGroupBuyDetailModalProps = {
  visible: boolean
  onClose: () => void
  params?: MergedGroupBuyOverviewDetailParams
  width?: number
}

/**
 * 团购单合并概况详情模态框组件。
 * 展示顺序遵循“先看盈利结果，再看退款压力与历史波动，最后看客户与区域解释因素”。
 */
const MergedGroupBuyDetailModal: React.FC<MergedGroupBuyDetailModalProps> = ({
  visible,
  onClose,
  params,
  width = 1000
}: MergedGroupBuyDetailModalProps) => {
  const globalSetting = useGlobalSettingStore(state => state.globalSetting)
  const sensitive = globalSetting?.value?.sensitive

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

  useEffect(() => {
    if (visible && params) {
      resetSupplierOverviewDetail()
      getMergedGroupBuyOverviewDetail(params)
      return
    }

    if (!visible) {
      resetMergedGroupBuyOverviewDetail()
    }
  }, [
    getMergedGroupBuyOverviewDetail,
    params,
    resetMergedGroupBuyOverviewDetail,
    resetSupplierOverviewDetail,
    visible
  ])

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <span>团购单（合并同名）详细数据</span>
          <Tooltip
            title={
              <div style={{ maxWidth: 500, lineHeight: 1.6 }}>
                <b>统计范围：</b>
                按当前选择的时间；未选择则统计全部时间。订单量仅统计已支付和已完成；销售额、利润、退款金额按统一口径纳入退款订单影响，范围为同一供货商下所有同名团购单的合并结果。
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
            <div className="mb-6 rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
              <div className="mb-4 text-center">
                <h3 className="text-lg font-semibold text-gray-800">核心业绩指标</h3>
                <div className="mx-auto mt-1 h-1 w-16 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"></div>
              </div>

              <Row gutter={[12, 12]}>
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
                        <div className="mt-1 text-xl font-bold text-blue-400">
                          ¥{mergedGroupBuyOverviewDetail.totalRevenue.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100">
                        <span className="text-xl text-cyan-600">💰</span>
                      </div>
                    </div>
                  </div>
                </Col>

                {!sensitive && (
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
                )}

                {!sensitive && (
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
                )}

                <Col
                  xs={24}
                  md={12}
                  lg={8}
                >
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-600">总订单量</div>
                        <div className="mt-1 text-xl font-bold text-blue-600">
                          {mergedGroupBuyOverviewDetail.totalOrderCount}单
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                        <span className="text-xl text-purple-600">📋</span>
                      </div>
                    </div>
                  </div>
                </Col>

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

          <GroupBuyHistoryAnalysis
            groupBuyHistory={mergedGroupBuyOverviewDetail.groupBuyLaunchHistory || []}
            title="团购历史"
            averageGroupBuyRevenue={mergedGroupBuyOverviewDetail.averageGroupBuyRevenue}
            averageGroupBuyProfit={mergedGroupBuyOverviewDetail.averageGroupBuyProfit}
            averageGroupBuyOrderCount={mergedGroupBuyOverviewDetail.averageGroupBuyOrderCount}
            totalRefundAmount={mergedGroupBuyOverviewDetail.totalRefundAmount}
            totalPartialRefundOrderCount={mergedGroupBuyOverviewDetail.totalPartialRefundOrderCount}
            totalRefundedOrderCount={mergedGroupBuyOverviewDetail.totalRefundedOrderCount}
          />

          <CustomerStatsAnalysis
            uniqueCustomerCount={mergedGroupBuyOverviewDetail.uniqueCustomerCount}
            averageCustomerOrderValue={mergedGroupBuyOverviewDetail.averageCustomerOrderValue}
            title="客户统计"
          />

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

          <RegionalSalesAnalysis
            regionalSales={mergedGroupBuyOverviewDetail.regionalSales}
            onRegionalClick={handleRegionalClick}
            title="客户地址分布"
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
