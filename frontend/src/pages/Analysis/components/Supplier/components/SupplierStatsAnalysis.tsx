import { Table } from 'antd'
import type { ColumnsType, TableProps } from 'antd/es/table'
import type { SupplierStatItem } from 'fresh-shop-backend/types/dto'
import React, { useState } from 'react'

import useGlobalSettingStore from '@/stores/globalSettingStore'
import { getProfitColor, getProfitMarginColor } from '@/utils/profitColor'

type SupplierStatsAnalysisProps = {
  data: SupplierStatItem[]
  loading?: boolean
}

/**
 * 供货商统计分析组件
 * 展示与当前商品/商品类型相关的供货商表现数据
 */
const SupplierStatsAnalysis: React.FC<SupplierStatsAnalysisProps> = ({ data, loading = false }) => {
  const globalSetting = useGlobalSettingStore(state => state.globalSetting)
  const sensitive = globalSetting?.value?.sensitive
  const [sortedInfo, setSortedInfo] = useState<{
    columnKey?: string
    order?: 'ascend' | 'descend'
  }>({})

  // 计算利润率
  const calculateProfitMargin = (revenue: number, profit: number): number => {
    if (revenue === 0) return 0
    return (profit / revenue) * 100
  }

  // 表格列定义（根据敏感数据控制动态构建）
  const baseColumns: ColumnsType<SupplierStatItem> = [
    {
      title: '供货商名称',
      dataIndex: 'supplierName',
      key: 'supplierName',
      render: (text: string) => <span className="font-medium text-gray-800">{text}</span>
    },
    {
      title: '团购单量',
      dataIndex: 'groupBuyCount',
      key: 'groupBuyCount',
      sorter: (a, b) => a.groupBuyCount - b.groupBuyCount,
      sortOrder: sortedInfo.columnKey === 'groupBuyCount' ? sortedInfo.order : null,
      render: (value: number) => <span className="font-medium text-blue-500">{value}个</span>
    },
    {
      title: '订单量',
      dataIndex: 'orderCount',
      key: 'orderCount',
      sorter: (a, b) => a.orderCount - b.orderCount,
      sortOrder: sortedInfo.columnKey === 'orderCount' ? sortedInfo.order : null,
      render: (value: number) => <span className="font-medium text-blue-500">{value}单</span>
    },

    {
      title: '销售额',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      sorter: (a, b) => a.totalRevenue - b.totalRevenue,
      sortOrder: sortedInfo.columnKey === 'totalRevenue' ? sortedInfo.order : null,
      render: (value: number) => (
        <span className="font-medium text-blue-500">¥{value.toFixed(2)}</span>
      )
    }
  ]

  // 根据敏感数据控制添加利润相关列
  const profitColumns: ColumnsType<SupplierStatItem> = !sensitive
    ? [
        {
          title: '利润',
          dataIndex: 'totalProfit',
          key: 'totalProfit',
          sorter: (a, b) => a.totalProfit - b.totalProfit,
          sortOrder: sortedInfo.columnKey === 'totalProfit' ? sortedInfo.order : null,
          render: (value: number) => (
            <span className={`font-medium ${getProfitColor(value)}`}>¥{value.toFixed(2)}</span>
          )
        },
        {
          title: '利润率',
          key: 'profitMargin',
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
    : []

  // 退款相关列
  const refundColumns: ColumnsType<SupplierStatItem> = [
    {
      title: '退款金额',
      dataIndex: 'totalRefundAmount',
      key: 'totalRefundAmount',
      sorter: (a, b) => (a.totalRefundAmount || 0) - (b.totalRefundAmount || 0),
      sortOrder: sortedInfo.columnKey === 'totalRefundAmount' ? sortedInfo.order : null,
      render: (amount: number) => (
        <span className="font-medium text-orange-600">¥{(amount || 0).toFixed(2)}</span>
      )
    },
    {
      title: '部分退款/退款订单',
      key: 'refundOrderCount',
      render: (_, record) => (
        <span className="font-medium text-orange-600">
          {record.totalPartialRefundOrderCount || 0}/{record.totalRefundedOrderCount || 0} 单
        </span>
      )
    }
  ]

  // 合并所有列
  const columns: ColumnsType<SupplierStatItem> = [
    ...baseColumns,
    ...profitColumns,
    ...refundColumns
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
