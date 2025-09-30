import { Table } from 'antd'
import type { ColumnsType, TableProps } from 'antd/es/table'
import type { SupplierStatItem } from 'fresh-shop-backend/types/dto'
import React, { useState } from 'react'

import { getProfitColor, getProfitMarginColor } from '@/utils/profitColor'

type SupplierStatsAnalysisProps = {
  data: SupplierStatItem[]
  title?: string
  loading?: boolean
}

/**
 * 供货商统计分析组件
 * 展示与当前商品/商品类型相关的供货商表现数据
 */
const SupplierStatsAnalysis: React.FC<SupplierStatsAnalysisProps> = ({ data, loading = false }) => {
  const [sortedInfo, setSortedInfo] = useState<{
    columnKey?: string
    order?: 'ascend' | 'descend'
  }>({})

  // 计算利润率
  const calculateProfitMargin = (revenue: number, profit: number): number => {
    if (revenue === 0) return 0
    return (profit / revenue) * 100
  }

  // 表格列定义
  const columns: ColumnsType<SupplierStatItem> = [
    {
      title: '供货商名称',
      dataIndex: 'supplierName',
      key: 'supplierName',
      width: 200,
      render: (text: string) => <span className="font-medium text-gray-800">{text}</span>
    },
    {
      title: '销售额',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      width: 120,
      sorter: (a, b) => a.totalRevenue - b.totalRevenue,
      sortOrder: sortedInfo.columnKey === 'totalRevenue' ? sortedInfo.order : null,
      render: (value: number) => (
        <span className="font-medium text-blue-500">¥{value.toFixed(2)}</span>
      )
    },
    {
      title: '团购单量',
      dataIndex: 'groupBuyCount',
      key: 'groupBuyCount',
      width: 120,
      sorter: (a, b) => a.groupBuyCount - b.groupBuyCount,
      sortOrder: sortedInfo.columnKey === 'groupBuyCount' ? sortedInfo.order : null,
      render: (value: number) => <span className="font-medium text-blue-500">{value}个</span>
    },
    {
      title: '订单量',
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: 100,
      sorter: (a, b) => a.orderCount - b.orderCount,
      sortOrder: sortedInfo.columnKey === 'orderCount' ? sortedInfo.order : null,
      render: (value: number) => <span className="font-medium text-blue-500">{value}单</span>
    },
    {
      title: '利润',
      dataIndex: 'totalProfit',
      key: 'totalProfit',
      width: 120,
      sorter: (a, b) => a.totalProfit - b.totalProfit,
      sortOrder: sortedInfo.columnKey === 'totalProfit' ? sortedInfo.order : null,
      render: (value: number) => (
        <span className={`font-medium ${getProfitColor(value)}`}>¥{value.toFixed(2)}</span>
      )
    },
    {
      title: '利润率',
      key: 'profitMargin',
      width: 100,
      sorter: (a, b) => {
        const aMargin = calculateProfitMargin(a.totalRevenue, a.totalProfit)
        const bMargin = calculateProfitMargin(b.totalRevenue, b.totalProfit)
        return aMargin - bMargin
      },
      sortOrder: sortedInfo.columnKey === 'profitMargin' ? sortedInfo.order : null,
      render: (_, record) => {
        const margin = calculateProfitMargin(record.totalRevenue, record.totalProfit)
        return (
          <span className={`font-medium ${getProfitMarginColor(margin)}`}>
            {margin.toFixed(1)}%
          </span>
        )
      }
    }
  ]

  // 处理排序变化
  const handleTableChange: TableProps<SupplierStatItem>['onChange'] = (_, __, sorter) => {
    if (Array.isArray(sorter)) {
      return
    }
    setSortedInfo({
      columnKey: sorter?.columnKey as string,
      order: sorter?.order as 'ascend' | 'descend'
    })
  }

  return (
    <div className="space-y-3">
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
        size="small"
        onChange={handleTableChange}
        rowKey="supplierId"
        scroll={{ x: 800 }}
        className="supplier-stats-table"
      />

      {data.length === 0 && !loading && (
        <div className="py-8 text-center text-gray-500">暂无供货商数据</div>
      )}
    </div>
  )
}

export default SupplierStatsAnalysis
