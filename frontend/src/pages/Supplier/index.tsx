import type { TableProps } from 'antd'
import { Space, Table } from 'antd'
import axios from 'axios'

export const Component = () => {
  axios.post('//localhost:3000/supplier/create', {
    name: 'admin'
  })

  interface DataType {
    key: string
    name: string
    age: number
    address: string
    tags: string[]
  }

  const columns: TableProps<DataType>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: text => <a>{text}</a>
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age'
    },
    {
      title: 'Action',
      key: 'action',
      render: _ => (
        <Space size="middle">
          <a>Delete</a>
        </Space>
      )
    }
  ]

  const data: DataType[] = [
    {
      key: '1',
      name: 'John Brown',
      age: 32,
      address: 'New York No. 1 Lake Park',
      tags: ['nice', 'developer']
    },
    {
      key: '2',
      name: 'Jim Green',
      age: 42,
      address: 'London No. 1 Lake Park',
      tags: ['loser']
    },
    {
      key: '3',
      name: 'Joe Black',
      age: 32,
      address: 'Sydney No. 1 Lake Park',
      tags: ['cool', 'teacher']
    }
  ]
  return (
    <>
      <section className="mt-3 box-border flex h-14 w-[95%] flex-row items-center justify-between rounded-md bg-white p-3">
        <div>共100家</div>
        <div>近七日活跃100家</div>
      </section>
      <section className="mt-2 box-border flex w-[95%] items-center justify-between rounded-md bg-white p-3">
        <Table<DataType>
          className="w-full"
          columns={columns}
          dataSource={data}
        />
      </section>
    </>
  )
}
