import type { StatisticProps } from 'antd'
import { Card, Col, Row, Statistic } from 'antd'
import CountUp from 'react-countup'

import useGlobalSettingStore from '@/stores/globalSettingStore'

import { GroupBuyOrderTrendChart } from './GroupBuyOrderTrendChart'
import { PriceProfitTrendChart } from './PriceProfitTrendChart'

interface IOverviewProps {
  getCountLoading: boolean
  groupBuyCount: number
  orderCount: number
  totalPrice: number
  totalProfit: number
  groupBuyTrend: any[]
  orderTrend: any[]
  priceTrend: any[]
  profitTrend: any[]
}

export const Overview = (props: IOverviewProps) => {
  const {
    getCountLoading,
    groupBuyCount,
    orderCount,
    totalPrice,
    totalProfit,
    groupBuyTrend,
    orderTrend,
    priceTrend,
    profitTrend
  } = props
  const globalSetting = useGlobalSettingStore(state => state.globalSetting)

  const formatter: StatisticProps['formatter'] = value => (
    <CountUp
      end={value as number}
      separator=","
    />
  )

  return (
    <Row
      className="w-full"
      gutter={[8, 8]}
    >
      <Col span={12}>
        <Card loading={getCountLoading}>
          <Statistic
            title="团购单量"
            value={groupBuyCount}
            formatter={formatter}
          />
        </Card>
      </Col>
      <Col span={12}>
        <Card loading={getCountLoading}>
          <Statistic
            title="订单量"
            value={orderCount}
            formatter={formatter}
          />
        </Card>
      </Col>
      <Col span={12}>
        <Card loading={getCountLoading}>
          <Statistic
            title="总销售额"
            value={totalPrice}
            precision={2}
            prefix="¥"
            formatter={formatter}
          />
        </Card>
      </Col>
      {!globalSetting?.value?.sensitive && (
        <Col span={12}>
          <Card loading={getCountLoading}>
            <Statistic
              title="总利润"
              value={totalProfit}
              precision={2}
              prefix="¥"
              formatter={formatter}
            />
          </Card>
        </Col>
      )}
      <Col span={24}>
        <GroupBuyOrderTrendChart
          groupBuyTrend={groupBuyTrend}
          orderTrend={orderTrend}
          loading={getCountLoading}
        />
      </Col>
      <Col span={24}>
        <PriceProfitTrendChart
          priceTrend={priceTrend}
          profitTrend={profitTrend}
          loading={getCountLoading}
          sensitive={globalSetting?.value?.sensitive}
        />
      </Col>
    </Row>
  )
}
