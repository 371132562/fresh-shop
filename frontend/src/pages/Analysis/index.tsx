import { CalendarOutlined } from '@ant-design/icons'
import { Button, Col, Row, Select } from 'antd'
import { CalendarPicker } from 'antd-mobile'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'

import useAnalysisStore from '@/stores/analysisStore.ts'

import { CustomerRankings } from './components/CustomerRankings' // 导入客户排行组件
import { GroupBuyRankings } from './components/GroupBuyRankings'
import { MergedGroupBuyRankings } from './components/MergedGroupBuyRankings'
import { Overview } from './components/Overview'
import { SupplierRankings } from './components/SupplierRankings'

export const Component = () => {
  const [calendarValue, setCalendarValue] = useState<[Date, Date]>([
    dayjs().subtract(7, 'day').toDate(),
    dayjs().toDate()
  ])
  const [calendarVisible, setCalendarVisible] = useState(false)
  const [activeViewKey, setActiveViewKey] = useState('overview')

  const getCount = useAnalysisStore(state => state.getCount)
  const getGroupBuyRank = useAnalysisStore(state => state.getGroupBuyRank)
  const getMergedGroupBuyRank = useAnalysisStore(state => state.getMergedGroupBuyRank)
  const getCustomerRank = useAnalysisStore(state => state.getCustomerRank)
  const getSupplierRank = useAnalysisStore(state => state.getSupplierRank)

  const changeDateRange = (days: number) => {
    setCalendarValue([dayjs().subtract(days, 'day').toDate(), dayjs().toDate()])
  }

  useEffect(() => {
    getCount({
      startDate: calendarValue[0],
      endDate: calendarValue[1]
    })
  }, [calendarValue])

  // 根据选中的视图动态调用对应的排行榜接口
  useEffect(() => {
    const params = {
      startDate: calendarValue[0],
      endDate: calendarValue[1]
    }

    switch (activeViewKey) {
      case 'group-buy-rankings':
        getGroupBuyRank(params)
        break
      case 'merged-group-buy-rankings':
        getMergedGroupBuyRank(params)
        break
      case 'customer-rankings':
        getCustomerRank(params)
        break
      case 'supplier-rankings':
        getSupplierRank(params)
        break
      case 'overview':
        // 概况页面的数据已在上面的useEffect中处理
        break
    }
  }, [activeViewKey, calendarValue])

  const viewComponents: Record<string, React.ReactNode> = {
    overview: <Overview />,
    'group-buy-rankings': <GroupBuyRankings />,
    'merged-group-buy-rankings': (
      <MergedGroupBuyRankings
        startDate={calendarValue[0]}
        endDate={calendarValue[1]}
      />
    ),
    'customer-rankings': <CustomerRankings />,
    'supplier-rankings': <SupplierRankings />
  }

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
            <Col span={4}>
              <Button
                className="w-full"
                onClick={() => changeDateRange(7)}
              >
                7天
              </Button>
            </Col>
            <Col span={4}>
              <Button
                className="w-full"
                onClick={() => changeDateRange(14)}
              >
                14天
              </Button>
            </Col>
            <Col span={4}>
              <Button
                className="w-full"
                onClick={() => changeDateRange(30)}
              >
                30天
              </Button>
            </Col>
            <Col span={4}>
              <Button
                className="w-full"
                onClick={() => changeDateRange(90)}
              >
                90天
              </Button>
            </Col>
            <Col span={4}>
              <Button
                className="w-full"
                onClick={() => changeDateRange(180)}
              >
                180天
              </Button>
            </Col>
            <Col span={4}>
              <Button
                className="w-full"
                onClick={() => changeDateRange(360)}
              >
                360天
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
            min={dayjs('2025-05-01').toDate()}
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
      <Select
        className="w-full"
        value={activeViewKey}
        onChange={setActiveViewKey}
        options={[
          {
            value: 'overview',
            label: '概况'
          },
          {
            value: 'group-buy-rankings',
            label: '团购单排行'
          },
          {
            value: 'merged-group-buy-rankings',
            label: '团购单（合并）排行'
          },
          {
            value: 'customer-rankings',
            label: '客户排行'
          },
          {
            value: 'supplier-rankings',
            label: '供货商排行'
          }
        ]}
      />
      <div className="mt-4 w-full">{viewComponents[activeViewKey]}</div>
    </>
  )
}
