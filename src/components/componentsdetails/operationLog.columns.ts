/**
 * 操作日志表格列配置（自 OperationLogDetails.vue 物理提取，零逻辑变更）
 */
import type { TableColumn } from '@/types/list'

/**
 * 表格列定义
 * 每一列的渲染方式、标题、宽度等属性
 */
export const operationLogColumns: TableColumn[] = [
  { type: 'index', label: '序号', width: 60, align: 'center' },
  {
    type: 'custom',
    prop: 'operation_type',
    label: '操作类型',
    width: 110,
    align: 'center',
    slotName: 'operation_type',
  },
  { prop: 'asset_code', label: '资产编码', width: 150, align: 'center' },
  { prop: 'asset_name', label: '资产名称', width: 150, align: 'left' },
  { prop: 'asset_specification', label: '资产规格', width: 150, align: 'left' },
  { prop: 'operator_name', label: '操作人', width: 100, align: 'center' },
  {
    type: 'custom',
    prop: 'operation_time',
    label: '操作时间',
    width: 170,
    align: 'center',
    slotName: 'operation_time',
  },
  { prop: 'description', label: '描述', width: 200, align: 'left' },
  { prop: 'ip_address', label: 'IP地址', width: 130, align: 'center' },
]
