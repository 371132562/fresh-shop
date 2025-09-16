import { HistoryOutlined } from '@ant-design/icons'
import { Button, Card, Col, Divider, Row, Statistic, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { GroupBuyLaunchHistory } from 'fresh-shop-backend/types/dto'
import React, { useState } from 'react'
import { NavLink } from 'react-router'

import dayjs from '@/utils/day'
import { getProfitColor, getProfitMarginColor } from '@/utils/profitColor'

type GroupBuyHistoryAnalysisProps = {
  groupBuyHistory: GroupBuyLaunchHistory[]
  title?: string
}

/**
 * 团购发起历史分析组件
 * 展示团购发起历史统计和详细记录
 */
const GroupBuyHistoryAnalysis: React.FC<GroupBuyHistoryAnalysisProps> = ({
  groupBuyHistory,
  title = '团购历史'
}) => {
  // 控制“详细团购记录”展开/收起
  const [isExpanded, setIsExpanded] = useState(false)
  const showToggle = groupBuyHistory.length > 5
  const displayedGroupBuyHistory = isExpanded ? groupBuyHistory : groupBuyHistory.slice(0, 5)

  // 团购历史表格列定义
  const groupBuyHistoryColumns: ColumnsType<GroupBuyLaunchHistory & { key: number }> = [
    {
      title: '发起时间',
      dataIndex: 'launchDate',
      key: 'launchDate',
      render: (date: Date) => (
        <div className="flex items-center gap-2">{dayjs(date).format('YYYY-MM-DD')}</div>
      ),
      defaultSortOrder: 'descend' as const
    },
    {
      title: '团购',
      dataIndex: 'groupBuyName',
      key: 'groupBuyName',
      render: (name: string, record) => (
        <NavLink
          to={`/groupBuy/detail/${record.groupBuyId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 transition-colors hover:text-blue-600"
          title="点击查看团购单详情"
        >
          {name}
        </NavLink>
      )
    },
    {
      title: '订单量',
      dataIndex: 'orderCount',
      key: 'orderCount',
      render: (count: number) => <span className="font-medium text-green-600">{count}单</span>
    },
    {
      title: '客户量',
      dataIndex: 'customerCount',
      key: 'customerCount',
      render: (count: number) => <span className="font-medium text-purple-600">{count}人</span>
    },
    {
      title: '销售额',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (revenue: number) => (
        <span className="font-medium text-cyan-600">¥{revenue.toFixed(2)}</span>
      )
    },
    {
      title: '利润',
      dataIndex: 'profit',
      key: 'profit',
      render: (profit: number) => (
        <span className={`font-medium ${getProfitColor(profit)}`}>¥{profit.toFixed(2)}</span>
      )
    },
    {
      title: '部分退款',
      dataIndex: 'partialRefundAmount',
      key: 'partialRefundAmount',
      render: (amount: number) => (
        <span className="font-medium text-orange-500">¥{(amount || 0).toFixed(2)}</span>
      )
    },
    {
      title: '退款订单',
      dataIndex: 'refundedOrderCount',
      key: 'refundedOrderCount',
      render: (count: number) => <span className="font-medium text-orange-500">{count}单</span>
    },
    {
      title: '利润率',
      key: 'profitMargin',
      render: (_, record) => {
        const margin = record.revenue > 0 ? (record.profit / record.revenue) * 100 : 0
        return (
          <span className={`font-medium ${getProfitMarginColor(margin)}`}>
            {margin.toFixed(1)}%
          </span>
        )
      }
    }
  ]

  // 计算统计指标
  const totalRevenue = groupBuyHistory.reduce((sum, item) => sum + item.revenue, 0)
  const totalProfit = groupBuyHistory.reduce((sum, item) => sum + item.profit, 0)
  const totalPartialRefundAmount = groupBuyHistory.reduce(
    (sum, item) => sum + (item.partialRefundAmount || 0),
    0
  )
  const totalOrderCount = groupBuyHistory.reduce((sum, item) => sum + item.orderCount, 0)
  const totalRefundedOrderCount = groupBuyHistory.reduce(
    (sum, item) => sum + (item.refundedOrderCount || 0),
    0
  )
  const averageRevenue = groupBuyHistory.length > 0 ? totalRevenue / groupBuyHistory.length : 0
  const averageProfit = groupBuyHistory.length > 0 ? totalProfit / groupBuyHistory.length : 0
  const averageOrderCount =
    groupBuyHistory.length > 0 ? totalOrderCount / groupBuyHistory.length : 0

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
            <Col span={5}>
              <Statistic
                title="平均团购利润"
                value={averageProfit}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#fa8c16' }}
              />
            </Col>
            <Col span={5}>
              <Statistic
                title="平均团购订单数"
                value={averageOrderCount}
                precision={1}
                suffix="单"
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
            <Col span={5}>
              <Statistic
                title="部分退款金额"
                value={totalPartialRefundAmount}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#fa541c' }}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="退款订单数"
                value={totalRefundedOrderCount}
                suffix="单"
                valueStyle={{ color: '#fa541c' }}
              />
            </Col>
          </Row>

          <Divider
            orientation="left"
            orientationMargin="0"
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
