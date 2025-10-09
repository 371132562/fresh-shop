import { Button, Card, Col, Form, Input, List, Row, Select, Tag } from 'antd'
import type {
  ProductOverviewDetailParams,
  ProductOverviewListItem,
  ProductOverviewSortField,
  SortOrder
} from 'fresh-shop-backend/types/dto'
import { useEffect, useState } from 'react'

import SearchToolbar from '@/components/SearchToolbar'
import useAnalysisStore from '@/stores/analysisStore'
import useGlobalSettingStore from '@/stores/globalSettingStore'
import useProductTypeStore from '@/stores/productTypeStore'
import { getProfitColor, getProfitMarginColor } from '@/utils/profitColor'

import ProductDetailModal from './components/ProductDetailModal'

type ProductOverviewProps = {
  startDate?: Date
  endDate?: Date
}

/**
 * 商品概况组件
 * 显示商品维度的列表和统计概况信息
 */
export const ProductOverview = ({ startDate, endDate }: ProductOverviewProps) => {
  const globalSetting = useGlobalSettingStore(state => state.globalSetting)
  const productTypeList = useProductTypeStore(state => state.productTypesList)
  const getProductTypeList = useProductTypeStore(state => state.getProductTypeList)
  const [detailVisible, setDetailVisible] = useState(false)
  const [searchParams, setSearchParams] = useState({
    productName: '',
    productTypeIds: [] as string[],
    sortField: 'totalRevenue' as ProductOverviewSortField,
    sortOrder: 'desc' as SortOrder
  })
  const [form] = Form.useForm()

  const productOverviewList = useAnalysisStore(state => state.productOverviewList)
  const productOverviewLoading = useAnalysisStore(state => state.productOverviewLoading)
  const productOverviewTotal = useAnalysisStore(state => state.productOverviewTotal)
  const productOverviewPage = useAnalysisStore(state => state.productOverviewPage)
  const productOverviewPageSize = useAnalysisStore(state => state.productOverviewPageSize)
  const getProductOverview = useAnalysisStore(state => state.getProductOverview)
  const setProductOverviewPage = useAnalysisStore(state => state.setProductOverviewPage)

  const [detailParams, setDetailParams] = useState<ProductOverviewDetailParams | undefined>()

  useEffect(() => {
    // 当日期范围变化时，重新获取数据
    fetchData(1)
  }, [startDate, endDate])

  useEffect(() => {
    // 获取商品类型列表
    getProductTypeList({ page: 1, pageSize: 1000 })
  }, [])

  const fetchData = (page: number = productOverviewPage) => {
    getProductOverview({
      startDate,
      endDate,
      page,
      pageSize: productOverviewPageSize,
      ...searchParams
    })
  }

  const handlePageChange = (page: number) => {
    setProductOverviewPage(page)
    fetchData(page)
  }

  // 搜索处理
  const handleSearch = () => {
    form
      .validateFields()
      .then(values => {
        setSearchParams({
          productName: values.productName || '',
          productTypeIds: values.productTypeIds || [],
          sortField: searchParams.sortField,
          sortOrder: searchParams.sortOrder
        })
        setProductOverviewPage(1)
        getProductOverview({
          startDate,
          endDate,
          page: 1,
          pageSize: productOverviewPageSize,
          productName: values.productName || '',
          productTypeIds: values.productTypeIds || [],
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
      productName: '',
      productTypeIds: []
    }
    form.setFieldsValue(resetValues)
    setSearchParams({
      ...resetValues,
      sortField: 'totalRevenue',
      sortOrder: 'desc'
    })
    setProductOverviewPage(1)
    getProductOverview({
      startDate,
      endDate,
      page: 1,
      pageSize: productOverviewPageSize,
      productName: '',
      productTypeIds: [],
      sortField: 'totalRevenue',
      sortOrder: 'desc'
    })
  }

  const handleSortChange = (value: string) => {
    const [sortField, sortOrder] = value.split('_') as [string, string]
    const newSearchParams = {
      ...searchParams,
      sortField: sortField as ProductOverviewSortField,
      sortOrder: sortOrder as SortOrder
    }
    setSearchParams(newSearchParams)
    setProductOverviewPage(1)
    getProductOverview({
      startDate,
      endDate,
      page: 1,
      pageSize: productOverviewPageSize,
      ...newSearchParams
    })
  }

  const handleItemClick = (item: ProductOverviewListItem) => {
    setDetailParams({
      productId: item.productId,
      dimension: 'product',
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
          name="productSearchForm"
          autoComplete="off"
        >
          <Row gutter={[16, 8]}>
            <Col
              xs={24}
              md={12}
              lg={8}
            >
              <Form.Item
                label="商品名称"
                name="productName"
                className="!mb-1"
              >
                <Input
                  placeholder="请输入商品名称"
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
                label="商品类型"
                name="productTypeIds"
                className="!mb-1"
              >
                <Select
                  mode="multiple"
                  placeholder="请选择商品类型"
                  allowClear
                  style={{ width: '100%' }}
                  onChange={handleSearch}
                  onClear={handleSearch}
                  options={productTypeList.map((type: { id: string; name: string }) => ({
                    label: type.name,
                    value: type.id
                  }))}
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
              { label: '参团客户量', value: 'uniqueCustomerCount' }
            ]}
            sortFieldValue={searchParams.sortField}
            onSortFieldChange={value => handleSortChange(`${value}_${searchParams.sortOrder}`)}
            sortOrderValue={searchParams.sortOrder}
            onSortOrderChange={order => handleSortChange(`${searchParams.sortField}_${order}`)}
            onSearch={handleSearch}
            onReset={resetSearch}
            searchLoading={productOverviewLoading}
            totalCount={productOverviewTotal}
            countLabel="个商品"
          />
        </Form>
      </Card>

      <section className="box-border flex w-full items-center justify-between">
        <List
          className="w-full"
          itemLayout="horizontal"
          loading={productOverviewLoading}
          pagination={{
            position: 'bottom',
            align: 'end',
            total: productOverviewTotal,
            current: productOverviewPage,
            pageSize: productOverviewPageSize,
            onChange: handlePageChange
          }}
          dataSource={productOverviewList}
          renderItem={(item: ProductOverviewListItem) => (
            <List.Item>
              {/* 自定义容器：左侧信息 + 右侧操作，避免溢出导致响应式混乱 */}
              <div className="flex w-full flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
                {/* 左侧信息区：可伸展，溢出隐藏，md起自动换行 */}
                <div className="min-w-0 flex-1 overflow-hidden pr-0 md:pr-4">
                  {/* 标题：商品名称与类型标签同行，名称小屏单行省略，md起换行 */}
                  <div className="mb-1">
                    <div className="flex min-w-0 flex-row flex-wrap items-center gap-2">
                      <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-lg font-medium md:overflow-visible md:whitespace-normal md:break-all">
                        {item.productName}
                      </span>
                      {item.productTypeName && (
                        <span className="shrink-0">
                          <Tag color="#55acee">{item.productTypeName}</Tag>
                        </span>
                      )}
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
