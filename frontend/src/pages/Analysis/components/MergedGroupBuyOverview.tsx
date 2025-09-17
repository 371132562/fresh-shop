import { Button, Card, Col, Form, Input, List, Row, Select } from 'antd'
import type {
  MergedGroupBuyOverviewDetailParams,
  MergedGroupBuyOverviewListItem,
  MergedGroupBuyOverviewSortField,
  SortOrder
} from 'fresh-shop-backend/types/dto'
import { useEffect, useState } from 'react'

import SearchToolbar from '@/components/SearchToolbar'
import useAnalysisStore from '@/stores/analysisStore'
import useSupplierStore from '@/stores/supplierStore'
import dayjs from '@/utils/day'
import { getProfitColor } from '@/utils/profitColor'

import MergedGroupBuyDetailModal from './MergedGroupBuyDetailModal'

type MergedGroupBuyOverviewProps = {
  startDate?: Date
  endDate?: Date
  mergeSameName?: boolean
}

/**
 * 团购单（合并）概况组件
 * 显示合并团购单的列表和统计概况信息
 */
export const MergedGroupBuyOverview = ({
  startDate,
  endDate,
  mergeSameName = true
}: MergedGroupBuyOverviewProps) => {
  const [detailVisible, setDetailVisible] = useState(false)
  const [searchParams, setSearchParams] = useState({
    groupBuyName: '',
    supplierIds: [] as string[],
    sortField: 'totalRevenue' as MergedGroupBuyOverviewSortField,
    sortOrder: 'desc' as SortOrder
  })
  const [form] = Form.useForm()

  const mergedGroupBuyOverviewList = useAnalysisStore(state => state.mergedGroupBuyOverviewList)
  const mergedGroupBuyOverviewLoading = useAnalysisStore(
    state => state.mergedGroupBuyOverviewLoading
  )
  const mergedGroupBuyOverviewTotal = useAnalysisStore(state => state.mergedGroupBuyOverviewTotal)
  const mergedGroupBuyOverviewPage = useAnalysisStore(state => state.mergedGroupBuyOverviewPage)
  const mergedGroupBuyOverviewPageSize = useAnalysisStore(
    state => state.mergedGroupBuyOverviewPageSize
  )
  const getMergedGroupBuyOverview = useAnalysisStore(state => state.getMergedGroupBuyOverview)
  const setMergedGroupBuyOverviewPage = useAnalysisStore(
    state => state.setMergedGroupBuyOverviewPage
  )

  // 供货商数据
  const allSupplierList = useSupplierStore(state => state.allSupplierList)
  const getAllSuppliers = useSupplierStore(state => state.getAllSuppliers)
  const getAllSuppliersLoading = useSupplierStore(state => state.getAllSuppliersLoading)

  useEffect(() => {
    // 当日期范围变化时，重新获取数据
    fetchData(1)
  }, [startDate, endDate, mergeSameName])

  useEffect(() => {
    // 获取所有供货商数据
    getAllSuppliers()
  }, [])

  const fetchData = (page: number = mergedGroupBuyOverviewPage) => {
    getMergedGroupBuyOverview({
      startDate,
      endDate,
      page,
      pageSize: mergedGroupBuyOverviewPageSize,
      ...searchParams,
      mergeSameName
    })
  }

  const handlePageChange = (page: number) => {
    setMergedGroupBuyOverviewPage(page)
    fetchData(page)
  }

  const [detailParams, setDetailParams] = useState<MergedGroupBuyOverviewDetailParams | undefined>()

  const handleItemClick = (item: MergedGroupBuyOverviewListItem) => {
    setDetailParams({
      groupBuyName: item.groupBuyName,
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

  // 搜索处理
  const handleSearch = () => {
    form
      .validateFields()
      .then(values => {
        setSearchParams({
          groupBuyName: values.groupBuyName || '',
          supplierIds: values.supplierIds || [],
          sortField: searchParams.sortField,
          sortOrder: searchParams.sortOrder
        })
        setMergedGroupBuyOverviewPage(1)
        getMergedGroupBuyOverview({
          startDate,
          endDate,
          page: 1,
          pageSize: mergedGroupBuyOverviewPageSize,
          groupBuyName: values.groupBuyName || '',
          supplierIds: values.supplierIds || [],
          sortField: searchParams.sortField,
          sortOrder: searchParams.sortOrder,
          mergeSameName
        })
      })
      .catch(err => {
        console.log(err)
      })
  }

  const resetSearch = () => {
    const resetValues = {
      groupBuyName: '',
      supplierIds: []
    }
    form.setFieldsValue(resetValues)
    setSearchParams({
      ...resetValues,
      sortField: 'totalRevenue',
      sortOrder: 'desc'
    })
    setMergedGroupBuyOverviewPage(1)
    getMergedGroupBuyOverview({
      startDate,
      endDate,
      page: 1,
      pageSize: mergedGroupBuyOverviewPageSize,
      groupBuyName: '',
      supplierIds: [],
      sortField: 'totalRevenue',
      sortOrder: 'desc',
      mergeSameName
    })
  }

  const handleSortChange = (value: string) => {
    const [sortField, sortOrder] = value.split('_') as [string, string]
    const newSearchParams = {
      ...searchParams,
      sortField: sortField as MergedGroupBuyOverviewSortField,
      sortOrder: sortOrder as SortOrder
    }
    setSearchParams(newSearchParams)
    setMergedGroupBuyOverviewPage(1)
    getMergedGroupBuyOverview({
      startDate,
      endDate,
      page: 1,
      pageSize: mergedGroupBuyOverviewPageSize,
      ...newSearchParams,
      mergeSameName
    })
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
          name="mergedGbSearchForm"
          autoComplete="off"
        >
          <Row gutter={[16, 8]}>
            <Col
              xs={24}
              md={12}
              lg={8}
            >
              <Form.Item
                label="团购名称"
                name="groupBuyName"
                className="!mb-1"
              >
                <Input
                  placeholder="请输入团购名称"
                  allowClear
                  onPressEnter={handleSearch}
                  onClear={handleSearch}
                />
              </Form.Item>
            </Col>
            <Col
              xs={24}
              md={12}
              lg={8}
            >
              <Form.Item
                label="按供货商搜索(可多选)"
                name="supplierIds"
                className="!mb-1"
              >
                <Select
                  loading={getAllSuppliersLoading}
                  showSearch
                  mode="multiple"
                  allowClear
                  placeholder="请选择供货商"
                  filterOption={(input, option) =>
                    String(option?.children || '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  popupMatchSelectWidth={300}
                >
                  {allSupplierList.map(item => (
                    <Select.Option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <SearchToolbar
            sortOptions={[
              { label: '按总销售额倒序', value: 'totalRevenue_desc' },
              { label: '按总销售额正序', value: 'totalRevenue_asc' },
              { label: '按总利润倒序', value: 'totalProfit_desc' },
              { label: '按总利润正序', value: 'totalProfit_asc' },
              { label: '按利润率倒序', value: 'profitMargin_desc' },
              { label: '按利润率正序', value: 'profitMargin_asc' },
              { label: '按参团客户数倒序', value: 'uniqueCustomerCount_desc' },
              { label: '按参团客户数正序', value: 'uniqueCustomerCount_asc' },
              { label: '按订单量倒序', value: 'totalOrderCount_desc' },
              { label: '按订单量正序', value: 'totalOrderCount_asc' }
            ]}
            sortValue={`${searchParams.sortField}_${searchParams.sortOrder}`}
            onSortChange={handleSortChange}
            onSearch={handleSearch}
            onReset={resetSearch}
            searchLoading={mergedGroupBuyOverviewLoading}
            totalCount={mergedGroupBuyOverviewTotal}
            countLabel="个团购单"
          />
        </Form>
      </Card>

      <section className="box-border flex w-full items-center justify-between">
        <List
          className="w-full"
          itemLayout="horizontal"
          loading={mergedGroupBuyOverviewLoading}
          pagination={{
            position: 'bottom',
            align: 'end',
            total: mergedGroupBuyOverviewTotal,
            current: mergedGroupBuyOverviewPage,
            pageSize: mergedGroupBuyOverviewPageSize,
            onChange: handlePageChange
          }}
          dataSource={mergedGroupBuyOverviewList}
          renderItem={(item: MergedGroupBuyOverviewListItem) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-medium">{item.groupBuyName}</span>
                      <span className="text-sm text-gray-500">({item.supplierName})</span>
                    </div>
                    {!mergeSameName && item.groupBuyStartDate && (
                      <div className="mb-1 text-sm">
                        发起时间：{dayjs(item.groupBuyStartDate).format('YYYY-MM-DD')}
                      </div>
                    )}
                  </div>
                }
                description={
                  <div className="flex items-start justify-between">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">总销售额</span>
                        <span className="text-lg font-semibold text-cyan-600">
                          ¥{item.totalRevenue.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">总利润</span>
                        <span
                          className={`text-lg font-semibold ${getProfitColor(item.totalProfit)}`}
                        >
                          ¥{item.totalProfit.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">参与客户数</span>
                        <span className="text-lg font-semibold text-purple-600">
                          {item.uniqueCustomerCount}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">订单量</span>
                        <span className="text-lg font-semibold text-orange-600">
                          {item.totalOrderCount}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="primary"
                      ghost
                      onClick={() => handleItemClick(item)}
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

      {/* 详情模态框 */}
      <MergedGroupBuyDetailModal
        visible={detailVisible}
        onClose={handleDetailClose}
        params={detailParams}
      />
    </>
  )
}
