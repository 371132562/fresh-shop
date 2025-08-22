import { TrophyOutlined } from '@ant-design/icons'
import { Card, Col, Row } from 'antd'
import type { ProductCategoryStat, TopProductItem } from 'fresh-shop-backend/types/dto'
import React from 'react'

import ProductCategoryAnalysis from './ProductCategoryAnalysis'
import TopProductsAnalysis from './TopProductsAnalysis'

type ProductAnalysisProps = {
  topProducts: TopProductItem[]
  productCategoryStats: ProductCategoryStat[]
  title?: string
  loading?: boolean
}

/**
 * 商品分析综合组件
 * 展示热销产品排行和产品分类统计
 */
const ProductAnalysis: React.FC<ProductAnalysisProps> = ({
  topProducts,
  productCategoryStats,
  title = '商品分析',
  loading = false
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
      <Row gutter={16}>
        <Col span={12}>
          <TopProductsAnalysis
            data={topProducts}
            title="热销商品排行"
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
    </Card>
  )
}

export default ProductAnalysis
