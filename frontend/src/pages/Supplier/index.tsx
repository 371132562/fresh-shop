import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, FloatButton, Form, Input, List, Modal } from 'antd'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'

import useSupplierStore from '@/stores/supplierStore.ts'

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
      page,
      pageSize: 10
    })
  }

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
      ...resetValues,
      page: 1,
      pageSize: 10
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
          renderItem={item => (
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
                description={item.description || ''}
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
        loading={listLoading}
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
          labelCol={{ span: 8 }}
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
          >
            <Input />
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
