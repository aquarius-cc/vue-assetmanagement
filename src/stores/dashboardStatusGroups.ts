/**
 * 仪表盘状态分组定义（自 stores/dashboard.ts 物理提取，零逻辑变更）
 *
 * 状态分组：正常资产 / 异常资产 / 报废流程
 * 每项包含：状态码、中文标签、颜色、所属分组
 *
 * 【BF-110 ③】颜色值不再内联 hex，统一取 STATUS_COLOR_MAP（单一来源，防漂移）；
 * CHART_ORDER 自 dashboard.ts statusOverview 内联数组物理提取，渲染顺序零逻辑变更。
 */
import { STATUS_COLOR_MAP } from '@/utils/statusMapping'

export const STATUS_GROUPS = {
  normal: {
    label: '正常资产',
    color: STATUS_COLOR_MAP.success,
    items: ['in_store', 'in_use', 'recycled_pending'] as string[],
  },
  abnormal: {
    label: '异常资产',
    color: STATUS_COLOR_MAP.warning,
    items: ['broken', 'repairing', 'lost'] as string[],
  },
  scrap: {
    label: '报废流程',
    color: STATUS_COLOR_MAP.info,
    items: ['damaged', 'scrapped'] as string[],
  },
} as const

/** 图表扇区统一渲染顺序（8 态业务排序，自 dashboard.ts 内联数组提取） */
export const CHART_ORDER = [
  'in_use',
  'in_store',
  'recycled_pending',
  'broken',
  'repairing',
  'lost',
  'damaged',
  'scrapped',
] as const
