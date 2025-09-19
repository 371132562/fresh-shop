import { Button, Card, Col, Form, Input, List, Row } from 'antd'
import type {
  SortOrder,
  SupplierOverviewDetailParams,
  SupplierOverviewListItem,
  SupplierOverviewSortField
} from 'fresh-shop-backend/types/dto'
import { useEffect, useState } from 'react'

import SearchToolbar from '@/components/SearchToolbar'
import useAnalysisStore from '@/stores/analysisStore'
import useGlobalSettingStore from '@/stores/globalSettingStore'
import { getProfitColor, getProfitMarginColor } from '@/utils/profitColor'

import SupplierDetailModal from './SupplierDetailModal'

type SupplierOverviewProps = {
  startDate?: Date
  endDate?: Date
}

/**
 * 供货商概况组件
 * 显示供货商维度的列表和统计概况信息
 */
export const SupplierOverview = ({ startDate, endDate }: SupplierOverviewProps) => {
  const globalSetting = useGlobalSettingStore(state => state.globalSetting)
  const [detailVisible, setDetailVisible] = useState(false)
  const [searchParams, setSearchParams] = useState({
    supplierName: '',
    sortField: 'totalRevenue' as SupplierOverviewSortField,
    sortOrder: 'desc' as SortOrder
  })
  const [form] = Form.useForm()

  const supplierOverviewList = useAnalysisStore(state => state.supplierOverviewList)
  const supplierOverviewLoading = useAnalysisStore(state => state.supplierOverviewLoading)
  const supplierOverviewTotal = useAnalysisStore(state => state.supplierOverviewTotal)
  const supplierOverviewPage = useAnalysisStore(state => state.supplierOverviewPage)
  const supplierOverviewPageSize = useAnalysisStore(state => state.supplierOverviewPageSize)
  const getSupplierOverview = useAnalysisStore(state => state.getSupplierOverview)
  const setSupplierOverviewPage = useAnalysisStore(state => state.setSupplierOverviewPage)

  const [detailParams, setDetailParams] = useState<SupplierOverviewDetailParams | undefined>()

  useEffect(() => {
    // 当日期范围变化时，重新获取数据
    fetchData(1)
  }, [startDate, endDate])

  const fetchData = (page: number = supplierOverviewPage) => {
    getSupplierOverview({
      startDate,
      endDate,
      page,
      pageSize: supplierOverviewPageSize,
      ...searchParams
    })
  }

  const handlePageChange = (page: number) => {
    setSupplierOverviewPage(page)
    fetchData(page)
  }

  // 搜索处理
  const handleSearch = () => {
    form
      .validateFields()
      .then(values => {
        setSearchParams({
          supplierName: values.supplierName || '',
          sortField: searchParams.sortField,
          sortOrder: searchParams.sortOrder
        })
        setSupplierOverviewPage(1)
        getSupplierOverview({
          startDate,
          endDate,
          page: 1,
          pageSize: supplierOverviewPageSize,
          supplierName: values.supplierName || '',
          sortField: searchParams.sortField,
          sortOrder: searchParams.sortOrder
        })
      })
      .catch(err => {
        console.log(err)
      })
  }

  const resetSearch = () => {
    const resetValues = {
      supplierName: ''
    }
    form.setFieldsValue(resetValues)
    setSearchParams({
      ...resetValues,
      sortField: 'totalRevenue',
      sortOrder: 'desc'
    })
    setSupplierOverviewPage(1)
    getSupplierOverview({
      startDate,
      endDate,
      page: 1,
      pageSize: supplierOverviewPageSize,
      supplierName: '',
      sortField: 'totalRevenue',
      sortOrder: 'desc'
    })
  }

  const handleSortChange = (value: string) => {
    const [sortField, sortOrder] = value.split('_') as [string, string]
    const newSearchParams = {
      ...searchParams,
      sortField: sortField as SupplierOverviewSortField,
      sortOrder: sortOrder as SortOrder
    }
    setSearchParams(newSearchParams)
    setSupplierOverviewPage(1)
    getSupplierOverview({
      startDate,
      endDate,
      page: 1,
      pageSize: supplierOverviewPageSize,
      ...newSearchParams
    })
  }

  const handleItemClick = (item: SupplierOverviewListItem) => {
    setDetailParams({
      supplierId: item.supplierId,
      startDate,
      endDate
    })
    setDetailVisible(true)
  }

  const handleDetailClose = () => {
    setDetailVisible(false)
    setDetailParams(undefined)
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
          name="supplierSearchForm"
          autoComplete="off"
        >
          <Row gutter={[16, 8]}>
            <Col
              xs={24}
              md={12}
              lg={8}
            >
              <Form.Item
                label="供货商名称"
                name="supplierName"
                className="!mb-1"
              >
                <Input
                  placeholder="请输入供货商名称"
                  allowClear
                  onPressEnter={handleSearch}
                  onClear={handleSearch}
                />
              </Form.Item>
            </Col>
          </Row>
          <SearchToolbar
            sortOptions={[
              { label: '按总销售额倒序', value: 'totalRevenue_desc' },
              { label: '按总销售额正序', value: 'totalRevenue_asc' },
              { label: '按总利润倒序', value: 'totalProfit_desc' },
              { label: '按总利润正序', value: 'totalProfit_asc' },
              { label: '按平均利润率倒序', value: 'averageProfitMargin_desc' },
              { label: '按平均利润率正序', value: 'averageProfitMargin_asc' },
              { label: '按团购单量倒序', value: 'totalGroupBuyCount_desc' },
              { label: '按团购单量正序', value: 'totalGroupBuyCount_asc' },
              { label: '按订单量倒序', value: 'totalOrderCount_desc' },
              { label: '按订单量正序', value: 'totalOrderCount_asc' },
              { label: '按退款金额倒序', value: 'totalRefundAmount_desc' },
              { label: '按退款金额正序', value: 'totalRefundAmount_asc' },
              { label: '按参团客户量倒序', value: 'uniqueCustomerCount_desc' },
              { label: '按参团客户量正序', value: 'uniqueCustomerCount_asc' }
            ]}
            sortValue={`${searchParams.sortField}_${searchParams.sortOrder}`}
            onSortChange={handleSortChange}
            onSearch={handleSearch}
            onReset={resetSearch}
            searchLoading={supplierOverviewLoading}
            totalCount={supplierOverviewTotal}
            countLabel="个供货商"
          />
        </Form>
      </Card>

      <section className="box-border flex w-full items-center justify-between">
        <List
          className="w-full"
          itemLayout="horizontal"
          loading={supplierOverviewLoading}
          pagination={{
            position: 'bottom',
            align: 'end',
            total: supplierOverviewTotal,
            current: supplierOverviewPage,
            pageSize: supplierOverviewPageSize,
            onChange: handlePageChange
          }}
          dataSource={supplierOverviewList}
          renderItem={(item: SupplierOverviewListItem) => (
            <List.Item>
              {/* 自定义容器：左侧信息 + 右侧操作，避免溢出导致响应式混乱 */}
              <div className="flex w-full flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
                {/* 左侧信息区：可伸展，溢出隐藏，md起自动换行 */}
                <div className="min-w-0 flex-1 overflow-hidden pr-0 md:pr-4">
                  {/* 标题：供货商名称，小屏单行省略，md起允许换行 */}
                  <div className="mb-1">
                    <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-lg font-medium md:overflow-visible md:whitespace-normal md:break-all">
                      {item.supplierName}
                    </span>
                  </div>
                  {/* 统计信息：网格布局，保证不撑坏容器 */}
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">总销售额</span>
                      <span className="text-lg font-semibold text-cyan-600">
                        ¥{item.totalRevenue.toFixed(2)}
                      </span>
                    </div>
                    {!globalSetting?.value?.sensitive && (
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">总利润</span>
                        <span
                          className={`text-lg font-semibold ${getProfitColor(item.totalProfit)}`}
                        >
                          ¥{item.totalProfit.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {!globalSetting?.value?.sensitive && (
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">平均利润率</span>
                        <span
                          className={`text-lg font-semibold ${getProfitMarginColor(item.averageProfitMargin)}`}
                        >
                          {item.averageProfitMargin.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">团购单量</span>
                      <span className="text-lg font-bold text-blue-600">
                        {item.totalGroupBuyCount}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">订单量</span>
                      <span className="text-lg font-bold text-blue-600">
                        {item.totalOrderCount}
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
                    onClick={() => handleItemClick(item)}
                  >
                    查看数据
                  </Button>
                </div>
              </div>
            </List.Item>
          )}
        />
      </section>

      {/* 详情模态框 */}
      <SupplierDetailModal
        visible={detailVisible}
        onClose={handleDetailClose}
        params={detailParams}
      />
    </>
  )
}
