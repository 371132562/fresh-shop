import { Button, Card, Col, Form, Input, List, Row, Tag } from 'antd'
import type {
  ProductOverviewDetailParams,
  ProductTypeOverviewListItem,
  ProductTypeOverviewSortField,
  SortOrder
} from 'fresh-shop-backend/types/dto'
import { useEffect, useState } from 'react'

import SearchToolbar from '@/components/SearchToolbar'
import useAnalysisStore from '@/stores/analysisStore'
import useGlobalSettingStore from '@/stores/globalSettingStore'
import { getProfitColor, getProfitMarginColor } from '@/utils/profitColor'

import ProductDetailModal from '../ProductOverview/components/ProductDetailModal'

type ProductTypeOverviewProps = {
  startDate?: Date
  endDate?: Date
}

/**
 * 商品类型概况组件
 * 显示商品类型维度的列表和统计概况信息
 */
export const ProductTypeOverview = ({ startDate, endDate }: ProductTypeOverviewProps) => {
  const globalSetting = useGlobalSettingStore(state => state.globalSetting)
  const [detailVisible, setDetailVisible] = useState(false)
  const [searchParams, setSearchParams] = useState({
    productTypeName: '',
    sortField: 'totalRevenue' as ProductTypeOverviewSortField,
    sortOrder: 'desc' as SortOrder
  })
  const [form] = Form.useForm()

  const productTypeOverviewList = useAnalysisStore(state => state.productTypeOverviewList)
  const productTypeOverviewLoading = useAnalysisStore(state => state.productTypeOverviewLoading)
  const productTypeOverviewTotal = useAnalysisStore(state => state.productTypeOverviewTotal)
  const productTypeOverviewPage = useAnalysisStore(state => state.productTypeOverviewPage)
  const productTypeOverviewPageSize = useAnalysisStore(state => state.productTypeOverviewPageSize)
  const getProductTypeOverview = useAnalysisStore(state => state.getProductTypeOverview)
  const setProductTypeOverviewPage = useAnalysisStore(state => state.setProductTypeOverviewPage)

  const [detailParams, setDetailParams] = useState<ProductOverviewDetailParams | undefined>()

  useEffect(() => {
    // 当日期范围变化时，重新获取数据
    fetchData(1)
  }, [startDate, endDate])

  const fetchData = (page: number = productTypeOverviewPage) => {
    getProductTypeOverview({
      startDate,
      endDate,
      page,
      pageSize: productTypeOverviewPageSize,
      ...searchParams
    })
  }

  // 搜索处理
  const handleSearch = () => {
    form
      .validateFields()
      .then(values => {
        setSearchParams({
          productTypeName: values.productTypeName || '',
          sortField: searchParams.sortField,
          sortOrder: searchParams.sortOrder
        })
        setProductTypeOverviewPage(1)
        getProductTypeOverview({
          startDate,
          endDate,
          page: 1,
          pageSize: productTypeOverviewPageSize,
          productTypeName: values.productTypeName || '',
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
      productTypeName: ''
    }
    form.setFieldsValue(resetValues)
    setSearchParams({
      ...resetValues,
      sortField: 'totalRevenue',
      sortOrder: 'desc'
    })
    setProductTypeOverviewPage(1)
    getProductTypeOverview({
      startDate,
      endDate,
      page: 1,
      pageSize: productTypeOverviewPageSize,
      productTypeName: '',
      sortField: 'totalRevenue',
      sortOrder: 'desc'
    })
  }

  const handleSortChange = (value: string) => {
    const [sortField, sortOrder] = value.split('_') as [string, string]
    const newSearchParams = {
      ...searchParams,
      sortField: sortField as ProductTypeOverviewSortField,
      sortOrder: sortOrder as SortOrder
    }
    setSearchParams(newSearchParams)
    setProductTypeOverviewPage(1)
    getProductTypeOverview({
      startDate,
      endDate,
      page: 1,
      pageSize: productTypeOverviewPageSize,
      ...newSearchParams
    })
  }

  const handleItemClick = (item: ProductTypeOverviewListItem) => {
    setDetailParams({
      productTypeId: item.productTypeId,
      dimension: 'productType',
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
          name="productTypeSearchForm"
          autoComplete="off"
        >
          <Row gutter={[16, 8]}>
            <Col
              xs={24}
              md={12}
              lg={8}
            >
              <Form.Item
                label="商品类型名称"
                name="productTypeName"
                className="!mb-1"
              >
                <Input
                  placeholder="请输入商品类型名称"
                  allowClear
                  onPressEnter={handleSearch}
                  onClear={handleSearch}
                />
              </Form.Item>
            </Col>
          </Row>
          <SearchToolbar
            sortFieldOptions={[
              { label: '销售额', value: 'totalRevenue' },
              { label: '利润', value: 'totalProfit' },
              { label: '利润率', value: 'totalProfitMargin' },
              { label: '团购单量', value: 'totalGroupBuyCount' },
              { label: '订单量', value: 'totalOrderCount' },
              { label: '退款金额', value: 'totalRefundAmount' },
              { label: '参团客户量', value: 'uniqueCustomerCount' },
              { label: '商品数量', value: 'productCount' }
            ]}
            sortFieldValue={searchParams.sortField}
            onSortFieldChange={value => handleSortChange(`${value}_${searchParams.sortOrder}`)}
            sortOrderValue={searchParams.sortOrder}
            onSortOrderChange={order => handleSortChange(`${searchParams.sortField}_${order}`)}
            onSearch={handleSearch}
            onReset={resetSearch}
            searchLoading={productTypeOverviewLoading}
            totalCount={productTypeOverviewTotal}
            countLabel="个商品类型"
          />
        </Form>
      </Card>

      <section className="box-border flex w-full items-center justify-between">
        <List
          className="w-full"
          itemLayout="horizontal"
          loading={productTypeOverviewLoading}
          pagination={{
            position: 'bottom',
            align: 'end',
            total: productTypeOverviewTotal,
            current: productTypeOverviewPage,
            pageSize: productTypeOverviewPageSize,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (page, pageSize) => {
              setProductTypeOverviewPage(page)
              getProductTypeOverview({
                startDate,
                endDate,
                page,
                pageSize,
                ...searchParams
              })
            }
          }}
          dataSource={productTypeOverviewList}
          renderItem={(item: ProductTypeOverviewListItem) => (
            <List.Item>
              {/* 自定义容器：左侧信息 + 右侧操作，避免溢出导致响应式混乱 */}
              <div className="flex w-full flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
                {/* 左侧信息区：可伸展，溢出隐藏，md起自动换行 */}
                <div className="min-w-0 flex-1 overflow-hidden pr-0 md:pr-4">
                  {/* 标题：商品类型名称与商品数量标签同行，名称小屏单行省略，md起换行 */}
                  <div className="mb-1">
                    <div className="flex min-w-0 flex-row flex-wrap items-center gap-2">
                      <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-lg font-medium md:overflow-visible md:whitespace-normal md:break-all">
                        {item.productTypeName}
                      </span>
                      <span className="shrink-0">
                        <Tag color="#55acee">{item.productCount} 个商品</Tag>
                      </span>
                    </div>
                  </div>
                  {/* 统计信息：网格布局，保证不撑坏容器 */}
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">销售额</span>
                      <span className="text-lg font-semibold text-cyan-600">
                        ¥{item.totalRevenue.toFixed(2)}
                      </span>
                    </div>
                    {!globalSetting?.value?.sensitive && (
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">利润</span>
                        <span
                          className={`text-lg font-semibold ${getProfitColor(item.totalProfit)}`}
                        >
                          ¥{item.totalProfit.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {!globalSetting?.value?.sensitive && (
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
      <ProductDetailModal
        visible={detailVisible}
        onClose={handleDetailClose}
        params={detailParams}
      />
    </>
  )
}
