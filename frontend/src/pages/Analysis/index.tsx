import { CalendarOutlined, ClockCircleOutlined, HistoryOutlined } from '@ant-design/icons'
import { Button, Col, Row, Select } from 'antd'
import { CalendarPicker } from 'antd-mobile'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'

import useAnalysisStore from '@/stores/analysisStore.ts'

import { CustomerRankings } from './components/CustomerRankings' // 导入客户排行组件
import { GroupBuyRankings } from './components/GroupBuyRankings'
import { MergedGroupBuyOverview } from './components/MergedGroupBuyOverview'
import { Overview } from './components/Overview'
import { SupplierOverview } from './components/SupplierOverview'
import { SupplierRankings } from './components/SupplierRankings'

export const Component = () => {
  const [calendarValue, setCalendarValue] = useState<[Date, Date]>([
    dayjs().subtract(7, 'day').toDate(),
    dayjs().toDate()
  ])
  const [calendarVisible, setCalendarVisible] = useState(false)
  const [activeViewKey, setActiveViewKey] = useState('overview')
  const [isAllData, setIsAllData] = useState(false) // 是否查询全部数据

  const getCount = useAnalysisStore(state => state.getCount)
  const setIsAllDataInStore = useAnalysisStore(state => state.setIsAllData)
  const getGroupBuyRank = useAnalysisStore(state => state.getGroupBuyRank)
  const getCustomerRank = useAnalysisStore(state => state.getCustomerRank)
  const getSupplierRank = useAnalysisStore(state => state.getSupplierRank)
  const getMergedGroupBuyOverview = useAnalysisStore(state => state.getMergedGroupBuyOverview)
  const getSupplierOverview = useAnalysisStore(state => state.getSupplierOverview)

  // 自定义日期是否被选中（不为全部，且选择了时间，但不匹配任何预设快捷天数）
  const presetDays = [7, 14, 30, 90, 180, 360]
  const matchesAnyPreset =
    !isAllData &&
    !!calendarValue[0] &&
    !!calendarValue[1] &&
    presetDays.some(
      d =>
        dayjs().subtract(d, 'day').isSame(dayjs(calendarValue[0]), 'day') &&
        dayjs().isSame(dayjs(calendarValue[1]), 'day')
    )

  const isCustomSelected =
    !isAllData && !!calendarValue[0] && !!calendarValue[1] && !matchesAnyPreset

  const changeDateRange = (days: number) => {
    setCalendarValue([dayjs().subtract(days, 'day').toDate(), dayjs().toDate()])
    setIsAllData(false) // 选择具体天数时取消全部数据模式
    setIsAllDataInStore(false)
  }

  const changeToAllData = () => {
    setIsAllData(true)
    setIsAllDataInStore(true)
  }

  // 根据选中的视图动态调用对应的排行榜接口
  useEffect(() => {
    // 如果是全部数据模式，不传递时间参数
    const params = isAllData
      ? {}
      : {
          startDate: calendarValue[0],
          endDate: calendarValue[1]
        }

    switch (activeViewKey) {
      case 'overview':
        getCount(params)
        break
      case 'group-buy-rankings':
        getGroupBuyRank(params)
        break
      case 'customer-rankings':
        getCustomerRank(params)
        break
      case 'supplier-rankings':
        getSupplierRank(params)
        break
      case 'merged-group-buy-overview':
        getMergedGroupBuyOverview({
          ...(isAllData
            ? {}
            : {
                startDate: calendarValue[0],
                endDate: calendarValue[1]
              }),
          page: 1,
          pageSize: 10
        })
        break
      case 'supplier-overview':
        getSupplierOverview({
          ...(isAllData
            ? {}
            : {
                startDate: calendarValue[0],
                endDate: calendarValue[1]
              }),
          page: 1,
          pageSize: 10
        })
        break
    }
  }, [activeViewKey, calendarValue, isAllData])

  const viewComponents: Record<string, React.ReactNode> = {
    overview: <Overview />,
    'merged-group-buy-overview': (
      <MergedGroupBuyOverview
        {...(isAllData
          ? {}
          : {
              startDate: calendarValue[0],
              endDate: calendarValue[1]
            })}
      />
    ),
    'supplier-overview': (
      <SupplierOverview
        {...(isAllData
          ? {}
          : {
              startDate: calendarValue[0],
              endDate: calendarValue[1]
            })}
      />
    ),
    'group-buy-rankings': <GroupBuyRankings />,
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
          <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-gray-800">时间筛选</div>
                <div className="text-base text-gray-600">选择快捷时间或点击右侧按钮自定义范围</div>
              </div>
              <Button
                size="large"
                onClick={() => setCalendarVisible(true)}
                type={isCustomSelected ? 'primary' : 'default'}
                className={
                  isCustomSelected
                    ? '!scale-105 !transform !border-blue-600 !bg-blue-600 !text-white !shadow-2xl !ring-4 !ring-blue-200'
                    : ''
                }
                icon={<CalendarOutlined />}
                iconPosition="start"
              >
                自定义日期
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { days: 7, label: '7天', short: '7D', icon: <ClockCircleOutlined /> },
                { days: 14, label: '14天', short: '14D', icon: <ClockCircleOutlined /> },
                { days: 30, label: '30天', short: '30D', icon: <ClockCircleOutlined /> },
                { days: 90, label: '90天', short: '90D', icon: <ClockCircleOutlined /> },
                { days: 180, label: '180天', short: '180D', icon: <ClockCircleOutlined /> },
                { days: 360, label: '360天', short: '360D', icon: <ClockCircleOutlined /> },
                { days: null, label: '全部', short: '全部', isAll: true, icon: <HistoryOutlined /> }
              ].map(({ days, label, short, isAll, icon }) => {
                const isSelected = isAll
                  ? isAllData
                  : !isAllData &&
                    calendarValue[0] &&
                    calendarValue[1] &&
                    dayjs().subtract(days!, 'day').isSame(dayjs(calendarValue[0]), 'day') &&
                    dayjs().isSame(dayjs(calendarValue[1]), 'day')

                return (
                  <button
                    key={isAll ? 'all' : days}
                    onClick={isAll ? changeToAllData : () => changeDateRange(days!)}
                    className={`group relative flex min-w-[70px] flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all duration-300 ${
                      isSelected
                        ? 'scale-105 transform border-blue-600 bg-blue-600 text-white shadow-2xl ring-4 ring-blue-200'
                        : 'border-gray-200 bg-white text-gray-600 hover:scale-105 hover:border-blue-300 hover:text-blue-600 hover:shadow-lg'
                    }`}
                  >
                    <div className="text-lg">{icon}</div>
                    <span className="hidden text-xs font-semibold sm:inline">{label}</span>
                    <span className="text-xs font-semibold sm:hidden">{short}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </Col>
        <Col span={24}>
          <div className="rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
            <div className="flex items-center justify-center gap-2">
              <CalendarOutlined className="text-lg text-blue-500" />
              <span className="text-base font-medium text-gray-700">
                {isAllData
                  ? '当前统计范围：全部历史数据'
                  : `当前统计范围：${dayjs(calendarValue[0]).format('YYYY-MM-DD')} 至 ${dayjs(calendarValue[1]).format('YYYY-MM-DD')}`}
              </span>
            </div>
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
            label: '概览数据',
            options: [
              {
                value: 'overview',
                label: '整体概况'
              },
              {
                value: 'merged-group-buy-overview',
                label: '团购单（合并）概况'
              },
              {
                value: 'supplier-overview',
                label: '供货商概况'
              }
            ]
          },
          {
            label: '排行数据',
            options: [
              {
                value: 'group-buy-rankings',
                label: '团购单排行'
              },
              {
                value: 'customer-rankings',
                label: '客户排行'
              },
              {
                value: 'supplier-rankings',
                label: '供货商排行'
              }
            ]
          }
        ]}
      />
      <div className="mt-4 w-full">{viewComponents[activeViewKey]}</div>
    </>
  )
}
