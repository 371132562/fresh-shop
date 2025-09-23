import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DownOutlined,
  QuestionCircleOutlined,
  TableOutlined,
  TrophyOutlined,
  UpOutlined
} from '@ant-design/icons'
import { Button, Card, Col, Divider, Row, Table, Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { CustomerConsumptionDetailDto } from 'fresh-shop-backend/types/dto'
import React, { useMemo, useState } from 'react'

import dayjs from '@/utils/day'
import { getProfitColor } from '@/utils/profitColor'

// 派生后端 DTO 中已存在的 15 天对比类型，避免前后端重复定义
type FifteenDayComparisonDto = NonNullable<CustomerConsumptionDetailDto['fifteenDayComparison']>
// 商品维度对比列表类型
type FifteenDayProductComparisonListDto = NonNullable<
  CustomerConsumptionDetailDto['fifteenDayProductComparisons']
>

// 组件 props 从后端 DTO 字段类型派生
type FifteenDayComparisonProps = {
  comparison: FifteenDayComparisonDto
  productComparisons: FifteenDayProductComparisonListDto
}

// 用于 Table 泛型的行类型
type ProductComparisonRow = FifteenDayProductComparisonListDto[number]

// 展示用日期范围（含今日15天窗口与其前一段15天）
const getWindowRanges = () => {
  const endCurrent = dayjs().endOf('day')
  const startCurrent = endCurrent.subtract(14, 'day').startOf('day')
  const endPrevious = startCurrent.subtract(1, 'millisecond')
  const startPrevious = startCurrent.subtract(15, 'day').startOf('day')
  return {
    currentLabel: `${startCurrent.format('YYYY-MM-DD')} 至 ${endCurrent.format('YYYY-MM-DD')}`,
    previousLabel: `${startPrevious.format('YYYY-MM-DD')} 至 ${endPrevious.format('YYYY-MM-DD')}`
  }
}

const formatAmount = (n: number) => `¥${(n || 0).toFixed(2)}`

const DiffPill: React.FC<{ value: number; unit?: string }> = ({ value, unit }) => {
  const isUp = value > 0
  const isDown = value < 0
  const color = getProfitColor(value)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${color} bg-gray-50`}
    >
      {isUp && <ArrowUpOutlined />}
      {isDown && <ArrowDownOutlined />}
      {unit === 'amount' ? Math.abs(value).toFixed(2) : Math.abs(value)}
      {unit === 'amount' ? '' : ''}
    </span>
  )
}

const MetricCard: React.FC<{
  title: string
  currentText: string
  diffValue: number
  previousText: string
  accentClass: string
}> = ({ title, currentText, diffValue, previousText, accentClass }) => {
  const isAmount = title.includes('消费额')
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <div className="mb-2 font-medium text-gray-700">{title}</div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-gray-500">近15天</div>
          <div className={`mt-1 text-2xl font-bold ${accentClass}`}>{currentText}</div>
        </div>
        <div className="text-right">
          <div className="mb-1 text-gray-500">较前15天</div>
          <DiffPill
            value={diffValue}
            unit={isAmount ? 'amount' : undefined}
          />
          <div className="text-gray-500">{previousText}</div>
        </div>
      </div>
    </div>
  )
}

const FifteenDayComparison: React.FC<FifteenDayComparisonProps> = ({
  comparison,
  productComparisons
}) => {
  const ranges = getWindowRanges()
  const [showProductTable, setShowProductTable] = useState(false)

  const columns: ColumnsType<ProductComparisonRow> = useMemo(
    () => [
      {
        title: '商品',
        dataIndex: 'productName',
        key: 'productName',
        render: (text: string) => <span className="font-medium text-gray-800">{text}</span>
      },
      {
        title: (
          <Tooltip title={`近15天：${ranges.currentLabel}`}>
            <span>消费额（近15天）</span>
          </Tooltip>
        ),
        dataIndex: ['current', 'totalAmount'],
        key: 'currentAmount',
        align: 'right' as const,
        render: (v: number) => <span className="text-cyan-600">{formatAmount(v)}</span>
      },

      {
        title: (
          <Tooltip title={`前15天：${ranges.previousLabel}`}>
            <span>消费额（前15天）</span>
          </Tooltip>
        ),
        dataIndex: ['previous', 'totalAmount'],
        key: 'prevAmount',
        align: 'right' as const,
        render: (v: number) => <span className="text-gray-500">{formatAmount(v)}</span>
      },
      {
        title: '消费额变化',
        dataIndex: ['diff', 'totalAmount'],
        key: 'diffAmount',
        align: 'center' as const,
        sorter: (a: ProductComparisonRow, b: ProductComparisonRow) =>
          (a.diff?.totalAmount || 0) - (b.diff?.totalAmount || 0),
        defaultSortOrder: undefined,
        render: (v: number) => (
          <DiffPill
            value={v}
            unit="amount"
          />
        )
      },
      {
        title: (
          <Tooltip title={`近15天：${ranges.currentLabel}`}>
            <span>订单量（近15天）</span>
          </Tooltip>
        ),
        dataIndex: ['current', 'orderCount'],
        key: 'currentOrders',
        align: 'right' as const,
        render: (v: number) => <span className="text-purple-600">{v}</span>
      },

      {
        title: (
          <Tooltip title={`前15天：${ranges.previousLabel}`}>
            <span>订单量（前15天）</span>
          </Tooltip>
        ),
        dataIndex: ['previous', 'orderCount'],
        key: 'prevOrders',
        align: 'right' as const,
        render: (v: number) => <span className="text-gray-500">{v}</span>
      },
      {
        title: '订单量变化',
        dataIndex: ['diff', 'orderCount'],
        key: 'diffOrders',
        align: 'center' as const,
        sorter: (a: ProductComparisonRow, b: ProductComparisonRow) =>
          (a.diff?.orderCount || 0) - (b.diff?.orderCount || 0),
        defaultSortOrder: undefined,
        render: (v: number) => <DiffPill value={v} />
      }
    ],
    [ranges.currentLabel, ranges.previousLabel]
  )

  const dataSource = useMemo(
    () => productComparisons.slice().sort((a, b) => b.current.totalAmount - a.current.totalAmount),
    [productComparisons]
  )

  return (
    <Card
      size="small"
      className="overflow-hidden"
      styles={{ header: { background: '#f0f5ff' } }}
      title={
        <div className="flex h-12 items-center justify-between">
          <div className="flex items-center gap-2">
            <TrophyOutlined className="text-blue-500" />
            <span className="text-lg font-medium">
              近15天与前15天消费对比{' '}
              <Tooltip title="该对比基于全量数据统计，不受上方统计时间筛选影响。">
                <QuestionCircleOutlined className="text-gray-400" />
              </Tooltip>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Tag color="blue">近15天（含今日）：{ranges.currentLabel}</Tag>
            <Tag color="blue">前15天：{ranges.previousLabel}</Tag>
          </div>
        </div>
      }
    >
      <Row gutter={[12, 12]}>
        <Col
          xs={24}
          sm={12}
        >
          <MetricCard
            title="消费额（¥）"
            currentText={formatAmount(comparison.current.totalAmount)}
            diffValue={comparison.diff.totalAmount}
            previousText={`前15天：${formatAmount(comparison.previous.totalAmount)}`}
            accentClass="text-cyan-600"
          />
        </Col>
        <Col
          xs={24}
          sm={12}
        >
          <MetricCard
            title="订单量（单）"
            currentText={`${comparison.current.orderCount}`}
            diffValue={comparison.diff.orderCount}
            previousText={`前15天：${comparison.previous.orderCount} 单`}
            accentClass="text-purple-600"
          />
        </Col>
      </Row>

      <Divider className="!my-3" />

      <div className="mb-2 flex items-center justify-between gap-2 text-sm text-gray-600">
        <TableOutlined className="text-blue-500" />
        <span>近15天与前15天 详细商品维度对比</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">共 {dataSource.length} 项</span>
          <Button
            color="primary"
            variant="outlined"
            onClick={() => setShowProductTable(v => !v)}
          >
            {showProductTable ? <UpOutlined /> : <DownOutlined />}
            <span>{showProductTable ? '收起' : '展开'}</span>
          </Button>
        </div>
      </div>

      {showProductTable && (
        <Table<ProductComparisonRow>
          size="small"
          rowKey="productId"
          columns={columns}
          dataSource={dataSource}
          pagination={false}
        />
      )}
    </Card>
  )
}

export default FifteenDayComparison
