import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, FloatButton, Form, Input, List, Modal } from 'antd'
import type { SupplierListItem } from 'fresh-shop-backend/types/dto.ts'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'

import useSupplierStore from '@/stores/supplierStore.ts'
import { validatePhoneNumber } from '@/utils'

import Modify from './Modify.tsx'

export const Component = () => {
  const [visible, setVisible] = useState(false)
  const [searchVisible, setSearchVisible] = useState(false)
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

  //搜索
  const handleOk = () => {
    form
      .validateFields()
      .then(async val => {
        setPageParams({
          page: 1,
          ...val
        })
        setSearchVisible(false)
      })
      .catch(err => {
        console.log(err)
      })
  }

  const handleCancel = () => {
    setSearchVisible(false)
  }

  const resetSearch = () => {
    const resetValues = {
      name: '',
      phone: '',
      wechat: ''
    }
    form.setFieldsValue(resetValues)
    setPageParams({
      ...resetValues
    })
    handleCancel()
  }

  return (
    <>
      <section className="box-border flex w-full items-center justify-between">
        <List
          className="w-full"
          itemLayout="horizontal"
          header={
            <div className="box-border flex w-full flex-row items-center justify-between">
              <div>
                <Button
                  type="primary"
                  size="large"
                  icon={<SearchOutlined />}
                  iconPosition="end"
                  onClick={() => setSearchVisible(true)}
                >
                  搜索供货商
                </Button>
              </div>
              <div>共 {listCount.totalCount} 家</div>
            </div>
          }
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
            <List.Item>
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
      <FloatButton
        style={{ position: 'absolute', left: 24 }}
        icon={<PlusOutlined />}
        type="primary"
        description="添加"
        shape="square"
        onClick={() => setVisible(true)}
      />
      {visible && (
        <Modify
          visible={visible}
          setVisible={setVisible}
        />
      )}
      <Modal
        open={searchVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={[
          <Button onClick={resetSearch}>清空</Button>,
          <Button onClick={handleCancel}>取消</Button>,
          <Button
            type="primary"
            loading={listLoading}
            onClick={handleOk}
          >
            确定
          </Button>
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          size="large"
          name="basic"
          labelCol={{ span: 24 }}
          wrapperCol={{ span: 24 }}
          style={{ maxWidth: 600 }}
          autoComplete="off"
        >
          <Form.Item
            label="按名称搜索"
            name="name"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="按手机号搜索"
            name="phone"
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
            <Input maxLength={11} />
          </Form.Item>
          <Form.Item
            label="按微信号搜索"
            name="wechat"
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
