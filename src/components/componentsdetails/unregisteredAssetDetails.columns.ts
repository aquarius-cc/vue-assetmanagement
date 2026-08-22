/**
 * 表格列配置（自 UnregisteredAssetDetails.vue 物理提取，零逻辑变更）
 */
import type { TableColumn } from '@/types/list'

// ===== 表格列配置 =====
/**
 * 表格列定义
 * 每一列的渲染方式、标题、宽度等属性
 */
export const unregisteredAssetColumns: TableColumn[] = [
  { type: 'index', label: '序号', width: 60, align: 'center' },
  { prop: 'unregistered_code', label: '编码', width: 150, align: 'center' },
  { prop: 'asset_name', label: '资产名称', width: 150, align: 'left' },
  {
    type: 'custom',
    prop: 'scenario_type',
    label: '场景类型',
    width: 120,
    align: 'center',
    slotName: 'scenario_type',
  },
  {
    type: 'custom',
    prop: 'discovery_date',
    label: '发现日期',
    width: 120,
    align: 'center',
    slotName: 'discovery_date',
  },
  { prop: 'discovery_location', label: '发现地点', width: 150, align: 'left' },
  { prop: 'estimated_value', label: '预估价值', width: 100, align: 'center' },
  {
    type: 'custom',
    prop: 'approval_status',
    label: '审批状态',
    width: 100,
    align: 'center',
    slotName: 'approval_status',
  },
  { prop: 'handle_description', label: '描述', width: 150, align: 'left' },
]
