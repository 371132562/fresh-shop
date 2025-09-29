import { TrophyOutlined } from '@ant-design/icons'
import { Card, Col, Row } from 'antd'
import type { ProductCategoryStat, ProductStatItem } from 'fresh-shop-backend/types/dto'
import React from 'react'

import ProductCategoryAnalysis from './components/ProductCategoryAnalysis'
import TopProductsAnalysis from './components/TopProductsAnalysis'

type ProductAnalysisProps = {
  productStats: ProductStatItem[]
  productCategoryStats?: ProductCategoryStat[]
  title?: string
  loading?: boolean
  showCategoryStats?: boolean // 是否显示商品分类统计，默认为true
}

/**
 * 商品分析综合组件
 * 展示商品统计和产品分类统计
 */
const ProductAnalysis: React.FC<ProductAnalysisProps> = ({
  productStats,
  productCategoryStats = [],
  title = '商品分析',
  loading = false,
  showCategoryStats = true
}) => {
  return (
    <Card
      title={
        <div className="flex h-12 items-center gap-2">
          <TrophyOutlined className="text-orange-500" />
          <span className="text-lg font-medium">{title}</span>
        </div>
      }
      size="small"
      styles={{ header: { background: '#fff7e6' } }}
      loading={loading}
    >
      {showCategoryStats ? (
        <Row gutter={16}>
          <Col span={12}>
            <TopProductsAnalysis
              data={productStats}
              title="商品分析"
              loading={loading}
            />
          </Col>
          <Col span={12}>
            <ProductCategoryAnalysis
              data={productCategoryStats}
              title="商品分类统计"
              loading={loading}
            />
          </Col>
        </Row>
      ) : (
        <TopProductsAnalysis
          data={productStats}
          title="商品分析"
          loading={loading}
        />
      )}
    </Card>
  )
}

export default ProductAnalysis
