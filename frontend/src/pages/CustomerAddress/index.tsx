import { Button, Card, Col, Form, Input, List, Popconfirm, Row } from 'antd'
import type { CustomerAddressSortField, SortOrder } from 'fresh-shop-backend/types/dto'
import { useEffect, useState } from 'react'

import SearchToolbar from '@/components/SearchToolbar'
import ConsumptionDetailStatsModal from '@/pages/Analysis/components/ConsumptionDetail'
import useCustomerAddressStore from '@/stores/customerAddressStore.ts'
import useCustomerStore from '@/stores/customerStore.ts'

import Modify from './Modify.tsx'

export const Component = () => {
  const [visible, setVisible] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [consumptionDetailVisible, setConsumptionDetailVisible] = useState(false)
  const [form] = Form.useForm()

  const listLoading = useCustomerAddressStore(state => state.listLoading)
  const customerAddressList = useCustomerAddressStore(state => state.customerAddressList)
  const listCount = useCustomerAddressStore(state => state.listCount)
  const pageParams = useCustomerAddressStore(state => state.pageParams)
  const setPageParams = useCustomerAddressStore(state => state.setPageParams)
  const deleteCustomerAddress = useCustomerAddressStore(state => state.deleteCustomerAddress)
  const deleteLoading = useCustomerAddressStore(state => state.deleteLoading)

  // 消费详情相关状态
  const setAddressConsumptionDetail = useCustomerStore(state => state.setAddressConsumptionDetail)

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

  // 处理删除客户地址
  const handleDelete = async (id: string) => {
    const success = await deleteCustomerAddress({ id })
    if (success) {
      // 删除成功后刷新列表
      pageChange()
    }
  }

  // 查看消费详情
  const handleViewConsumptionDetail = async (id: string) => {
    setCurrentId(id)
    setConsumptionDetailVisible(true)
  }

  // 关闭消费详情弹窗
  const handleCloseConsumptionDetail = () => {
    setConsumptionDetailVisible(false)
    setAddressConsumptionDetail(null)
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
                label="地址名称"
                name="name"
                className="!mb-1"
              >
                <Input
                  placeholder="请输入地址名称"
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
              { label: '订单总额', value: 'orderTotalAmount' }
            ]}
            sortFieldValue={pageParams.sortField}
            onSortFieldChange={value => {
              setPageParams({
                sortField: value as CustomerAddressSortField,
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
            countLabel="个地址"
            onAdd={() => setVisible(true)}
          />
        </Form>
      </Card>

      {/* 客户地址列表 */}
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
          dataSource={customerAddressList}
          renderItem={item => (
            <List.Item>
              {/* 自定义容器：左侧信息 + 右侧操作，避免溢出导致响应式混乱 */}
              <div className="flex w-full flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
                {/* 左侧信息区：可伸展，溢出隐藏，md起自动换行 */}
                <div className="min-w-0 flex-1 overflow-hidden pr-0 md:pr-4">
                  {/* 标题：小屏单行省略，md起允许换行 */}
                  <div className="mb-1">
                    <Button
                      type="link"
                      style={{ padding: 0, height: 'auto' }}
                      onClick={() => handleModify(item.id)}
                    >
                      <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-lg font-medium md:overflow-visible md:whitespace-normal md:break-all">
                        {item.name}
                      </span>
                    </Button>
                  </div>
                  {/* 描述/统计：提供订单量与总额，保证不撑坏布局 */}
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
                  </div>
                </div>

                {/* 右侧操作区：不收缩，允许换行；窄屏下按钮自然换行 */}
                <div className="flex shrink-0 flex-row flex-wrap items-center justify-start gap-2 md:justify-end md:gap-3">
                  <Button
                    key="consumption"
                    color="default"
                    variant="outlined"
                    onClick={() => handleViewConsumptionDetail(item.id)}
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
                    title="确定要删除这个客户地址吗？"
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

      {/* 消费详情弹窗 */}
      {currentId && (
        <ConsumptionDetailStatsModal
          visible={consumptionDetailVisible}
          onClose={handleCloseConsumptionDetail}
          id={currentId}
          title="地址消费详情"
          width={900}
          type="address"
        />
      )}
    </>
  )
}
