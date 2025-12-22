import { Button, Card, Col, Form, Input, List, Popconfirm, Row } from 'antd'
import type {
  ProductOverviewDetailParams,
  ProductTypeListItem,
  SortOrder
} from 'fresh-shop-backend/types/dto'
import { useEffect, useState } from 'react'

import SearchToolbar from '@/components/SearchToolbar'
import useProductTypeStore from '@/stores/productTypeStore.ts'

import ProductDetailModal from '../Analysis/components/ProductOverview/components/ProductDetailModal'
import Modify from './Modify.tsx'

export const Component = () => {
  const [visible, setVisible] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [form] = Form.useForm()

  // 商品分类详情模态框状态
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailParams, setDetailParams] = useState<ProductOverviewDetailParams | undefined>()

  const listLoading = useProductTypeStore(state => state.listLoading)
  const productTypesList = useProductTypeStore(state => state.productTypesList)
  const listCount = useProductTypeStore(state => state.listCount)
  const pageParams = useProductTypeStore(state => state.pageParams)
  const setPageParams = useProductTypeStore(state => state.setPageParams)
  const deleteProductType = useProductTypeStore(state => state.deleteProductType)
  const deleteLoading = useProductTypeStore(state => state.deleteLoading)

  useEffect(() => {
    pageChange()
    form.setFieldsValue(pageParams)
  }, [])

  const pageChange = (page: number = pageParams.page) => {
    setPageParams({
      page
    })
  }

  // 搜索功能
  const handleSearch = () => {
    form
      .validateFields()
      .then(async val => {
        setPageParams({
          page: 1,
          ...val
        })
      })
      .catch(err => {
        console.log(err)
      })
  }

  // 重置搜索
  const resetSearch = () => {
    const resetValues = {
      name: ''
    }
    form.setFieldsValue(resetValues)
    setPageParams({
      page: 1,
      ...resetValues
    })
  }

  const handleModify = (id: string) => {
    setCurrentId(id)
    setVisible(true)
  }

  // 处理查看数据（统计详情）
  const handleViewDetail = (item: ProductTypeListItem) => {
    setDetailParams({
      productTypeId: item.id,
      dimension: 'productType'
    })
    setDetailVisible(true)
  }

  // 处理删除商品类型
  const handleDelete = async (id: string) => {
    const success = await deleteProductType({ id })
    if (success) {
      // 删除成功后刷新列表
      pageChange()
    }
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
          name="searchForm"
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
                name="name"
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
          {/* 工具栏区域 */}
          <SearchToolbar
            sortFieldOptions={[
              { label: '添加时间', value: 'createdAt' },
              { label: '订单量', value: 'orderCount' },
              { label: '订单总额', value: 'orderTotalAmount' },
              { label: '商品数量', value: 'productCount' },
              { label: '团购单量', value: 'groupBuyCount' }
            ]}
            sortFieldValue={pageParams.sortField}
            onSortFieldChange={value => {
              setPageParams({
                sortField: value as
                  | 'createdAt'
                  | 'productCount'
                  | 'orderCount'
                  | 'orderTotalAmount'
                  | 'groupBuyCount',
                sortOrder: pageParams.sortOrder,
                page: 1
              })
            }}
            sortOrderValue={pageParams.sortOrder}
            onSortOrderChange={order => {
              setPageParams({
                sortField: pageParams.sortField,
                sortOrder: order as SortOrder,
                page: 1
              })
            }}
            onSearch={handleSearch}
            onReset={resetSearch}
            searchLoading={listLoading}
            totalCount={listCount.totalCount}
            countLabel="个类型"
            noOrderCount={listCount.noOrderCount}
            noOrderLabel="无有效订单"
            onAdd={() => setVisible(true)}
          />
        </Form>
      </Card>

      {/* 商品类型列表 */}
      <section className="box-border flex w-full items-center justify-between">
        <List
          className="w-full"
          itemLayout="horizontal"
          loading={listLoading}
          pagination={{
            position: 'bottom',
            align: 'end',
            total: listCount.totalCount,
            current: pageParams.page,
            pageSize: pageParams.pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (page, pageSize) => {
              setPageParams({ page, pageSize })
            }
          }}
          dataSource={productTypesList}
          rowKey="id"
          renderItem={item => (
            <List.Item key={item.id}>
              {/* 自定义容器：左侧信息 + 右侧操作，避免溢出导致响应式混乱 */}
              <div className="flex w-full flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
                {/* 左侧信息区：可伸展，溢出隐藏，md起自动换行 */}
                <div className="min-w-0 flex-1 overflow-hidden pr-0 md:pr-4">
                  {/* 标题：小屏单行省略，md起允许换行 */}
                  <div className="mb-1 max-w-full overflow-hidden text-lg font-medium text-ellipsis whitespace-nowrap md:overflow-visible md:break-all md:whitespace-normal">
                    <Button
                      type="link"
                      style={{
                        padding: 0,
                        height: 'auto',
                        fontSize: 'inherit',
                        fontWeight: 'inherit'
                      }}
                      onClick={() => handleModify(item.id)}
                    >
                      {item.name}
                    </Button>
                  </div>
                  {/* 描述/统计：提供商品数量、订单量与总额，保证不撑坏布局 */}
                  <div className="space-y-1">
                    {item.orderCount !== undefined && (
                      <div className="text-gray-800">
                        订单量：<span className="text-blue-500">{item.orderCount}</span>
                      </div>
                    )}
                    {item.orderTotalAmount !== undefined && (
                      <div className="text-gray-800">
                        订单总额：
                        <span className="text-blue-500">¥{item.orderTotalAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {item.productCount !== undefined && (
                      <div className="text-gray-800">
                        商品数量：<span className="text-blue-500">{item.productCount}</span>
                      </div>
                    )}
                    {item.groupBuyCount !== undefined && (
                      <div className="text-gray-800">
                        团购单量：<span className="text-blue-500">{item.groupBuyCount}</span>
                      </div>
                    )}
                    {item.description && (
                      <div className="max-w-full overflow-hidden break-words text-gray-600 md:break-all">
                        <span className="block overflow-hidden text-ellipsis whitespace-nowrap md:whitespace-normal">
                          {item.description}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 右侧操作区：不收缩，允许换行；窄屏下按钮自然换行 */}
                <div className="flex shrink-0 flex-row flex-wrap items-center justify-start gap-2 md:justify-end md:gap-3">
                  <Button
                    key="detail"
                    color="default"
                    variant="outlined"
                    onClick={() => handleViewDetail(item)}
                  >
                    查看数据
                  </Button>
                  <Button
                    key="edit"
                    color="primary"
                    variant="outlined"
                    onClick={() => handleModify(item.id)}
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    key="delete"
                    title="确定要删除这个商品类型吗？"
                    description="删除后将无法恢复"
                    onConfirm={() => handleDelete(item.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button
                      color="danger"
                      variant="solid"
                      loading={deleteLoading}
                    >
                      删除
                    </Button>
                  </Popconfirm>
                </div>
              </div>
            </List.Item>
          )}
        />
      </section>
      {visible && (
        <Modify
          id={currentId}
          visible={visible}
          setVisible={setVisible}
          setCurrentId={setCurrentId}
        />
      )}
      {detailVisible && (
        <ProductDetailModal
          visible={detailVisible}
          onClose={() => setDetailVisible(false)}
          params={detailParams}
        />
      )}
    </>
  )
}
