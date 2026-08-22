/**
 * 表格列配置（自 ContractDetails.vue 物理提取，零逻辑变更）
 */
import type { TableColumn } from '@/types/list'

// ===== 表格列配置=====
/**
 * 表格列定义
 * 每一列的渲染方式、标题、宽度等属态 */
export const contractDetailColumns: TableColumn[] = [
  { type: 'index', label: '序号', width: 80, align: 'center' },
  { prop: 'contract_code', label: '合同编码', width: 150, align: 'center' },
  { prop: 'contract_name', label: '合同名称', width: 200, align: 'left' },
  {
    type: 'custom',
    prop: 'contract_type',
    label: '合同类型',
    width: 120,
    align: 'center',
    slotName: 'contract_type',
  },
  {
    type: 'custom',
    prop: 'contract_amount',
    label: '合同金额',
    width: 150,
    align: 'right',
    slotName: 'contract_amount',
  },
  { prop: 'supplier_name', label: '供应商', width: 150, align: 'left' },
  {
    type: 'custom',
    prop: 'contract_start_date',
    label: '签订日期',
    width: 150,
    align: 'center',
    slotName: 'contract_start_date',
  },
  {
    type: 'custom',
    prop: 'contract_status',
    label: '合同状态',
    width: 120,
    align: 'center',
    slotName: 'contract_status',
  },
  {
    type: 'custom',
    prop: 'settlemented_price',
    label: '结算价格',
    width: 150,
    align: 'right',
    slotName: 'settlemented_price',
  },
]
