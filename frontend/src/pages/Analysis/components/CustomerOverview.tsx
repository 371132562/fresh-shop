import { Button, Card, Col, Form, Input, List, Row } from 'antd'
import { useEffect, useState } from 'react'

import SearchToolbar from '@/components/SearchToolbar'
import ConsumptionDetailStatsModal from '@/pages/Analysis/components/ConsumptionDetailStatsModal'
import useAnalysisStore from '@/stores/analysisStore'
import useCustomerStore from '@/stores/customerStore'

type CustomerOverviewProps = {
  startDate?: Date
  endDate?: Date
}

// 客户概况：以 List 形式展示客户概况，支持搜索、排序、分页和查看详情
export const CustomerOverview = ({ startDate, endDate }: CustomerOverviewProps) => {
  const [sortValue, setSortValue] = useState<string>('totalAmount_desc')
  const [form] = Form.useForm()
  const [customerName, setCustomerName] = useState('')

  const customerOverviewList = useAnalysisStore(state => state.customerOverviewList)
  const customerOverviewLoading = useAnalysisStore(state => state.customerOverviewLoading)
  const customerOverviewTotal = useAnalysisStore(state => state.customerOverviewTotal)
  const customerOverviewPage = useAnalysisStore(state => state.customerOverviewPage)
  const customerOverviewPageSize = useAnalysisStore(state => state.customerOverviewPageSize)
  const getCustomerOverview = useAnalysisStore(state => state.getCustomerOverview)
  const setCustomerOverviewPage = useAnalysisStore(state => state.setCustomerOverviewPage)

  const getConsumptionDetail = useCustomerStore(state => state.getConsumptionDetail)
  const consumptionDetail = useCustomerStore(state => state.consumptionDetail)
  const consumptionDetailLoading = useCustomerStore(state => state.consumptionDetailLoading)
  const resetConsumptionDetail = useCustomerStore(state => state.resetConsumptionDetail)

  const [detailVisible, setDetailVisible] = useState(false)

  const fetchData = (page: number = customerOverviewPage) => {
    const [fieldKey, order] = sortValue.split('_') as [
      'orderCount' | 'totalAmount' | 'averageOrderAmount',
      'asc' | 'desc'
    ]
    const sortFieldMap = {
      orderCount: 'totalOrderCount',
      totalAmount: 'totalRevenue',
      averageOrderAmount: 'averageOrderAmount'
    } as const
    getCustomerOverview({
      startDate,
      endDate,
      page,
      pageSize: customerOverviewPageSize,
      customerName,
      sortField: sortFieldMap[fieldKey],
      sortOrder: order
    })
  }

  // 拉取客户概况（支持时间范围/搜索/排序）
  useEffect(() => {
    fetchData(1)
  }, [startDate, endDate, sortValue, customerName])

  const openDetail = (id: string) => {
    // 统一对象参数形式
    getConsumptionDetail(startDate && endDate ? { id, startDate, endDate } : { id })
    setDetailVisible(true)
  }

  const closeDetail = () => {
    setDetailVisible(false)
    resetConsumptionDetail()
  }

  return (
    <>
      {/* 搜索表单区域 */}
      <Card
        className="mb-4 w-full"
        size="small"
      >
        <Form
          form={form}
          layout="vertical"
          name="customerOverviewSearchForm"
          autoComplete="off"
        >
          <Row gutter={[16, 8]}>
            <Col
              xs={24}
              md={12}
              lg={8}
            >
              <Form.Item
                label="客户名称"
                name="customerName"
                className="!mb-1"
              >
                <Input
                  placeholder="请输入客户名称"
                  allowClear
                  onPressEnter={() => setCustomerName(form.getFieldValue('customerName') || '')}
                  onClear={() => setCustomerName('')}
                />
              </Form.Item>
            </Col>
          </Row>
          <SearchToolbar
            sortOptions={[
              { label: '按总消费额倒序', value: 'totalAmount_desc' },
              { label: '按总消费额正序', value: 'totalAmount_asc' },
              { label: '按订单量倒序', value: 'orderCount_desc' },
              { label: '按订单量正序', value: 'orderCount_asc' },
              { label: '按平均单价倒序', value: 'averageOrderAmount_desc' },
              { label: '按平均单价正序', value: 'averageOrderAmount_asc' }
            ]}
            sortValue={sortValue}
            onSortChange={v => setSortValue(v)}
            onSearch={() => setCustomerName(form.getFieldValue('customerName') || '')}
            onReset={() => {
              form.setFieldsValue({ customerName: '' })
              setCustomerName('')
            }}
            searchLoading={customerOverviewLoading}
            totalCount={customerOverviewTotal}
            countLabel="个客户"
          />
        </Form>
      </Card>

      <section className="box-border flex w-full items-center justify-between">
        <List
          className="w-full"
          itemLayout="horizontal"
          loading={customerOverviewLoading}
          pagination={{
            position: 'bottom',
            align: 'end',
            total: customerOverviewTotal,
            current: customerOverviewPage,
            pageSize: customerOverviewPageSize,
            onChange: p => {
              setCustomerOverviewPage(p)
              fetchData(p)
            }
          }}
          dataSource={customerOverviewList}
          renderItem={item => (
            <List.Item>
              <List.Item.Meta
                title={
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-medium">{item.customerName}</span>
                    </div>
                  </div>
                }
                description={
                  <div className="flex items-start justify-between">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">总消费额</span>
                        <span className="text-lg font-semibold text-cyan-600">
                          ¥{item.totalRevenue.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">订单量</span>
                        <span className="text-lg font-semibold text-orange-600">
                          {item.totalOrderCount}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">平均单价</span>
                        <span className="text-lg font-semibold text-purple-600">
                          ¥{item.averageOrderAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="primary"
                      ghost
                      onClick={() => openDetail(item.customerId)}
                    >
                      查看详细数据
                    </Button>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </section>

      <ConsumptionDetailStatsModal
        visible={detailVisible}
        onClose={closeDetail}
        consumptionDetail={consumptionDetail}
        loading={consumptionDetailLoading}
        startDate={startDate}
        endDate={endDate}
      />
    </>
  )
}

export default CustomerOverview
