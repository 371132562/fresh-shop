import { BarChartOutlined, TeamOutlined, TrophyOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Card, Col, Divider, Modal, Row, Statistic, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { MergedGroupBuyOverviewDetail } from 'fresh-shop-backend/types/dto'
import React, { useState } from 'react'

import ConsumptionDetailModal from '@/components/ConsumptionDetailModal'
import useAnalysisStore from '@/stores/analysisStore'
import useCustomerStore from '@/stores/customerStore'

import PurchaseFrequencyChart from './components/PurchaseFrequencyChart'
import RegionalSalesChart from './components/RegionalSalesChart'

type MergedGroupBuyDetailModalProps = {
  visible: boolean
  onClose: () => void
  detailData: MergedGroupBuyOverviewDetail | null
  loading?: boolean
  width?: number
}

/**
 * 团购单合并概况详情模态框组件
 * 展示团购单的详细数据分析，包括销售统计、客户分析、地域分布等
 */
const MergedGroupBuyDetailModal: React.FC<MergedGroupBuyDetailModalProps> = ({
  visible,
  onClose,
  detailData,
  loading,
  width = 1000
}: MergedGroupBuyDetailModalProps) => {
  // 客户列表模态框状态
  const [customerListVisible, setCustomerListVisible] = useState(false)

  // 消费详情模态框状态
  const [consumptionDetailVisible, setConsumptionDetailVisible] = useState(false)

  // 从 Zustand store 中获取分析数据的方法和状态
  const getMergedGroupBuyFrequencyCustomers = useAnalysisStore(
    state => state.getMergedGroupBuyFrequencyCustomers
  )
  const getMergedGroupBuyRegionalCustomers = useAnalysisStore(
    state => state.getMergedGroupBuyRegionalCustomers
  )
  const customerListData = useAnalysisStore(state => state.customerListData)
  const customerListLoading = useAnalysisStore(state => state.customerListLoading)
  const customerListTitle = useAnalysisStore(state => state.customerListTitle)
  const setCustomerListData = useAnalysisStore(state => state.setCustomerListData)
  const setCustomerListLoading = useAnalysisStore(state => state.setCustomerListLoading)
  const setCustomerListTitle = useAnalysisStore(state => state.setCustomerListTitle)
  const resetCustomerList = useAnalysisStore(state => state.resetCustomerList)

  // 从 Zustand store 中获取客户数据的方法和状态
  const getConsumptionDetail = useCustomerStore(state => state.getConsumptionDetail)
  const consumptionDetail = useCustomerStore(state => state.consumptionDetail)
  const consumptionDetailLoading = useCustomerStore(state => state.consumptionDetailLoading)
  const resetConsumptionDetail = useCustomerStore(state => state.resetConsumptionDetail)

  // 处理购买频次点击事件
  const handleFrequencyClick = async (frequency: number) => {
    if (!detailData) return

    setCustomerListTitle(`购买${frequency}次 的客户列表`)
    setCustomerListVisible(true)
    setCustomerListLoading(true)
    setCustomerListData([]) // 清空之前的数据

    await getMergedGroupBuyFrequencyCustomers({
      groupBuyName: detailData.groupBuyName,
      frequency,
      startDate: detailData.startDate,
      endDate: detailData.endDate
    })
  }

  // 处理地域点击事件
  const handleRegionalClick = async (addressId: string, addressName: string) => {
    if (!detailData) return

    setCustomerListTitle(`${addressName} 地址的客户列表`)
    setCustomerListVisible(true)
    setCustomerListLoading(true)
    setCustomerListData([]) // 清空之前的数据

    await getMergedGroupBuyRegionalCustomers({
      groupBuyName: detailData.groupBuyName,
      addressId,
      startDate: detailData.startDate,
      endDate: detailData.endDate
    })
  }
  // 客户购买次数分布表格列定义
  const purchaseFrequencyColumns: ColumnsType<{
    key: number
    frequency: number
    count: number
  }> = [
    {
      title: '购买次数',
      dataIndex: 'frequency',
      key: 'frequency',
      render: (frequency: number) => <span>{frequency}次</span>
    },
    {
      title: '客户数量',
      dataIndex: 'count',
      key: 'count',
      render: (count: number, { frequency }) => (
        <span
          className="cursor-pointer font-medium text-blue-600 hover:text-blue-800"
          onClick={() => handleFrequencyClick(frequency)}
        >
          {count}人
        </span>
      )
    }
  ]

  // 地域销售分析表格列定义
  const regionalSalesColumns: ColumnsType<{
    key: number
    addressName: string
    addressId: string
    customerCount: number
  }> = [
    {
      title: '地址',
      dataIndex: 'addressName',
      key: 'addressName',
      render: (addressName: string) => <span>{addressName || '未知地址'}</span>
    },
    {
      title: '客户数量',
      dataIndex: 'customerCount',
      key: 'customerCount',
      render: (count: number, record) => (
        <span
          className="cursor-pointer font-medium text-blue-600 hover:text-blue-800"
          onClick={() => handleRegionalClick(record.addressId, record.addressName)}
        >
          {count}人
        </span>
      )
    }
  ]

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
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div>加载中...</div>
        </div>
      ) : detailData ? (
        <div className="!space-y-4">
          {/* 团购单基本信息 */}
          <Card
            title={
              <div className="flex h-12 items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrophyOutlined className="text-blue-500" />
                  <span className="text-lg font-medium">团购单：{detailData.groupBuyName}</span>
                </div>
                {detailData.startDate && detailData.endDate ? (
                  <span className="text-sm text-orange-500">
                    统计时间：{dayjs(detailData.startDate).format('YYYY-MM-DD')} -{' '}
                    {dayjs(detailData.endDate).format('YYYY-MM-DD')}
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
                          ¥{detailData.totalRevenue.toFixed(2)}
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
                          ¥{detailData.totalProfit.toFixed(2)}
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
                          {detailData.totalProfitMargin.toFixed(1)}%
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
                          {detailData.totalOrderCount}单
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
                          {detailData.totalGroupBuyCount}次
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
                          {detailData.supplierNames && detailData.supplierNames.length > 0
                            ? detailData.supplierNames.join('、')
                            : '暂无供货商'}
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

          {/* 客户统计信息 */}
          <Card
            title={
              <div className="flex h-12 items-center gap-2">
                <UserOutlined className="text-green-500" />
                <span className="text-lg font-medium">客户统计</span>
              </div>
            }
            size="small"
          >
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="参与客户数"
                  value={detailData.uniqueCustomerCount}
                  suffix="人"
                  valueStyle={{ color: '#722ed1' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="平均客单价"
                  value={detailData.averageCustomerOrderValue}
                  precision={2}
                  prefix="¥"
                  valueStyle={{ color: '#eb2f96' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="团购发起次数"
                  value={detailData.totalGroupBuyCount}
                  suffix="次"
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Col>
            </Row>
          </Card>

          {/* 多次购买客户分析 */}
          <Card
            title={
              <div className="flex h-12 items-center gap-2">
                <TeamOutlined className="text-purple-500" />
                <span className="text-lg font-medium">客户忠诚度分析</span>
              </div>
            }
            size="small"
          >
            <Row
              gutter={16}
              className="mb-4"
            >
              <Col span={12}>
                <Statistic
                  title="多次购买客户数"
                  value={detailData.multiPurchaseCustomerCount}
                  suffix="人"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="多次购买客户占比"
                  value={detailData.multiPurchaseCustomerRatio}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
            </Row>

            <Divider
              orientation="left"
              orientationMargin="0"
            >
              <span className="text-sm text-gray-600">客户购买次数分布</span>
            </Divider>

            {/* 购买次数分布图表和表格 */}
            <Row gutter={16}>
              <Col span={12}>
                <PurchaseFrequencyChart
                  data={detailData.customerPurchaseFrequency}
                  onFrequencyClick={handleFrequencyClick}
                />
              </Col>
              <Col span={12}>
                <Table
                  columns={purchaseFrequencyColumns}
                  dataSource={detailData.customerPurchaseFrequency.map((item, index) => ({
                    key: index,
                    frequency: item.frequency,
                    count: item.count
                  }))}
                  pagination={false}
                  size="small"
                  className="mt-2"
                />
              </Col>
            </Row>
          </Card>

          {/* 地域销售分析 */}
          <Card
            title={
              <div className="flex h-12 items-center gap-2">
                <BarChartOutlined className="text-orange-500" />
                <span className="text-lg font-medium">地域销售分析</span>
              </div>
            }
            size="small"
          >
            {/* 地域销售分布图表和表格 */}
            <Row gutter={16}>
              <Col span={12}>
                <RegionalSalesChart
                  data={detailData.regionalSales}
                  onRegionalClick={handleRegionalClick}
                />
              </Col>
              <Col span={12}>
                <Table
                  columns={regionalSalesColumns}
                  dataSource={detailData.regionalSales.map((item, index) => ({
                    key: index,
                    addressId: item.addressId,
                    addressName: item.addressName,
                    customerCount: item.customerCount
                  }))}
                  pagination={false}
                  size="small"
                />
              </Col>
            </Row>
          </Card>
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

export default MergedGroupBuyDetailModal
