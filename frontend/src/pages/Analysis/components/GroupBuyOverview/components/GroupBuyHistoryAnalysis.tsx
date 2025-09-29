import { HistoryOutlined } from '@ant-design/icons'
import { Button, Card, Col, Divider, Row, Statistic, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { SorterResult } from 'antd/es/table/interface'
import type { GroupBuyLaunchHistory } from 'fresh-shop-backend/types/dto'
import React, { useState } from 'react'
import { NavLink } from 'react-router'

import useGlobalSettingStore from '@/stores/globalSettingStore'
import dayjs from '@/utils/day'
import { getProfitColor, getProfitMarginColor } from '@/utils/profitColor'

type GroupBuyHistoryAnalysisProps = {
  groupBuyHistory: GroupBuyLaunchHistory[]
  title?: string
  // 团购统计数据（从接口直接获取，避免前端计算）
  averageGroupBuyRevenue?: number
  averageGroupBuyProfit?: number
  averageGroupBuyOrderCount?: number
  totalRefundAmount?: number
  totalPartialRefundOrderCount?: number
  totalRefundedOrderCount?: number
}

/**
 * 团购发起历史分析组件
 * 展示团购发起历史统计和详细记录
 */
const GroupBuyHistoryAnalysis: React.FC<GroupBuyHistoryAnalysisProps> = ({
  groupBuyHistory,
  title = '团购历史',
  averageGroupBuyRevenue,
  averageGroupBuyProfit,
  averageGroupBuyOrderCount,
  totalRefundAmount,
  totalPartialRefundOrderCount,
  totalRefundedOrderCount
}) => {
  // 控制"详细团购记录"展开/收起
  const [isExpanded, setIsExpanded] = useState(false)
  const showToggle = groupBuyHistory.length > 5
  const displayedGroupBuyHistory = isExpanded ? groupBuyHistory : groupBuyHistory.slice(0, 5)

  // 敏感数据控制
  const sensitive = useGlobalSettingStore.getState().globalSetting?.value?.sensitive

  // 团购历史表格列定义（按敏感开关动态拼装列）
  let groupBuyHistoryColumns: ColumnsType<GroupBuyLaunchHistory & { key: number }> = [
    {
      title: '发起时间',
      dataIndex: 'launchDate',
      key: 'launchDate',
      render: (date: Date, record) => (
        <NavLink
          to={`/groupBuy/detail/${record.groupBuyId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 transition-colors hover:text-blue-600"
          title="点击查看团购单详情"
        >
          <span>
            {dayjs(date).format('YYYY-MM-DD')} {record.groupBuyName}
          </span>
        </NavLink>
      )
    },
    {
      title: '订单量',
      dataIndex: 'orderCount',
      key: 'orderCount',
      sorter: (a, b) => (a.orderCount || 0) - (b.orderCount || 0),
      render: (count: number) => <span className="font-bold text-blue-600">{count}单</span>
    },
    {
      title: '客户量',
      dataIndex: 'customerCount',
      key: 'customerCount',
      sorter: (a, b) => (a.customerCount || 0) - (b.customerCount || 0),
      render: (count: number) => <span className="font-bold text-blue-600">{count}人</span>
    },
    {
      title: '销售额',
      dataIndex: 'revenue',
      key: 'revenue',
      sorter: (a, b) => (a.revenue || 0) - (b.revenue || 0),
      render: (revenue: number) => (
        <span className="font-bold text-blue-400">¥{revenue.toFixed(2)}</span>
      )
    }
  ]

  if (!sensitive) {
    groupBuyHistoryColumns.push(
      {
        title: '利润',
        dataIndex: 'profit',
        key: 'profit',
        sorter: (a, b) => (a.profit || 0) - (b.profit || 0),
        render: (profit: number) => (
          <span className={`font-medium ${getProfitColor(profit)}`}>¥{profit.toFixed(2)}</span>
        )
      },
      {
        title: '利润率',
        key: 'profitMargin',
        sorter: (a, b) => {
          const am = (a.revenue || 0) > 0 ? (a.profit || 0) / (a.revenue || 0) : 0
          const bm = (b.revenue || 0) > 0 ? (b.profit || 0) / (b.revenue || 0) : 0
          return am - bm
        },
        render: (_, record) => {
          const margin = record.revenue > 0 ? (record.profit / record.revenue) * 100 : 0
          return (
            <span className={`font-medium ${getProfitMarginColor(margin)}`}>
              {margin.toFixed(1)}%
            </span>
          )
        }
      }
    )
  }

  groupBuyHistoryColumns = [
    ...groupBuyHistoryColumns,
    {
      title: '退款金额',
      dataIndex: 'totalRefundAmount',
      key: 'totalRefundAmount',
      sorter: (a, b) => (a.totalRefundAmount || 0) - (b.totalRefundAmount || 0),
      render: (amount: number) => (
        <span className="font-medium text-orange-600">¥{(amount || 0).toFixed(2)}</span>
      )
    },
    {
      title: '部分退款/退款订单',
      dataIndex: 'totalRefundOrderCount',
      key: 'totalRefundOrderCount',
      render: (_, record) => (
        <span className="font-medium text-orange-600">
          {record.partialRefundOrderCount || 0}/{record.refundedOrderCount || 0} 单
        </span>
      )
    }
  ]

  // 使用接口返回的统计数据，避免前端重复计算
  const averageRevenue = averageGroupBuyRevenue || 0
  const averageProfit = averageGroupBuyProfit || 0
  const averageOrderCount = averageGroupBuyOrderCount || 0
  const refundAmount = totalRefundAmount || 0
  const partialRefundOrderCount = totalPartialRefundOrderCount || 0
  const refundedOrderCount = totalRefundedOrderCount || 0

  // 处理表格排序变化
  const handleTableChange = (
    _pagination: unknown,
    _filters: unknown,
    sorter:
      | SorterResult<GroupBuyLaunchHistory & { key: number }>
      | SorterResult<GroupBuyLaunchHistory & { key: number }>[]
  ) => {
    // 如果用户激活了排序功能（非默认状态），自动展开全部数据
    if (sorter && !Array.isArray(sorter) && sorter.order) {
      setIsExpanded(true)
    }
  }

  return (
    <Card
      title={
        <div className="flex h-12 items-center gap-2">
          <HistoryOutlined className="text-indigo-500" />
          <span className="text-lg font-medium">{title}</span>
        </div>
      }
      size="small"
      styles={{ header: { background: '#f0f5ff' } }}
    >
      {groupBuyHistory && groupBuyHistory.length > 0 ? (
        <div className="space-y-2">
          {/* 团购历史统计 */}
          <Row gutter={16}>
            <Col span={5}>
              <Statistic
                title="平均团购销售额"
                value={averageRevenue}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            {!useGlobalSettingStore.getState().globalSetting?.value?.sensitive && (
              <Col span={5}>
                <Statistic
                  title="平均团购利润"
                  value={averageProfit}
                  precision={2}
                  prefix="¥"
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Col>
            )}
            <Col span={5}>
              <Statistic
                title="平均团购订单量"
                value={averageOrderCount}
                precision={1}
                suffix="单"
                valueStyle={{ color: '#2563eb' }}
              />
            </Col>
            <Col span={5}>
              <Statistic
                title="退款金额"
                value={refundAmount}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#ea580c' }}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="部分退款/退款订单量"
                value={`${partialRefundOrderCount}/${refundedOrderCount}`}
                suffix="单"
                valueStyle={{ color: '#ea580c' }}
              />
            </Col>
          </Row>

          <Divider
            orientation="left"
            orientationMargin="0"
            className="!mb-0"
          >
            <span className="text-sm text-gray-600">详细团购记录</span>
          </Divider>

          {showToggle && (
            <div className="flex justify-end">
              <Button
                type="primary"
                onClick={() => setIsExpanded(v => !v)}
              >
                {(isExpanded ? '收起' : `展开`) + `全部（共${groupBuyHistory.length}条）`}
              </Button>
            </div>
          )}

          {/* 团购历史表格 */}
          <Table
            columns={groupBuyHistoryColumns}
            dataSource={displayedGroupBuyHistory.map((item, index) => ({
              key: index,
              ...item
            }))}
            pagination={false}
            size="small"
            className="mt-2"
            onChange={handleTableChange}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">暂无团购历史记录</div>
        </div>
      )}
    </Card>
  )
}

export default GroupBuyHistoryAnalysis
