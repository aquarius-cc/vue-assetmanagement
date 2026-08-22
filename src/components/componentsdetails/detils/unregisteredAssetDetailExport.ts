/**
 * 未登记资产详情页：状态映射辅助函数 + Excel 导出列配置
 * （自 UnregisteredAssetBasicDetails.vue 物理提取，零逻辑变更）
 */
import type { ColumnConfig } from '@/utils/excelExporter'
import type { UnregisteredAsset } from '@/types/unregisteredasset'
import {
  scenarioTypeTextMap,
  scenarioTypeTagMap,
  handleTypeTextMap,
} from '@/types/unregisteredasset'
import { formatDate } from '@/utils/Format'
import { getApprovalStatusText } from '@/utils/statusMapping'

// ===== 场景类型辅助函数 =====
export const getScenarioTypeText = (type: string | null | undefined): string => {
  if (!type) return '未知'
  return scenarioTypeTextMap[type] || '未知'
}

export const getScenarioTypeTagType = (
  type: string | null | undefined,
): '' | 'success' | 'warning' | 'danger' | 'info' => {
  if (!type) return 'info'
  return (scenarioTypeTagMap[type] as '' | 'success' | 'warning' | 'danger' | 'info') || 'info'
}

// ===== 处理类型辅助函数 =====
export const getHandleTypeText = (type: string | null | undefined): string => {
  if (!type) return '未处理'
  return handleTypeTextMap[type] || type
}

// ===== Excel 导出列配置 =====
export const unregisteredAssetExportColumns: ColumnConfig<UnregisteredAsset>[] = [
  { title: 'ID', key: 'id', default: '' },
  { title: '编码', key: 'unregistered_code', default: '' },
  { title: '资产名称', key: 'asset_name', default: '' },
  {
    title: '场景类型',
    key: 'scenario_type',
    default: '',
    formatter: (v) => getScenarioTypeText(v as string),
  },
  {
    title: '发现日期',
    key: 'discovery_date',
    default: '',
    formatter: (v) => formatDate(v as string) || '',
  },
  { title: '发现地点', key: 'discovery_location', default: '' },
  { title: '资产品牌', key: 'asset_brand', default: '' },
  { title: '资产规格型号', key: 'asset_specification', default: '' },
  { title: '资产类型编码', key: 'unregistered_asset_type', default: '' },
  { title: '预估价值', key: 'estimated_value', default: '' },
  {
    title: '关联资产编码',
    key: 'related_asset',
    default: '',
    formatter: (v) => {
      if (typeof v === 'object' && v !== null) return (v as { code?: string }).code ?? ''
      return (v as string) || ''
    },
  },
  { title: '目标仓库编码', key: 'unregistered_asset_storage', default: '' },
  {
    title: '审批状态',
    key: 'approval_status',
    default: '',
    formatter: (v) => getApprovalStatusText((v as string) ?? ''),
  },
  {
    title: '审批人',
    key: 'approver',
    default: '',
    formatter: (v) => {
      if (typeof v === 'object' && v !== null) return (v as { name?: string }).name ?? ''
      return (v as string) || ''
    },
  },
  { title: '审批备注', key: 'approval_remark', default: '' },
  {
    title: '处理类型',
    key: 'handle_type',
    default: '',
    formatter: (v) => getHandleTypeText(v as string),
  },
  { title: '处理描述', key: 'handle_description', default: '' },
  {
    title: '创建时间',
    key: 'created_at',
    default: '',
    formatter: (v) => formatDate(v as string) || '',
  },
  {
    title: '更新时间',
    key: 'updated_at',
    default: '',
    formatter: (v) => formatDate(v as string) || '',
  },
  {
    title: '处理时间',
    key: 'approval_date',
    default: '',
    formatter: (v) => formatDate(v as string) || '',
  },
]
