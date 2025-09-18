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
              {/* 自定义容器：左侧信息 + 右侧操作，避免溢出导致响应式混乱 */}
              <div className="flex w-full flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
                {/* 左侧信息区：可伸展，溢出隐藏，md起自动换行 */}
                <div className="min-w-0 flex-1 overflow-hidden pr-0 md:pr-4">
                  {/* 标题：客户名称，小屏单行省略，md起允许换行 */}
                  <div className="mb-1">
                    <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-lg font-medium md:overflow-visible md:whitespace-normal md:break-all">
                      {item.customerName}
                    </span>
                  </div>
                  {/* 统计信息：网格布局，保证不撑坏容器 */}
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
                </div>

                {/* 右侧操作区：不收缩，允许换行；窄屏下按钮自然换行 */}
                <div className="flex shrink-0 flex-row flex-wrap items-center justify-start gap-2 md:justify-end md:gap-3">
                  <Button
                    color="default"
                    variant="outlined"
                    onClick={() => openDetail(item.customerId)}
                  >
                    查看数据
                  </Button>
                </div>
              </div>
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
