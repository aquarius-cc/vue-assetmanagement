/**
 * 仪表盘状态分组定义（自 stores/dashboard.ts 物理提取，零逻辑变更）
 *
 * 状态分组：正常资产 / 异常资产 / 报废流程
 * 每项包含：状态码、中文标签、颜色、所属分组
 */
export const STATUS_GROUPS = {
  normal: {
    label: '正常资产',
    color: '#52C41A',
    items: ['in_store', 'in_use', 'recycled_pending'] as string[],
  },
  abnormal: {
    label: '异常资产',
    color: '#FAAD14',
    items: ['broken', 'repairing', 'lost'] as string[],
  },
  scrap: {
    label: '报废流程',
    color: '#909399',
    items: ['damaged', 'scrapped'] as string[],
  },
} as const
