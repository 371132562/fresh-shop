import { TrophyOutlined } from '@ant-design/icons'
import { Button, Card, Col, Modal, Row, Table } from 'antd'
import dayjs from 'dayjs'
import type { SupplierOverviewDetailParams } from 'fresh-shop-backend/types/dto'
import React, { useEffect, useState } from 'react'

import ConsumptionDetailModal from '@/components/ConsumptionDetailModal'
import {
  CustomerLoyaltyCard,
  CustomerStatsCard,
  GroupBuyHistoryCard,
  ProductAnalysisCard,
  RegionalSalesCard
} from '@/components/SalesDataAnalysis'
import useAnalysisStore from '@/stores/analysisStore'
import useCustomerStore from '@/stores/customerStore'

type SupplierDetailModalProps = {
  visible: boolean
  onClose: () => void
  params?: SupplierOverviewDetailParams
  width?: number
}

/**
 * 供货商详情模态框组件
 * 展示供货商的详细数据分析，包括销售统计、客户分析、产品分析等
 */
const SupplierDetailModal: React.FC<SupplierDetailModalProps> = ({
  visible,
  onClose,
  params,
  width = 1000
}: SupplierDetailModalProps) => {
  // 客户列表模态框状态
  const customerListVisible = useAnalysisStore(state => state.customerListVisible)
  const setCustomerListVisible = useAnalysisStore(state => state.setCustomerListVisible)

  // 消费详情模态框状态
  const [consumptionDetailVisible, setConsumptionDetailVisible] = useState(false)

  // 从 Zustand store 中获取分析数据的方法和状态
  const getSupplierOverviewDetail = useAnalysisStore(state => state.getSupplierOverviewDetail)
  const supplierOverviewDetail = useAnalysisStore(state => state.supplierOverviewDetail)
  const supplierOverviewDetailLoading = useAnalysisStore(
    state => state.supplierOverviewDetailLoading
  )
  const resetSupplierOverviewDetail = useAnalysisStore(state => state.resetSupplierOverviewDetail)
  const resetMergedGroupBuyOverviewDetail = useAnalysisStore(
    state => state.resetMergedGroupBuyOverviewDetail
  )
  const handleFrequencyClick = useAnalysisStore(state => state.handleFrequencyClick)
  const handleRegionalClick = useAnalysisStore(state => state.handleRegionalClick)
  const customerListData = useAnalysisStore(state => state.customerListData)
  const customerListLoading = useAnalysisStore(state => state.customerListLoading)
  const customerListTitle = useAnalysisStore(state => state.customerListTitle)
  const resetCustomerList = useAnalysisStore(state => state.resetCustomerList)

  // 从 Zustand store 中获取客户数据的方法和状态
  const getConsumptionDetail = useCustomerStore(state => state.getConsumptionDetail)
  const consumptionDetail = useCustomerStore(state => state.consumptionDetail)
  const consumptionDetailLoading = useCustomerStore(state => state.consumptionDetailLoading)
  const resetConsumptionDetail = useCustomerStore(state => state.resetConsumptionDetail)

  // 当模态框打开且有参数时，获取详情数据
  useEffect(() => {
    if (visible && params) {
      // 清理团购单详情数据，避免状态冲突
      resetMergedGroupBuyOverviewDetail()
      getSupplierOverviewDetail(params)
    } else if (!visible) {
      // 当模态框关闭时，清理数据
      resetSupplierOverviewDetail()
    }
  }, [
    visible,
    params,
    getSupplierOverviewDetail,
    resetSupplierOverviewDetail,
    resetMergedGroupBuyOverviewDetail
  ])

  return (
    <Modal
      title="供货商详细数据"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={width}
      className="supplier-detail-modal"
      style={{
        top: 20
      }}
    >
      {supplierOverviewDetailLoading ? (
        <div className="flex items-center justify-center py-8">
          <div>加载中...</div>
        </div>
      ) : supplierOverviewDetail ? (
        <div className="!space-y-2">
          {/* 供货商基本信息 */}
          <Card
            title={
              <div className="flex h-12 items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrophyOutlined className="text-blue-500" />
                  <span className="text-lg font-medium">
                    供货商：{supplierOverviewDetail.supplierName}
                  </span>
                </div>
                {supplierOverviewDetail.startDate && supplierOverviewDetail.endDate ? (
                  <span className="text-sm text-orange-500">
                    统计时间：{dayjs(supplierOverviewDetail.startDate).format('YYYY-MM-DD')} -{' '}
                    {dayjs(supplierOverviewDetail.endDate).format('YYYY-MM-DD')}
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
                          ¥{supplierOverviewDetail.totalRevenue.toFixed(2)}
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
                          ¥{supplierOverviewDetail.totalProfit.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <span className="text-xl text-red-500">📈</span>
                      </div>
                    </div>
                  </div>
                </Col>

                {/* 平均利润率 */}
                <Col
                  xs={12}
                  sm={8}
                >
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-600">平均利润率</div>
                        <div className="mt-1 text-xl font-bold text-blue-500">
                          {supplierOverviewDetail.averageProfitMargin.toFixed(1)}%
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
                          {supplierOverviewDetail.totalOrderCount}单
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                        <span className="text-xl text-purple-600">📋</span>
                      </div>
                    </div>
                  </div>
                </Col>

                {/* 团购单数 */}
                <Col
                  xs={12}
                  sm={8}
                >
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-600">团购单数</div>
                        <div className="mt-1 text-xl font-bold text-orange-500">
                          {supplierOverviewDetail.totalGroupBuyCount}个
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                        <span className="text-xl text-orange-500">🚀</span>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </Card>

          {/* 商品分析 */}
          <ProductAnalysisCard
            topProducts={supplierOverviewDetail.topProducts}
            productCategoryStats={supplierOverviewDetail.productCategoryStats}
            title="商品分析"
          />

          {/* 团购历史 */}
          <GroupBuyHistoryCard
            groupBuyHistory={supplierOverviewDetail.groupBuyHistory}
            title="团购历史"
          />

          {/* 客户统计信息 */}
          <CustomerStatsCard
            uniqueCustomerCount={supplierOverviewDetail.uniqueCustomerCount}
            averageCustomerOrderValue={supplierOverviewDetail.averageCustomerOrderValue}
            title="客户统计"
          />

          {/* 客户忠诚度分析 */}
          <CustomerLoyaltyCard
            multiPurchaseCustomerCount={supplierOverviewDetail.multiPurchaseCustomerCount}
            multiPurchaseCustomerRatio={supplierOverviewDetail.multiPurchaseCustomerRatio}
            customerPurchaseFrequency={supplierOverviewDetail.customerPurchaseFrequency}
            onFrequencyClick={handleFrequencyClick}
            title="客户忠诚度分析"
          />

          {/* 地域销售分析 */}
          <RegionalSalesCard
            regionalSales={supplierOverviewDetail.regionalSales}
            onRegionalClick={handleRegionalClick}
            title="地域销售分析"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">暂无数据</div>
        </div>
      )}

      {/* 客户列表模态框 */}
      <Modal
        title={customerListTitle}
        open={customerListVisible}
        onCancel={() => {
          setCustomerListVisible(false)
          resetCustomerList()
        }}
        footer={null}
        width={600}
      >
        <Table
          columns={[
            {
              title: '客户姓名',
              dataIndex: 'customerName',
              key: 'customerName'
            },
            {
              title: '操作',
              key: 'action',
              render: (_, record) => (
                <Button
                  type="primary"
                  ghost
                  onClick={() => {
                    getConsumptionDetail(record.customerId)
                    setConsumptionDetailVisible(true)
                  }}
                >
                  查看客户全部消费详情
                </Button>
              )
            }
          ]}
          dataSource={customerListData.map((customer, index) => ({
            key: index,
            customerId: customer.customerId,
            customerName: customer.customerName
          }))}
          loading={customerListLoading}
          pagination={false}
          size="middle"
        />
      </Modal>

      {/* 消费详情模态框 */}
      <ConsumptionDetailModal
        visible={consumptionDetailVisible}
        onClose={() => {
          setConsumptionDetailVisible(false)
          resetConsumptionDetail()
        }}
        consumptionDetail={consumptionDetail}
        loading={consumptionDetailLoading}
      />
    </Modal>
  )
}

export default SupplierDetailModal
