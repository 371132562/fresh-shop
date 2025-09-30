import { InfoCircleOutlined, QuestionCircleOutlined, TrophyOutlined } from '@ant-design/icons'
import { Card, Col, Modal, Row, Skeleton, Tooltip } from 'antd'
import type { ProductOverviewDetailParams } from 'fresh-shop-backend/types/dto'
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
import GroupBuyHistoryAnalysis from '../../GroupBuyOverview/components/GroupBuyHistoryAnalysis'
import ProductAnalysis from '../../Product'
import RegionalSalesAnalysis from '../../Regional'
import SupplierAnalysis from '../../Supplier'

type ProductDetailModalProps = {
  visible: boolean
  onClose: () => void
  params?: ProductOverviewDetailParams
  width?: number
}

/**
 * 商品详情模态框组件
 * 展示商品或商品类型的详细数据分析，包括销售统计、客户分析、产品分析等
 * 通过 dimension 参数区分是商品维度还是商品类型维度
 */
const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  visible,
  onClose,
  params,
  width = 1000
}: ProductDetailModalProps) => {
  const globalSetting = useGlobalSettingStore(state => state.globalSetting)

  // 从 Zustand store 中获取分析数据的方法和状态
  const getProductOverviewDetail = useAnalysisStore(state => state.getProductOverviewDetail)
  const productOverviewDetail = useAnalysisStore(state => state.productOverviewDetail)
  const productOverviewDetailLoading = useAnalysisStore(state => state.productOverviewDetailLoading)
  const resetProductOverviewDetail = useAnalysisStore(state => state.resetProductOverviewDetail)
  const resetMergedGroupBuyOverviewDetail = useAnalysisStore(
    state => state.resetMergedGroupBuyOverviewDetail
  )
  const handleFrequencyClick = useAnalysisStore(state => state.handleFrequencyClick)
  const handleRegionalClick = useAnalysisStore(state => state.handleRegionalClick)

  // 当模态框打开且有参数时，获取详情数据
  useEffect(() => {
    if (visible && params) {
      // 清理团购单详情数据，避免状态冲突
      resetMergedGroupBuyOverviewDetail()
      getProductOverviewDetail(params)
    } else if (!visible) {
      // 当模态框关闭时，清理数据
      resetProductOverviewDetail()
    }
  }, [visible, params])

  // 根据维度获取标题和描述
  const getTitleAndDescription = () => {
    if (!productOverviewDetail) return { title: '', description: '' }

    if (productOverviewDetail.dimension === 'product') {
      return {
        title: `商品：${productOverviewDetail.productName}`,
        description:
          '按当前选择的时间；未选择则统计全部时间。只计算已支付和已完成的订单，范围为该商品的所有团购单。'
      }
    } else {
      return {
        title: `商品类型：${productOverviewDetail.productTypeName}`,
        description:
          '按当前选择的时间；未选择则统计全部时间。只计算已支付和已完成的订单，范围为该商品类型下所有商品的所有团购单。'
      }
    }
  }

  const { title, description } = getTitleAndDescription()

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <span>{title}</span>
          <Tooltip
            title={
              <div style={{ maxWidth: 500, lineHeight: 1.6 }}>
                <b>统计范围：</b>
                {description}
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
      className="product-detail-modal"
      style={{
        top: 20
      }}
    >
      {productOverviewDetailLoading ? (
        <div className="space-y-3 py-2">
          <Skeleton
            active
            title={{ width: 180 }}
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
      ) : productOverviewDetail ? (
        <div className="!space-y-2">
          {/* 基本信息 */}
          <Card
            title={
              <div className="flex h-12 items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrophyOutlined className="text-blue-500" />
                  <span className="text-lg font-medium">{title}</span>
                </div>
                {productOverviewDetail.startDate && productOverviewDetail.endDate ? (
                  <span className="text-sm text-orange-500">
                    统计时间：{dayjs(productOverviewDetail.startDate).format('YYYY-MM-DD')} -{' '}
                    {dayjs(productOverviewDetail.endDate).format('YYYY-MM-DD')}
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
                        <div className="mt-1 text-xl font-bold text-blue-400">
                          ¥{productOverviewDetail.totalRevenue.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100">
                        <span className="text-xl text-cyan-600">💰</span>
                      </div>
                    </div>
                  </div>
                </Col>

                {/* 总利润 */}
                {!globalSetting?.value?.sensitive && (
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
                            className={`mt-1 text-xl font-bold ${getProfitColor(productOverviewDetail.totalProfit)}`}
                          >
                            ¥{productOverviewDetail.totalProfit.toFixed(2)}
                          </div>
                        </div>
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full ${getProfitBgColor(productOverviewDetail.totalProfit)}`}
                        >
                          <span
                            className={`text-xl ${getProfitIconColor(productOverviewDetail.totalProfit)}`}
                          >
                            {getProfitIcon(productOverviewDetail.totalProfit)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Col>
                )}

                {/* 利润率 */}
                {!globalSetting?.value?.sensitive && (
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
                            className={`mt-1 text-xl font-bold ${getProfitMarginColor(productOverviewDetail.totalProfitMargin)}`}
                          >
                            {productOverviewDetail.totalProfitMargin.toFixed(1)}%
                          </div>
                        </div>
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full ${getProfitBgColor(productOverviewDetail.totalProfitMargin)}`}
                        >
                          <span
                            className={`text-xl ${getProfitIconColor(productOverviewDetail.totalProfitMargin)}`}
                          >
                            📊
                          </span>
                        </div>
                      </div>
                    </div>
                  </Col>
                )}

                {/* 团购单量 */}
                <Col
                  xs={24}
                  md={12}
                  lg={8}
                >
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-600">团购单量</div>
                        <div className="mt-1 text-xl font-bold text-blue-600">
                          {productOverviewDetail.totalGroupBuyCount}个
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                        <span className="text-xl text-orange-500">🚀</span>
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
                        <div className="text-sm font-medium text-gray-600">订单量</div>
                        <div className="mt-1 text-xl font-bold text-blue-600">
                          {productOverviewDetail.totalOrderCount}单
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                        <span className="text-xl text-purple-600">📋</span>
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
                        <div className="text-sm font-medium text-gray-600">部分退款/退款订单量</div>
                        <div className="mt-1 text-xl font-bold text-orange-600">
                          {productOverviewDetail.totalPartialRefundOrderCount || 0}/
                          {productOverviewDetail.totalRefundedOrderCount || 0} 单
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                        <span className="text-xl text-orange-600">📋</span>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </Card>

          {/* 商品类型维度特有：商品统计 */}
          {productOverviewDetail.dimension === 'productType' &&
            productOverviewDetail.productStats && (
              <ProductAnalysis
                productStats={productOverviewDetail.productStats}
                productCategoryStats={[]} // 商品类型详情不需要分类统计
                title="商品统计"
                showCategoryStats={false} // 不显示商品分类统计
              />
            )}

          {/* 团购历史 */}
          <GroupBuyHistoryAnalysis
            groupBuyHistory={productOverviewDetail.groupBuyHistory}
            title="团购历史"
            averageGroupBuyRevenue={productOverviewDetail.averageGroupBuyRevenue}
            averageGroupBuyProfit={productOverviewDetail.averageGroupBuyProfit}
            averageGroupBuyOrderCount={productOverviewDetail.averageGroupBuyOrderCount}
            totalRefundAmount={productOverviewDetail.totalRefundAmount}
            totalPartialRefundOrderCount={productOverviewDetail.totalPartialRefundOrderCount}
            totalRefundedOrderCount={productOverviewDetail.totalRefundedOrderCount}
            showSupplierColumn={true}
          />

          {/* 供货商分析 */}
          <SupplierAnalysis
            supplierStats={productOverviewDetail.supplierStats}
            title="供货商分析"
            loading={productOverviewDetailLoading}
          />

          {/* 客户统计信息 */}
          <CustomerStatsAnalysis
            uniqueCustomerCount={productOverviewDetail.uniqueCustomerCount}
            averageCustomerOrderValue={productOverviewDetail.averageCustomerOrderValue}
            title="客户统计"
          />

          {/* 客户忠诚度分析 */}
          <CustomerLoyaltyAnalysis
            multiPurchaseCustomerCount={productOverviewDetail.multiPurchaseCustomerCount}
            multiPurchaseCustomerRatio={productOverviewDetail.multiPurchaseCustomerRatio}
            customerPurchaseFrequency={productOverviewDetail.customerPurchaseFrequency}
            onFrequencyClick={handleFrequencyClick}
            title="客户忠诚度分析"
            tooltip={
              <div style={{ maxWidth: 320, lineHeight: 1.5 }}>
                <div>说明：</div>
                <div>1）时间：仅统计当前选择的时间范围；若未选择则统计全部时间。</div>
                <div>
                  2）范围：
                  {productOverviewDetail.dimension === 'product'
                    ? '当前商品的所有团购单。'
                    : '当前商品类型下所有商品的所有团购单。'}
                </div>
                <div>3）订单：只计算已支付/已完成的订单。</div>
                <div>4）去重：同一个客户只统计一次。</div>
                <div>5）判定：多次购买指有效订单笔数≥2。</div>
                <div>6）分布：按有效订单次数分段统计，如"3-4次"表示下过3到4单的客户量。</div>
              </div>
            }
          />

          {/* 客户地址分布 */}
          <RegionalSalesAnalysis
            regionalSales={productOverviewDetail.regionalSales}
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

export default ProductDetailModal
