import { Button, Card, Col, DatePicker, Form, Input, List, Row, Select, Tag } from 'antd'
import {
  GroupBuyListItem,
  MergedGroupBuyOverviewDetailParams
} from 'fresh-shop-backend/types/dto.ts'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'

import SearchToolbar from '@/components/SearchToolbar'
import MergedGroupBuyDetailModal from '@/pages/Analysis/components/MergedGroupBuyDetailModal'
import useGroupBuyStore from '@/stores/groupBuyStore.ts'
import {
  ExtendedOrderStatusOptions,
  OrderStatus,
  OrderStatusMap,
  OrderStatusOptions
} from '@/stores/orderStore.ts'
import useProductStore from '@/stores/productStore.ts'
import useSupplierStore from '@/stores/supplierStore.ts'
import { formatDate } from '@/utils'
import dayjs from '@/utils/day'

import Modify from './Modify.tsx'
const { RangePicker } = DatePicker

export const Component = () => {
  const [visible, setVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [form] = Form.useForm()

  const listLoading = useGroupBuyStore(state => state.listLoading)
  const groupBuysList = useGroupBuyStore(state => state.groupBuyList)
  const listCount = useGroupBuyStore(state => state.listCount)
  const pageParams = useGroupBuyStore(state => state.pageParams)
  const setPageParams = useGroupBuyStore(state => state.setPageParams)
  const allSupplierList = useSupplierStore(state => state.allSupplierList)
  const getAllSuppliers = useSupplierStore(state => state.getAllSuppliers)
  const getAllSuppliersLoading = useSupplierStore(state => state.getAllSuppliersLoading)
  const allProductsList = useProductStore(state => state.allProductsList)
  const getAllProducts = useProductStore(state => state.getAllProducts)
  const getAllProductsListLoading = useProductStore(state => state.getAllProductsListLoading)

  // 详情模态框相关状态

  useEffect(() => {
    getAllSuppliers()
    getAllProducts()
    pageChange()
    const { name, supplierIds, productIds, startDate, endDate, orderStatuses } = pageParams

    form.setFieldsValue({
      name,
      supplierIds,
      productIds,
      orderStatuses,
      groupBuySearchDate: startDate && endDate ? [dayjs(startDate), dayjs(endDate)] : []
    })
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
        const { name, groupBuySearchDate, supplierIds, productIds, orderStatuses } = val
        setPageParams({
          page: 1,
          name,
          supplierIds,
          productIds,
          orderStatuses: orderStatuses || [], // 订单状态筛选数组
          startDate: groupBuySearchDate?.[0]?.toDate() ?? null,
          endDate: groupBuySearchDate?.[1]?.toDate() ?? null
        })
      })
      .catch(err => {
        console.log(err)
      })
  }

  const [detailParams, setDetailParams] = useState<MergedGroupBuyOverviewDetailParams | undefined>()

  // 处理查看详情
  const handleViewDetail = (item: GroupBuyListItem) => {
    setDetailParams({
      groupBuyName: item.name,
      supplierId: item.supplierId
    })
    setDetailVisible(true)
  }

  // 关闭详情模态框
  const handleDetailCancel = () => {
    setDetailVisible(false)
    setDetailParams(undefined)
  }

  // 重置搜索
  const resetSearch = () => {
    const resetValues = {
      name: '',
      startDate: null,
      endDate: null,
      supplierIds: [],
      productIds: [],
      orderStatuses: [], // 重置订单状态筛选
      groupBuySearchDate: []
    }
    form.setFieldsValue(resetValues)
    setPageParams({
      page: 1,
      ...resetValues
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
          name="searchForm"
          autoComplete="off"
        >
          <Row gutter={[16, 8]}>
            <Col
              xs={24}
              sm={12}
              md={8}
            >
              <Form.Item
                label="团购单名称"
                name="name"
                className="!mb-1"
              >
                <Input
                  placeholder="请输入团购单名称"
                  allowClear
                  onPressEnter={handleSearch}
                  onClear={handleSearch}
                />
              </Form.Item>
            </Col>
            <Col
              xs={24}
              sm={12}
              md={8}
            >
              <Form.Item
                label="供货商"
                name="supplierIds"
                className="!mb-1"
              >
                <Select
                  loading={getAllSuppliersLoading}
                  showSearch
                  mode="multiple"
                  allowClear
                  placeholder="请选择供货商"
                  onChange={handleSearch}
                  onClear={handleSearch}
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
            <Col
              xs={24}
              sm={12}
              md={8}
            >
              <Form.Item
                label="商品"
                name="productIds"
                className="!mb-1"
              >
                <Select
                  loading={getAllProductsListLoading}
                  showSearch
                  mode="multiple"
                  allowClear
                  placeholder="请选择商品"
                  onChange={handleSearch}
                  onClear={handleSearch}
                  filterOption={(input, option) =>
                    String(option?.children || '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  popupMatchSelectWidth={300}
                >
                  {allProductsList.map(item => (
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
            <Col
              xs={24}
              sm={12}
              md={8}
            >
              <Form.Item
                label="订单状态"
                name="orderStatuses"
                className="!mb-1"
              >
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="请选择订单状态"
                  onChange={handleSearch}
                  onClear={handleSearch}
                  popupMatchSelectWidth={300}
                >
                  {(ExtendedOrderStatusOptions || OrderStatusOptions).map(option => (
                    <Select.Option
                      key={option.value}
                      value={option.value}
                    >
                      <Tag color={option.color}>{option.label}</Tag>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col
              xs={24}
              sm={16}
              md={16}
            >
              <Form.Item
                label="发起时间"
                name="groupBuySearchDate"
                className="!mb-1"
              >
                <RangePicker
                  inputReadOnly
                  style={{ width: '100%' }}
                  onChange={handleSearch}
                />
              </Form.Item>
            </Col>
          </Row>
          {/* 工具栏区域 */}
          <SearchToolbar
            onSearch={handleSearch}
            onReset={resetSearch}
            searchLoading={listLoading}
            totalCount={listCount.totalCount}
            countLabel="个团购单"
            onAdd={() => setVisible(true)}
          />
        </Form>
      </Card>

      {/* 团购列表 */}
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
            onChange: page => {
              pageChange(page)
            }
          }}
          dataSource={groupBuysList}
          renderItem={(item: GroupBuyListItem) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <NavLink to={`/groupBuy/detail/${item.id}`}>
                    <Button
                      type="link"
                      style={{ padding: 0 }}
                    >
                      <span className="text-lg">{item.name}</span>
                    </Button>
                  </NavLink>
                }
                description={
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="mb-1 font-medium text-gray-800">
                        发起时间：
                        <span className="text-blue-500">{formatDate(item.groupBuyStartDate)}</span>
                      </div>
                      {item.product?.name && (
                        <div className="mb-1 font-medium text-gray-800">
                          商品：<span className="text-blue-500">{item.product.name}</span>
                        </div>
                      )}
                      {item.partialRefundStats.partialRefundAmount > 0 && (
                        <div className="font-medium text-gray-800">
                          部分退款：
                          <span className="text-orange-600">
                            ¥{item.partialRefundStats.partialRefundAmount.toFixed(2)}
                          </span>
                          <span className="text-blue-500">
                            /¥{item.partialRefundStats.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="my-1 flex items-center font-medium text-gray-800">
                        <Tag className="ml-2">订单数量：{item.orderStats.orderCount}</Tag>
                        {Object.entries(item.orderStats)
                          .filter(([key]) => key !== 'orderCount')
                          .map(([status, count]) => {
                            if (count === 0) return null // 如果数量为0，则不显示
                            const statusInfo = OrderStatusMap[status as OrderStatus]
                            return (
                              <Tag
                                color={statusInfo.color}
                                key={status}
                                className="ml-2"
                              >
                                {statusInfo.label}: {count}
                              </Tag>
                            )
                          })}
                      </div>
                      {item.description && <div className="text-gray-600">{item.description}</div>}
                    </div>
                    <Button
                      type="primary"
                      ghost
                      onClick={() => handleViewDetail(item)}
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
      {visible && (
        <Modify
          visible={visible}
          setVisible={setVisible}
        />
      )}
      <MergedGroupBuyDetailModal
        visible={detailVisible}
        onClose={handleDetailCancel}
        params={detailParams}
      />
    </>
  )
}
