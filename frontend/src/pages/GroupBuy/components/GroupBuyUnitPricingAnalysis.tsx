import { BarChartOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { Table, Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { GroupBuyUnit } from 'fresh-shop-backend/types/dto'
import { useMemo } from 'react'

import {
  calculateUnitProfit,
  calculateUnitProfitMarginPercent,
  getUnitPricingStatus,
  LOW_UNIT_PROFIT_MARGIN_PERCENT,
  LOW_UNIT_PROFIT_THRESHOLD
} from '@/utils/profitability'
import { getProfitColor, getProfitMarginColor } from '@/utils/profitColor'

type GroupBuyUnitPricingAnalysisProps = {
  units: GroupBuyUnit[]
  sensitive?: boolean
}

type UnitPricingRow = GroupBuyUnit & {
  unitProfit: number
  unitProfitMargin: number
}

/**
 * 团购规格定价能力分析组件。
 * 仅使用团购规格中的售价与成本价做前端派生，帮助用户快速判断规格定价是否健康。
 */
const GroupBuyUnitPricingAnalysis = ({
  units,
  sensitive = false
}: GroupBuyUnitPricingAnalysisProps) => {
  const rows = useMemo<UnitPricingRow[]>(() => {
    const enrichedRows = (units || []).map(unit => ({
      ...unit,
      unitProfit: calculateUnitProfit(unit.price, unit.costPrice),
      unitProfitMargin: calculateUnitProfitMarginPercent(unit.price, unit.costPrice)
    }))

    return enrichedRows.sort((a, b) => b.unitProfit - a.unitProfit)
  }, [units])

  const columns = useMemo<ColumnsType<UnitPricingRow>>(() => {
    const baseColumns: ColumnsType<UnitPricingRow> = [
      {
        title: '规格',
        dataIndex: 'unit',
        key: 'unit',
        render: (value: string) => <span className="font-medium text-gray-800">{value}</span>
      },
      {
        title: '售价',
        dataIndex: 'price',
        key: 'price',
        align: 'right',
        render: (value: number) => <span className="font-semibold text-blue-400">¥{value}</span>
      }
    ]

    if (sensitive) {
      return baseColumns
    }

    return [
      ...baseColumns,
      {
        title: '成本价',
        dataIndex: 'costPrice',
        key: 'costPrice',
        align: 'right',
        render: (value: number) => <span className="font-medium text-gray-700">¥{value}</span>
      },
      {
        title: '单份毛利',
        dataIndex: 'unitProfit',
        key: 'unitProfit',
        align: 'right',
        render: (value: number) => {
          const profitClassName =
            value < 0
              ? 'text-red-600'
              : value <= LOW_UNIT_PROFIT_THRESHOLD
                ? 'text-orange-500'
                : getProfitColor(value)

          return <span className={`font-semibold ${profitClassName}`}>¥{value.toFixed(2)}</span>
        }
      },
      {
        title: '毛利率',
        dataIndex: 'unitProfitMargin',
        key: 'unitProfitMargin',
        align: 'right',
        render: (value: number) => (
          <span className={`font-semibold ${getProfitMarginColor(value)}`}>
            {value.toFixed(1)}%
          </span>
        )
      },
      {
        key: 'pricingStatus',
        title: (
          <div className="flex items-center justify-end gap-1">
            <span>定价提示</span>
            <Tooltip
              placement="topRight"
              title={
                <div className="max-w-72 leading-6">
                  <div>规则说明：</div>
                  <div>1）售价低于成本：售价 &lt; 成本价。</div>
                  <div>
                    2）毛利偏低：单份毛利 ≤ {LOW_UNIT_PROFIT_THRESHOLD} 元，且毛利率 ≤{' '}
                    {LOW_UNIT_PROFIT_MARGIN_PERCENT}%。
                  </div>
                  <div>3）定价健康：不满足以上两类情况。</div>
                </div>
              }
            >
              <QuestionCircleOutlined className="text-gray-400" />
            </Tooltip>
          </div>
        ),
        render: (_, record) => {
          const pricingStatus = getUnitPricingStatus(record.price, record.costPrice)

          return <Tag color={pricingStatus.color}>{pricingStatus.label}</Tag>
        }
      }
    ]
  }, [sensitive])

  return (
    <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 border-b border-gray-100 pb-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <BarChartOutlined className="text-blue-500" />
          <div>
            <h3 className="text-base font-semibold text-gray-700">规格定价能力</h3>
            <div className="mt-1 text-sm text-gray-500">
              {sensitive
                ? '当前为敏感模式，仅展示规格与售价。'
                : '基于现有售价与成本价派生单份毛利和毛利率，不代表规格级真实经营贡献。'}
            </div>
          </div>
        </div>
      </div>

      <Table<UnitPricingRow>
        size="small"
        rowKey="id"
        pagination={false}
        columns={columns}
        dataSource={rows}
        locale={{ emptyText: '暂无规格信息' }}
        scroll={{ x: sensitive ? 420 : 820 }}
      />
    </div>
  )
}

export default GroupBuyUnitPricingAnalysis
