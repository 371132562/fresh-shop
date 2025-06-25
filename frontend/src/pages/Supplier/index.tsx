import { PlusOutlined } from '@ant-design/icons'
import { FloatButton, List } from 'antd'
import { useEffect, useState } from 'react'

import useSupplierStore from '@/stores/supplierStore.ts'

import CreateAndUpdate from './createAndUpdate.tsx'

export const Component = () => {
  const [visible, setVisible] = useState(false)

  const suppliersList = useSupplierStore(state => state.suppliersList)
  const setPageParams = useSupplierStore(state => state.setPageParams)

  useEffect(() => {
    setPageParams({
      page: 1,
      pageSize: 10
    })
  }, [])

  return (
    <>
      <section className="mt-2 box-border flex w-full items-center justify-between rounded-md bg-white p-2">
        <List
          className="w-full"
          itemLayout="horizontal"
          header={
            <div className="box-border flex w-full flex-row items-center justify-between bg-white">
              <div>近七日活跃100家</div>
              <div>共100家</div>
            </div>
          }
          pagination={{ position: 'bottom', align: 'start' }}
          dataSource={suppliersList}
          renderItem={item => (
            <List.Item>
              <List.Item.Meta
                title={<a href="https://ant.design">{item.name}</a>}
                // description="Ant Design, a design language for background applications, is refined by Ant UED Team"
              />
            </List.Item>
          )}
        />
      </section>
      <FloatButton
        icon={<PlusOutlined />}
        type="primary"
        shape="circle"
        onClick={() => setVisible(true)}
      />
      {visible && (
        <CreateAndUpdate
          visible={visible}
          setVisible={setVisible}
        />
      )}
    </>
  )
}
