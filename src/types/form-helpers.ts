// types/form-helpers.ts
// 表单辅助类型（从各 .vue 文件迁移至此）

/** 资产建议项 */
export interface AssetSuggestion {
  value: string
  asset_code: string
  asset_name: string
}

/** 合同建议项 */
export interface ContractFormSuggestion {
  value: string
  contract_code: string
  contract_name: string
  recordcode: string
}

/** 仓库建议项 */
export interface StorageSuggestion {
  value: string
  storage_code: string
  storage_name: string
}

/** 资产类型建议项 */
export interface AssetTypeSuggestion {
  value: string
  type_code: string
  type_name: string
}

/** 资产类型树节点 */
export interface AssetTypeTreeNode {
  id: number
  type_code: string
  type_name: string
  parent: number | null
  children?: AssetTypeTreeNode[]
}

/** El-Tree 节点 */
export interface ElTreeNode {
  id: number
  label: string
  children?: ElTreeNode[]
}

/** El-Tree store */
export interface ElTreeStore {
  currentNodeKey: number | null
  setCurrentNodeKey: (key: number | null) => void
}

/** 时间线条目 */
export interface TimelineItem {
  timestamp: string
  content: string
  type?: string
}

/** 操作日志变更记录 */
export interface ChangeRecord {
  field: string
  old_value: string
  new_value: string
}

/** 部门表单项 */
export interface DepartmentFormItem {
  label: string
  value: string | number
}
