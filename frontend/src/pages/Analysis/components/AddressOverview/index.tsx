import { Button, Card, Col, Form, Input, List, Row } from 'antd'
import { useEffect, useState } from 'react'

import SearchToolbar from '@/components/SearchToolbar'
import ConsumptionDetailStatsModal from '@/pages/Analysis/components/ConsumptionDetail'
import useAnalysisStore from '@/stores/analysisStore'
import useCustomerStore from '@/stores/customerStore'

type AddressOverviewProps = {
  startDate?: Date
  endDate?: Date
}

// 地址概况：以 List 形式展示地址概况，支持搜索、排序、分页和查看详情
export const AddressOverview = ({ startDate, endDate }: AddressOverviewProps) => {
  const [sortField, setSortField] = useState<
    'orderCount' | 'totalAmount' | 'averageOrderAmount' | 'totalRefundAmount'
  >('totalAmount')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [form] = Form.useForm()
  const [addressName, setAddressName] = useState('')

  const addressOverviewList = useAnalysisStore(state => state.addressOverviewList)
  const addressOverviewLoading = useAnalysisStore(state => state.addressOverviewLoading)
  const addressOverviewTotal = useAnalysisStore(state => state.addressOverviewTotal)
  const addressOverviewPage = useAnalysisStore(state => state.addressOverviewPage)
  const addressOverviewPageSize = useAnalysisStore(state => state.addressOverviewPageSize)
  const getAddressOverview = useAnalysisStore(state => state.getAddressOverview)
  const setAddressOverviewPage = useAnalysisStore(state => state.setAddressOverviewPage)

  const resetConsumptionDetail = useCustomerStore(state => state.resetConsumptionDetail)

  const [detailVisible, setDetailVisible] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)

  const fetchData = (page: number = addressOverviewPage) => {
    const fieldKey = sortField
    const order = sortOrder
    const sortFieldMap = {
      orderCount: 'totalOrderCount',
      totalAmount: 'totalRevenue',
      averageOrderAmount: 'averageOrderAmount',
      totalRefundAmount: 'totalRefundAmount'
    } as const
    getAddressOverview({
      startDate,
      endDate,
      page,
      pageSize: addressOverviewPageSize,
      addressName,
      sortField: sortFieldMap[fieldKey],
      sortOrder: order
    })
  }

  // 拉取地址概况（支持时间范围/搜索/排序）
  useEffect(() => {
    fetchData(1)
  }, [startDate, endDate, sortField, sortOrder, addressName])

  const openDetail = (id: string) => {
    setCurrentId(id)
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
          name="addressOverviewSearchForm"
          autoComplete="off"
        >
          <Row gutter={[16, 8]}>
            <Col
              xs={24}
              md={12}
              lg={8}
            >
              <Form.Item
                label="地址名称"
                name="addressName"
                className="!mb-1"
              >
                <Input
                  placeholder="请输入地址名称"
                  allowClear
                  onPressEnter={() => setAddressName(form.getFieldValue('addressName') || '')}
                  onClear={() => setAddressName('')}
                />
              </Form.Item>
            </Col>
          </Row>
          <SearchToolbar
            sortFieldOptions={[
              { label: '总消费额', value: 'totalAmount' },
              { label: '订单量', value: 'orderCount' },
              { label: '平均单价', value: 'averageOrderAmount' },
              { label: '退款金额', value: 'totalRefundAmount' }
            ]}
            sortFieldValue={sortField}
            onSortFieldChange={v => setSortField(v as typeof sortField)}
            sortOrderValue={sortOrder}
            onSortOrderChange={v => setSortOrder(v)}
            onSearch={() => setAddressName(form.getFieldValue('addressName') || '')}
            onReset={() => {
              form.setFieldsValue({ addressName: '' })
              setAddressName('')
            }}
            searchLoading={addressOverviewLoading}
            totalCount={addressOverviewTotal}
            countLabel="个地址"
          />
        </Form>
      </Card>

      <section className="box-border flex w-full items-center justify-between">
        <List
          className="w-full"
          itemLayout="horizontal"
          loading={addressOverviewLoading}
          pagination={{
            position: 'bottom',
            align: 'end',
            total: addressOverviewTotal,
            current: addressOverviewPage,
            pageSize: addressOverviewPageSize,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (page, pageSize) => {
              setAddressOverviewPage(page)
              const fieldKey = sortField
              const sortFieldMap = {
                orderCount: 'totalOrderCount',
                totalAmount: 'totalRevenue',
                averageOrderAmount: 'averageOrderAmount',
                totalRefundAmount: 'totalRefundAmount'
              } as const
              getAddressOverview({
                startDate,
                endDate,
                page,
                pageSize,
                addressName,
                sortField: sortFieldMap[fieldKey],
                sortOrder
              })
            }
          }}
          dataSource={addressOverviewList}
          renderItem={item => (
            <List.Item>
              {/* 自定义容器：左侧信息 + 右侧操作，避免溢出导致响应式混乱 */}
              <div className="flex w-full flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
                {/* 左侧信息区：可伸展，溢出隐藏，md起自动换行 */}
                <div className="min-w-0 flex-1 overflow-hidden pr-0 md:pr-4">
                  {/* 标题：地址名称，小屏单行省略，md起允许换行 */}
                  <div className="mb-1">
                    <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-lg font-medium md:overflow-visible md:whitespace-normal md:break-all">
                      {item.addressName}
                    </span>
                  </div>
                  {/* 统计信息：网格布局，保证不撑坏容器 */}
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">总消费额</span>
                      <span className="text-lg font-bold text-blue-400">
                        ¥{item.totalRevenue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">订单量</span>
                      <span className="text-lg font-bold text-blue-600">
                        {item.totalOrderCount}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">平均单价</span>
                      <span className="text-lg font-bold text-blue-400">
                        ¥{item.averageOrderAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">退款金额</span>
                      <span className="text-lg font-bold text-orange-600">
                        ¥{item.totalRefundAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 右侧操作区：不收缩，允许换行；窄屏下按钮自然换行 */}
                <div className="flex shrink-0 flex-row flex-wrap items-center justify-start gap-2 md:justify-end md:gap-3">
                  <Button
                    color="default"
                    variant="outlined"
                    onClick={() => openDetail(item.addressId)}
                  >
                    查看数据
                  </Button>
                </div>
              </div>
            </List.Item>
          )}
        />
      </section>

      {currentId && (
        <ConsumptionDetailStatsModal
          visible={detailVisible}
          onClose={closeDetail}
          id={currentId}
          type="address"
          startDate={startDate}
          endDate={endDate}
        />
      )}
    </>
  )
}

export default AddressOverview
