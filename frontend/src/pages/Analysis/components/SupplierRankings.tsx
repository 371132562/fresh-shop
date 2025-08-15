import { Collapse, List } from 'antd'
import type {
  SupplierRankByOrderCountItem,
  SupplierRankByTotalProfitItem,
  SupplierRankByTotalSalesItem
} from 'fresh-shop-backend/types/dto'
import { useMemo } from 'react'

import useAnalysisStore from '@/stores/analysisStore'

export const SupplierRankings = () => {
  const getSupplierRankLoading = useAnalysisStore(state => state.getSupplierRankLoading)
  const supplierRank = useAnalysisStore(state => state.supplierRank)

  const {
    supplierRankByOrderCount = [],
    supplierRankByTotalSales = [],
    supplierRankByTotalProfit = []
  } = useMemo(() => supplierRank, [supplierRank])

  // 定义Collapse的items配置
  const collapseItems = [
    {
      key: '1',
      label: '供货商订单量排名',
      children: (
        <List
          loading={getSupplierRankLoading}
          dataSource={supplierRankByOrderCount}
          renderItem={(item: SupplierRankByOrderCountItem, index) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <div className="text-gray-800">
                    <div className="mb-1 font-bold">
                      {index + 1}.{item.name}
                    </div>
                  </div>
                }
                description={
                  <div>
                    订单量: <span className="text-blue-500">{item.orderCount}</span>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )
    },
    {
      key: '2',
      label: '供货商销售额排名',
      children: (
        <List
          loading={getSupplierRankLoading}
          dataSource={supplierRankByTotalSales}
          renderItem={(item: SupplierRankByTotalSalesItem, index) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <div className="text-gray-800">
                    <div className="mb-1 font-bold">
                      {index + 1}.{item.name}
                    </div>
                  </div>
                }
                description={
                  <div>
                    销售额: <span className="text-blue-500">¥{item.totalSales.toFixed(2)}</span>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )
    },
    {
      key: '3',
      label: '供货商利润排名',
      children: (
        <List
          loading={getSupplierRankLoading}
          dataSource={supplierRankByTotalProfit}
          renderItem={(item: SupplierRankByTotalProfitItem, index) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <div className="text-gray-800">
                    <div className="mb-1 font-bold">
                      {index + 1}.{item.name}
                    </div>
                  </div>
                }
                description={
                  <div>
                    利润: <span className="text-blue-500">¥{item.totalProfit.toFixed(2)}</span>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )
    }
  ]

  return (
    <Collapse
      items={collapseItems}
      defaultActiveKey={['1']}
    />
  )
}
