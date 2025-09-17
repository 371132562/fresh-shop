import { Button, Card, Col, Form, Input, List, Popconfirm, Row } from 'antd'
import type { CustomerAddressSortField, SortOrder } from 'fresh-shop-backend/types/dto'
import { useEffect, useState } from 'react'

import SearchToolbar from '@/components/SearchToolbar'
import ConsumptionDetailStatsModal from '@/pages/Analysis/components/ConsumptionDetailStatsModal/index.tsx'
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
  const consumptionDetailLoading = useCustomerStore(state => state.addressConsumptionDetailLoading)
  const addressConsumptionDetail = useCustomerStore(state => state.addressConsumptionDetail)
  const getAddressConsumptionDetail = useCustomerStore(state => state.getAddressConsumptionDetail)
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
    setConsumptionDetailVisible(true)
    await getAddressConsumptionDetail(id)
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
            sortOptions={[
              { label: '按添加时间倒序', value: 'createdAt_desc' },
              { label: '按添加时间正序', value: 'createdAt_asc' },
              { label: '按订单数量倒序', value: 'orderCount_desc' },
              { label: '按订单数量正序', value: 'orderCount_asc' },
              { label: '按订单总额倒序', value: 'orderTotalAmount_desc' },
              { label: '按订单总额正序', value: 'orderTotalAmount_asc' }
            ]}
            sortValue={`${pageParams.sortField}_${pageParams.sortOrder}`}
            onSortChange={value => {
              const [sortField, sortOrder] = value.split('_') as [string, string]
              setPageParams({
                sortField: sortField as CustomerAddressSortField,
                sortOrder: sortOrder as SortOrder,
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
            <List.Item
              actions={[
                <Button
                  key="consumption"
                  color="default"
                  variant="outlined"
                  onClick={() => handleViewConsumptionDetail(item.id)}
                >
                  查看消费详情
                </Button>,
                <Button
                  key="edit"
                  color="primary"
                  variant="outlined"
                  onClick={() => handleModify(item.id)}
                >
                  编辑
                </Button>,
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
              ]}
            >
              <List.Item.Meta
                title={
                  <Button
                    type="link"
                    style={{ padding: 0, height: 'auto' }}
                    onClick={() => handleModify(item.id)}
                  >
                    <span className="text-lg font-medium">{item.name}</span>
                  </Button>
                }
                description={
                  <div>
                    {item.orderCount !== undefined && (
                      <div className="mb-1 font-medium text-gray-800">
                        订单数量：<span className="text-blue-500">{item.orderCount}</span>
                      </div>
                    )}
                    {item.orderTotalAmount !== undefined && (
                      <div className="mb-1 font-medium text-gray-800">
                        订单总额：
                        <span className="text-green-500">¥{item.orderTotalAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                }
              />
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
      <ConsumptionDetailStatsModal
        visible={consumptionDetailVisible}
        onClose={handleCloseConsumptionDetail}
        consumptionDetail={addressConsumptionDetail}
        loading={consumptionDetailLoading}
        title="地址消费详情"
        width={900}
        type="address"
      />
    </>
  )
}
