import { Button, Col, Divider, Form, Input, List, Row } from 'antd'
import type { SupplierListItem } from 'fresh-shop-backend/types/dto.ts'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'

import SearchToolbar from '@/components/SearchToolbar'
import SupplierDetailModal from '@/pages/Analysis/components/SupplierDetailModal'
import useSupplierStore from '@/stores/supplierStore.ts'
import { validatePhoneNumber } from '@/utils'

import Modify from './Modify.tsx'

export const Component = () => {
  const [visible, setVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierListItem | null>(null)
  const [form] = Form.useForm()

  const listLoading = useSupplierStore(state => state.listLoading)
  const suppliersList = useSupplierStore(state => state.suppliersList)
  const listCount = useSupplierStore(state => state.listCount)
  const pageParams = useSupplierStore(state => state.pageParams)
  const setPageParams = useSupplierStore(state => state.setPageParams)

  useEffect(() => {
    pageChange()
    form.setFieldsValue(pageParams)
  }, [])

  const pageChange = (page: number = pageParams.page) => {
    setPageParams({
      page
    })
  }

  // 处理查看详细数据
  const handleViewDetail = (supplier: SupplierListItem) => {
    setSelectedSupplier(supplier)
    setDetailModalVisible(true)
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
      name: '',
      phone: '',
      wechat: ''
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
              label="供货商名称"
              name="name"
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
          <Col
            xs={24}
            sm={12}
            md={8}
          >
            <Form.Item
              label="手机号"
              name="phone"
              className="!mb-1"
              rules={[
                {
                  required: false,
                  message: '请输入手机号！'
                },
                {
                  validator: validatePhoneNumber
                }
              ]}
            >
              <Input
                placeholder="请输入手机号"
                maxLength={11}
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
              label="微信号"
              name="wechat"
              className="!mb-1"
            >
              <Input
                placeholder="请输入微信号"
                allowClear
                onPressEnter={handleSearch}
                onClear={handleSearch}
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
          countLabel="家供货商"
          onAdd={() => setVisible(true)}
        />
      </Form>
      <Divider className="!mb-0 !mt-4" />

      {/* 供货商列表 */}
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
          dataSource={suppliersList}
          renderItem={(item: SupplierListItem) => (
            <List.Item
              actions={[
                <Button
                  key="detail"
                  type="primary"
                  ghost
                  onClick={() => handleViewDetail(item)}
                >
                  查看详细数据
                </Button>
              ]}
            >
              <List.Item.Meta
                title={
                  <NavLink to={`/supplier/detail/${item.id}`}>
                    <Button
                      type="link"
                      style={{ padding: 0 }}
                    >
                      <span className="text-lg">{item.name}</span>
                    </Button>
                  </NavLink>
                }
                description={
                  <>
                    {item.groupBuyCount !== undefined && (
                      <div className="mb-1 font-medium text-gray-800">
                        团购单数量：<span className="text-blue-500">{item.groupBuyCount}</span>
                      </div>
                    )}
                    {item.description && <div className="text-gray-600">{item.description}</div>}
                  </>
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
      {detailModalVisible && selectedSupplier && (
        <SupplierDetailModal
          visible={detailModalVisible}
          onClose={() => {
            setDetailModalVisible(false)
            setSelectedSupplier(null)
          }}
          params={{
            supplierId: selectedSupplier.id,
            startDate: undefined,
            endDate: undefined
          }}
        />
      )}
    </>
  )
}
