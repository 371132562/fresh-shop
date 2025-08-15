import { Collapse, List } from 'antd'
import dayjs from 'dayjs'
import type {
  GroupBuyRankByOrderCountItem,
  GroupBuyRankByTotalProfitItem,
  GroupBuyRankByTotalSalesItem
} from 'fresh-shop-backend/types/dto'
import { useMemo } from 'react'

import useAnalysisStore from '@/stores/analysisStore'

export const GroupBuyRankings = () => {
  const getGroupBuyRankLoading = useAnalysisStore(state => state.getGroupBuyRankLoading)
  const groupBuyRank = useAnalysisStore(state => state.groupBuyRank)

  const {
    groupBuyRankByOrderCount = [],
    groupBuyRankByTotalSales = [],
    groupBuyRankByTotalProfit = []
  } = useMemo(() => groupBuyRank, [groupBuyRank])

  // 定义Collapse的items配置
  const collapseItems = [
    {
      key: '1',
      label: '团购单订单量排名',
      children: (
        <List
          loading={getGroupBuyRankLoading}
          dataSource={groupBuyRankByOrderCount}
          renderItem={(item: GroupBuyRankByOrderCountItem, index) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <div className="text-gray-800">
                    <div className="mb-1 font-bold">
                      {index + 1}.{item.name}
                    </div>
                    <div className="text-gray-400">
                      发起日期：
                      {dayjs(item.groupBuyStartDate).format('YYYY-MM-DD')}
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
      label: '团购单销售额排名',
      children: (
        <List
          loading={getGroupBuyRankLoading}
          dataSource={groupBuyRankByTotalSales}
          renderItem={(item: GroupBuyRankByTotalSalesItem, index) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <div className="text-gray-800">
                    <div className="mb-1 font-bold">
                      {index + 1}.{item.name}
                    </div>
                    <div className="text-gray-400">
                      发起日期：
                      {dayjs(item.groupBuyStartDate).format('YYYY-MM-DD')}
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
      label: '团购单利润排名',
      children: (
        <List
          loading={getGroupBuyRankLoading}
          dataSource={groupBuyRankByTotalProfit}
          renderItem={(item: GroupBuyRankByTotalProfitItem, index) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <div className="text-gray-800">
                    <div className="mb-1 font-bold">
                      {index + 1}.{item.name}
                    </div>
                    <div className="text-gray-400">
                      发起日期：
                      {dayjs(item.groupBuyStartDate).format('YYYY-MM-DD')}
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
