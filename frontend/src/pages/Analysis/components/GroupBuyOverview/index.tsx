import { DotChartOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { Button, Card, Col, Form, Input, List, Pagination, Row } from 'antd'
import type {
  MergedGroupBuyOverviewDetailParams,
  MergedGroupBuyOverviewListItem,
  MergedGroupBuyOverviewSortField,
  SortOrder
} from 'fresh-shop-backend/types/dto'
import { type ReactNode, useEffect, useState } from 'react'
import { NavLink } from 'react-router'

import SearchToolbar from '@/components/SearchToolbar'
import SupplierSelector from '@/components/SupplierSelector'
import useAnalysisStore from '@/stores/analysisStore'
import useGlobalSettingStore from '@/stores/globalSettingStore'
import useSupplierStore from '@/stores/supplierStore'
import dayjs from '@/utils/day'
import { getProfitColor, getProfitMarginColor } from '@/utils/profitColor'

import GroupBuyProfitMatrix from './components/GroupBuyProfitMatrix'
import MergedGroupBuyDetailModal from './components/MergedGroupBuyDetailModal'

type MergedGroupBuyOverviewProps = {
  startDate?: Date
  endDate?: Date
  mergeSameName?: boolean
}

type ViewMode = 'list' | 'matrix'

const viewModeOptions: Array<{
  value: ViewMode
  title: string
  description: string
  icon: ReactNode
}> = [
  {
    value: 'list',
    title: '列表视图',
    description: '适合搜索、排序和逐条查看团购表现',
    icon: <UnorderedListOutlined />
  },
  {
    value: 'matrix',
    title: '盈利矩阵',
    description: '适合按销售额、利润率和订单量做批量比较',
    icon: <DotChartOutlined />
  }
]

/**
 * 团购单（合并）概况组件。
 * 保留现有列表查找能力，同时新增适合批量比较的盈利矩阵视图。
 */
export const MergedGroupBuyOverview = ({
  startDate,
  endDate,
  mergeSameName = true
}: MergedGroupBuyOverviewProps) => {
  const globalSetting = useGlobalSettingStore(state => state.globalSetting)
  const sensitive = globalSetting?.value?.sensitive
  const [detailVisible, setDetailVisible] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
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
  const mergedGroupBuyOverviewMatrixList = useAnalysisStore(
    state => state.mergedGroupBuyOverviewMatrixList
  )
  const mergedGroupBuyOverviewMatrixLoading = useAnalysisStore(
    state => state.mergedGroupBuyOverviewMatrixLoading
  )
  const mergedGroupBuyOverviewTotal = useAnalysisStore(state => state.mergedGroupBuyOverviewTotal)
  const mergedGroupBuyOverviewPage = useAnalysisStore(state => state.mergedGroupBuyOverviewPage)
  const mergedGroupBuyOverviewPageSize = useAnalysisStore(
    state => state.mergedGroupBuyOverviewPageSize
  )
  const getMergedGroupBuyOverview = useAnalysisStore(state => state.getMergedGroupBuyOverview)
  const getMergedGroupBuyOverviewMatrix = useAnalysisStore(
    state => state.getMergedGroupBuyOverviewMatrix
  )
  const setMergedGroupBuyOverviewPage = useAnalysisStore(
    state => state.setMergedGroupBuyOverviewPage
  )
  const getAllSuppliers = useSupplierStore(state => state.getAllSuppliers)

  const currentViewMode = sensitive ? 'list' : viewMode
  const effectiveSortField =
    sensitive && ['totalProfit', 'profitMargin'].includes(searchParams.sortField)
      ? 'totalRevenue'
      : searchParams.sortField

  const buildOverviewQuery = (
    page: number = mergedGroupBuyOverviewPage,
    pageSize = mergedGroupBuyOverviewPageSize
  ) => ({
    startDate,
    endDate,
    page,
    pageSize,
    ...searchParams,
    sortField: effectiveSortField,
    mergeSameName
  })

  const fetchData = (
    page: number = mergedGroupBuyOverviewPage,
    pageSize = mergedGroupBuyOverviewPageSize
  ) => {
    getMergedGroupBuyOverview(buildOverviewQuery(page, pageSize))
  }

  const fetchMatrixData = () => {
    if (sensitive) {
      return
    }

    getMergedGroupBuyOverviewMatrix(buildOverviewQuery(1, mergedGroupBuyOverviewPageSize))
  }

  useEffect(() => {
    fetchData(1)
  }, [mergeSameName, startDate, endDate, sensitive])

  useEffect(() => {
    getAllSuppliers()
  }, [getAllSuppliers])

  useEffect(() => {
    if (currentViewMode === 'matrix') {
      fetchMatrixData()
    }
  }, [currentViewMode, mergeSameName, startDate, endDate, sensitive])

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

  const handleSearch = () => {
    form
      .validateFields()
      .then(values => {
        const nextSearchParams = {
          groupBuyName: values.groupBuyName || '',
          supplierIds: values.supplierIds || [],
          sortField: effectiveSortField as MergedGroupBuyOverviewSortField,
          sortOrder: searchParams.sortOrder
        }

        setSearchParams(nextSearchParams)
        setMergedGroupBuyOverviewPage(1)
        getMergedGroupBuyOverview({
          ...buildOverviewQuery(1, mergedGroupBuyOverviewPageSize),
          ...nextSearchParams
        })
        if (!sensitive && currentViewMode === 'matrix') {
          getMergedGroupBuyOverviewMatrix({
            ...buildOverviewQuery(1, mergedGroupBuyOverviewPageSize),
            ...nextSearchParams
          })
        }
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
    const resetQuery = {
      ...buildOverviewQuery(1, mergedGroupBuyOverviewPageSize),
      groupBuyName: '',
      supplierIds: [],
      sortField: 'totalRevenue' as MergedGroupBuyOverviewSortField,
      sortOrder: 'desc' as SortOrder
    }
    getMergedGroupBuyOverview(resetQuery)
    if (!sensitive && currentViewMode === 'matrix') {
      getMergedGroupBuyOverviewMatrix({
        ...resetQuery
      })
    }
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
      ...buildOverviewQuery(1, mergedGroupBuyOverviewPageSize),
      ...newSearchParams
    })
    if (!sensitive && currentViewMode === 'matrix') {
      getMergedGroupBuyOverviewMatrix({
        ...buildOverviewQuery(1, mergedGroupBuyOverviewPageSize),
        ...newSearchParams
      })
    }
  }

  return (
    <>
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
                <SupplierSelector
                  mode="multiple"
                  allowClear
                  placeholder="请选择供货商"
                  onChange={handleSearch}
                  onClear={handleSearch}
                  popupMatchSelectWidth={300}
                />
              </Form.Item>
            </Col>
          </Row>

          <SearchToolbar
            sortFieldOptions={[
              ...(mergeSameName
                ? []
                : ([{ label: '发起时间', value: 'groupBuyStartDate' }] as const)),
              { label: '销售额', value: 'totalRevenue' },
              ...(!sensitive ? [{ label: '利润', value: 'totalProfit' }] : []),
              ...(!sensitive ? [{ label: '利润率', value: 'profitMargin' }] : []),
              { label: '订单量', value: 'totalOrderCount' },
              { label: '参团客户数', value: 'uniqueCustomerCount' },
              { label: '退款金额', value: 'totalRefundAmount' }
            ]}
            sortFieldValue={effectiveSortField}
            onSortFieldChange={value => handleSortChange(`${value}_${searchParams.sortOrder}`)}
            sortOrderValue={searchParams.sortOrder}
            onSortOrderChange={order => handleSortChange(`${effectiveSortField}_${order}`)}
            onSearch={handleSearch}
            onReset={resetSearch}
            searchLoading={mergedGroupBuyOverviewLoading}
            totalCount={mergedGroupBuyOverviewTotal}
            countLabel="个团购单"
          />

          {!sensitive && (
            <div className="mt-3 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-3">
              <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-800">查看方式</div>
                  <div className="text-sm text-gray-500">
                    列表适合精读，矩阵适合批量比较；当前切换不改变搜索条件。
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {currentViewMode === 'matrix' ? '当前：盈利矩阵视图' : '当前：列表视图'}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {viewModeOptions.map(option => {
                  const active = currentViewMode === option.value

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setViewMode(option.value)}
                      className={`w-full rounded-xl border p-4 text-left transition-all ${
                        active
                          ? 'border-blue-500 bg-white shadow-md ring-2 ring-blue-100'
                          : 'border-white/70 bg-white/70 hover:border-blue-200 hover:bg-white hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${
                              active ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-500'
                            }`}
                          >
                            {option.icon}
                          </div>
                          <div>
                            <div className="text-base font-semibold text-gray-800">
                              {option.title}
                            </div>
                            <div className="mt-1 text-sm text-gray-500">{option.description}</div>
                          </div>
                        </div>
                        <div
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            active ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {active ? '当前使用' : '点击切换'}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </Form>
      </Card>

      {currentViewMode === 'matrix' ? (
        <div className="mt-4 !space-y-4">
          <GroupBuyProfitMatrix
            items={mergedGroupBuyOverviewMatrixList}
            loading={mergedGroupBuyOverviewMatrixLoading}
            onItemClick={handleItemClick}
            mergeSameName={mergeSameName}
          />
        </div>
      ) : (
        <div className="mt-4 !space-y-4">
          <section className="box-border flex w-full items-center justify-between">
            <List
              className="w-full"
              itemLayout="horizontal"
              loading={mergedGroupBuyOverviewLoading}
              dataSource={mergedGroupBuyOverviewList}
              renderItem={(item: MergedGroupBuyOverviewListItem) => (
                <List.Item>
                  <div className="flex w-full flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
                    <div className="min-w-0 flex-1 overflow-hidden pr-0 md:pr-4">
                      <div className="mb-1">
                        <div className="flex min-w-0 flex-row flex-wrap items-center gap-2">
                          {!mergeSameName && item.groupBuyId ? (
                            <NavLink
                              to={`/groupBuy/detail/${item.groupBuyId}`}
                              target="_blank"
                              className="block max-w-full overflow-hidden text-lg font-medium text-ellipsis whitespace-nowrap text-blue-600 hover:text-blue-800 hover:underline md:overflow-visible md:break-all md:whitespace-normal"
                            >
                              {item.groupBuyName}
                            </NavLink>
                          ) : (
                            <span className="block max-w-full overflow-hidden text-lg font-medium text-ellipsis whitespace-nowrap md:overflow-visible md:break-all md:whitespace-normal">
                              {item.groupBuyName}
                            </span>
                          )}
                          <span className="shrink-0 text-sm text-gray-500">
                            ({item.supplierName})
                          </span>
                        </div>
                        {!mergeSameName && item.groupBuyStartDate && (
                          <div className="mt-1 text-sm text-gray-600">
                            发起时间：
                            <span className="text-blue-600">
                              {dayjs(item.groupBuyStartDate).format('YYYY-MM-DD')}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500">销售额</span>
                          <span className="text-lg font-semibold text-cyan-600">
                            ¥{item.totalRevenue.toFixed(2)}
                          </span>
                        </div>

                        {!sensitive && (
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-500">利润</span>
                            <span
                              className={`text-lg font-semibold ${getProfitColor(item.totalProfit)}`}
                            >
                              ¥{item.totalProfit.toFixed(2)}
                            </span>
                          </div>
                        )}

                        {!sensitive && (
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-500">利润率</span>
                            <span
                              className={`text-lg font-semibold ${getProfitMarginColor(item.totalProfitMargin)}`}
                            >
                              {item.totalProfitMargin.toFixed(1)}%
                            </span>
                          </div>
                        )}

                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500">订单量</span>
                          <span className="text-lg font-bold text-blue-600">
                            {item.totalOrderCount}
                          </span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500">参与客户数</span>
                          <span className="text-lg font-bold text-blue-600">
                            {item.uniqueCustomerCount}
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
          <div className="flex justify-end">
            <Pagination
              current={mergedGroupBuyOverviewPage}
              pageSize={mergedGroupBuyOverviewPageSize}
              total={mergedGroupBuyOverviewTotal}
              showSizeChanger
              pageSizeOptions={['10', '20', '50']}
              onChange={(page, pageSize) => {
                setMergedGroupBuyOverviewPage(page)
                fetchData(page, pageSize)
              }}
            />
          </div>
        </div>
      )}

      <MergedGroupBuyDetailModal
        visible={detailVisible}
        onClose={handleDetailClose}
        params={detailParams}
      />
    </>
  )
}
