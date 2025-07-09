import { CalendarOutlined } from '@ant-design/icons'
import type { StatisticProps } from 'antd'
import { Button, Card, Col, Row, Statistic, Tabs } from 'antd'
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
  const [activeTabKey, setActiveTabKey] = useState('overview')

  const { groupBuyCount, orderCount, totalPrice, totalProfit } = useAnalysisStore(
    state => state.count
  )
  const getCountLoading = useAnalysisStore(state => state.getCountLoading)
  const getCount = useAnalysisStore(state => state.getCount)
  const globalSetting = useGlobalSettingStore(state => state.globalSetting)

  const changeDateRange = (days: number) => {
    setCalendarValue([dayjs().subtract(days, 'day').toDate(), dayjs().toDate()])
  }

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
            选择统计范围
          </Button>
        </Col>
        <Col span={24}>
          <div className="text-center text-sm text-gray-500">
            点击上方按钮自定义日期范围，或选择下方快捷时间
          </div>
        </Col>
        <Col span={24}>
          <Row gutter={[8, 8]}>
            <Col span={6}>
              <Button
                className="w-full"
                onClick={() => changeDateRange(7)}
              >
                7天
              </Button>
            </Col>
            <Col span={6}>
              <Button
                className="w-full"
                onClick={() => changeDateRange(30)}
              >
                30天
              </Button>
            </Col>
            <Col span={6}>
              <Button
                className="w-full"
                onClick={() => changeDateRange(90)}
              >
                90天
              </Button>
            </Col>
            <Col span={6}>
              <Button
                className="w-full"
                onClick={() => changeDateRange(180)}
              >
                180天
              </Button>
            </Col>
          </Row>
        </Col>
        <Col span={24}>
          <div className="mt-1 w-full text-center text-gray-500">
            当前统计范围：{dayjs(calendarValue[0]).format('YYYY-MM-DD')} 至{' '}
            {dayjs(calendarValue[1]).format('YYYY-MM-DD')}
          </div>
        </Col>
        <Col span={24}>
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
      <Tabs
        className="w-full"
        type="card"
        activeKey={activeTabKey}
        onChange={setActiveTabKey}
        items={[
          {
            key: 'overview',
            label: '概况',
            children: (
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
            )
          }
        ]}
      />
    </>
  )
}
