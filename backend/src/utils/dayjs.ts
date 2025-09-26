import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

// 统一扩展 dayjs 插件，集中管理时间相关能力
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);

export default dayjs;
