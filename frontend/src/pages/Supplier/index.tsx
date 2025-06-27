import { PlusOutlined } from '@ant-design/icons'
import { Button, FloatButton, List } from 'antd'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'

import useSupplierStore from '@/stores/supplierStore.ts'

import Modify from './modify.tsx'

export const Component = () => {
  const [visible, setVisible] = useState(false)

  const listLoading = useSupplierStore(state => state.listLoading)
  const suppliersList = useSupplierStore(state => state.suppliersList)
  const listCount = useSupplierStore(state => state.listCount)
  const setPageParams = useSupplierStore(state => state.setPageParams)

  useEffect(() => {
    pageChange()
  }, [])

  const pageChange = (page: number = 1) => {
    setPageParams({
      page,
      pageSize: 10
    })
  }

  return (
    <>
      <section className="mt-2 box-border flex w-full items-center justify-between">
        <List
          className="w-full"
          itemLayout="horizontal"
          header={
            <div className="box-border flex w-full flex-row items-center justify-between">
              <div></div>
              <div>共 {listCount.totalCount} 家</div>
            </div>
          }
          loading={listLoading}
          pagination={{
            position: 'bottom',
            align: 'end',
            total: listCount.totalCount,
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
                    <Button type="link">{item.name}</Button>
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
        shape="circle"
        onClick={() => setVisible(true)}
      />
      {visible && (
        <Modify
          visible={visible}
          setVisible={setVisible}
        />
      )}
    </>
  )
}
