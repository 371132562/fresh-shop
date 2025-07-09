import { Card, Col, List, Row } from 'antd'
import dayjs from 'dayjs'
import type {
  GroupBuyRankByOrderCountItem,
  GroupBuyRankByTotalProfitItem,
  GroupBuyRankByTotalSalesItem,
  SupplierRankByGroupBuyCountItem
} from 'fresh-shop-backend/types/dto'
import { useMemo } from 'react'

import useAnalysisStore from '@/stores/analysisStore'

export const Rankings = () => {
  const getRankLoading = useAnalysisStore(state => state.getRankLoading)
  const rank = useAnalysisStore(state => state.rank)

  const {
    groupBuyRankByOrderCount = [],
    groupBuyRankByTotalSales = [],
    groupBuyRankByTotalProfit = [],
    supplierRankByGroupBuyCount = []
  } = useMemo(() => rank, [rank])

  return (
    <Row
      className="w-full"
      gutter={[8, 8]}
    >
      <Col span={24}>
        <Card
          size="small"
          loading={getRankLoading}
          title="团购单订单量排名"
        >
          <List
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
                        发起日期：{dayjs(item.groupBuyStartDate).format('YYYY-MM-DD')}
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
        </Card>
      </Col>
      <Col span={24}>
        <Card
          size="small"
          loading={getRankLoading}
          title="团购单销售额排名"
        >
          <List
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
                        发起日期：{dayjs(item.groupBuyStartDate).format('YYYY-MM-DD')}
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
        </Card>
      </Col>
      <Col span={24}>
        <Card
          size="small"
          loading={getRankLoading}
          title="团购单利润排名"
        >
          <List
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
                        发起日期：{dayjs(item.groupBuyStartDate).format('YYYY-MM-DD')}
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
        </Card>
      </Col>
      <Col span={24}>
        <Card
          size="small"
          loading={getRankLoading}
          title="供货商活跃度排名"
        >
          <List
            dataSource={supplierRankByGroupBuyCount}
            renderItem={(item: SupplierRankByGroupBuyCountItem, index) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <span className="text-gray-800">
                      <span className="font-bold">{index + 1}.</span> {item.name}
                    </span>
                  }
                  description={
                    <div>
                      团购数: <span className="text-blue-500">{item.groupBuyCount}</span>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      </Col>
    </Row>
  )
}
