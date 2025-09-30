import { TrophyOutlined } from '@ant-design/icons'
import { Card } from 'antd'
import type { SupplierStatItem } from 'fresh-shop-backend/types/dto'
import React from 'react'

import SupplierStatsAnalysis from './components/SupplierStatsAnalysis'

type SupplierAnalysisProps = {
  supplierStats: SupplierStatItem[]
  title?: string
  loading?: boolean
}

/**
 * 供货商分析综合组件
 * 展示与当前商品/商品类型相关的供货商表现分析
 */
const SupplierAnalysis: React.FC<SupplierAnalysisProps> = ({
  supplierStats,
  title = '供货商分析',
  loading = false
}) => {
  return (
    <Card
      title={
        <div className="flex h-12 items-center gap-2">
          <TrophyOutlined className="text-green-500" />
          <span className="text-lg font-medium">{title}</span>
        </div>
      }
      size="small"
      styles={{ header: { background: '#f6ffed' } }}
      loading={loading}
    >
      <SupplierStatsAnalysis
        data={supplierStats}
        title="供货商表现"
        loading={loading}
      />
    </Card>
  )
}

export default SupplierAnalysis
