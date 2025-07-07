import { CalendarOutlined } from '@ant-design/icons'
import type { StatisticProps } from 'antd'
import { Button, Card, Col, Row, Statistic } from 'antd'
import { CalendarPicker } from 'antd-mobile'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import CountUp from 'react-countup'

import useAnalysisStore from '@/stores/analysisStore.ts'
import useGlobalSettingStore from '@/stores/globalSettingStore.ts'

export const Component = () => {
  const [calendarValue, setCalendarValue] = useState<[Date, Date]>([
    dayjs().subtract(7, 'day').toDate(),
    dayjs().toDate()
  ])
  const [calendarVisible, setCalendarVisible] = useState(false)

  const { groupBuyCount, orderCount, totalPrice, totalProfit } = useAnalysisStore(
    state => state.count
  )
  const getCountLoading = useAnalysisStore(state => state.getCountLoading)
  const getCount = useAnalysisStore(state => state.getCount)
  const globalSetting = useGlobalSettingStore(state => state.globalSetting)

  useEffect(() => {
    getCount({
      startDate: calendarValue[0],
      endDate: calendarValue[1]
    })
  }, [calendarValue])

  const formatter: StatisticProps['formatter'] = value => (
    <CountUp
      end={value as number}
      separator=","
    />
  )

  return (
    <>
      <Row
        className="mb-2 w-full"
        gutter={[8, 8]}
      >
        <Col span={24}>
          <Button
            size="large"
            className="w-full"
            onClick={() => setCalendarVisible(true)}
            type="primary"
            icon={<CalendarOutlined />}
            iconPosition="start"
          >
            选择统计日期范围（默认最近7天）
          </Button>
          <CalendarPicker
            selectionMode="range"
            weekStartsOn="Monday"
            min={dayjs('2025-06-01').toDate()}
            visible={calendarVisible}
            defaultValue={calendarValue}
            onClose={() => setCalendarVisible(false)}
            onMaskClick={() => setCalendarVisible(false)}
            onConfirm={val => {
              if (val) {
                setCalendarValue([
                  dayjs(val[0]).startOf('day').toDate(),
                  dayjs(val[1]).endOf('day').toDate()
                ])
              }
            }}
          />
        </Col>
      </Row>
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
      </Row>
    </>
  )
}
