import type { StatisticProps } from 'antd'
import { Card, Col, Row, Statistic } from 'antd'
import { useEffect } from 'react'
import CountUp from 'react-countup'

import useAnalysisStore from '@/stores/analysisStore'
import useGlobalSettingStore from '@/stores/globalSettingStore'

import { GroupBuyOrderTrendChart } from './GroupBuyOrderTrendChart'
import { PriceProfitTrendChart } from './PriceProfitTrendChart'

type OverviewProps = {
  startDate?: Date
  endDate?: Date
}

export const Overview = ({ startDate, endDate }: OverviewProps) => {
  const getCountLoading = useAnalysisStore(state => state.getCountLoading)
  const groupBuyCount = useAnalysisStore(state => state.count.groupBuyCount)
  const orderCount = useAnalysisStore(state => state.count.orderCount)
  const totalPrice = useAnalysisStore(state => state.count.totalPrice)
  const totalProfit = useAnalysisStore(state => state.count.totalProfit)
  const getCount = useAnalysisStore(state => state.getCount)
  const globalSetting = useGlobalSettingStore(state => state.globalSetting)

  const formatter: StatisticProps['formatter'] = value => (
    <CountUp
      end={value as number}
      separator=","
      duration={1.2}
      decimals={2}
    />
  )

  // 初始化与日期变化时获取概览数据
  useEffect(() => {
    if (startDate && endDate) {
      getCount({ startDate, endDate })
    } else {
      getCount({})
    }
  }, [startDate, endDate])

  return (
    <Row
      className="w-full"
      gutter={[8, 8]}
    >
      <Col span={12}>
        <Card
          size="small"
          loading={getCountLoading}
        >
          <Statistic
            title="团购单量"
            value={groupBuyCount}
            formatter={val => (
              <CountUp
                end={val as number}
                separator=","
                duration={1.2}
              />
            )}
          />
        </Card>
      </Col>
      <Col span={12}>
        <Card
          size="small"
          loading={getCountLoading}
        >
          <Statistic
            title="订单量"
            value={orderCount}
            formatter={val => (
              <CountUp
                end={val as number}
                separator=","
                duration={1.2}
              />
            )}
          />
        </Card>
      </Col>
      <Col span={12}>
        <Card
          size="small"
          loading={getCountLoading}
        >
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
          <Card
            size="small"
            loading={getCountLoading}
          >
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
        <GroupBuyOrderTrendChart />
      </Col>
      <Col span={24}>
        <PriceProfitTrendChart />
      </Col>
    </Row>
  )
}
