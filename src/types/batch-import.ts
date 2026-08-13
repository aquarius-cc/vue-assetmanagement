/**
 * @file 批量导入 Excel 行类型定义，包括各类资产、合同、部门等导入行接口
 * @module types/batch-import
 * @exports
 *   - AssetExcelRow: 资产批量导入行接口
 *   - ContractExcelRow: 合同批量导入行接口
 *   - AssetTypeExcelRow: 资产类型批量导入行接口
 *   - StorageExcelRow: 仓库批量导入行接口
 *   - OutAssetExcelRow: 出库批量导入行接口
 *   - DamagedAssetExcelRow: 损坏资产批量导入行接口
 *   - UnregisteredAssetExcelRow: 未登记资产批量导入行接口
 *   - DepartmentExcelRow: 部门批量导入行接口
 * @callers
 *   - composables/*（组合式函数）
 *   - components/*（组件）
 *   - views/*（页面视图）
 */

/** 资产批量导入行 */
export interface AssetExcelRow {
  asset_code?: string
  asset_name: string
  asset_specification: string
  asset_brand?: string
  asset_unit?: string
  asset_purchase_price: number | string
  asset_purchase_number: number | string
  asset_purchase_date?: string
  asset_warranty_period?: number | string
  asset_entry_date: string
  asset_current_status?: string
  asset_type: string
  asset_entry_person?: string
  asset_contract?: string
  asset_applicant?: string
  asset_manager?: string
  asset_using_location?: string
  asset_storage?: string
  asset_description?: string
}

/** 合同批量导入行（字段名与后端 Contract 模型保持一致） */
export interface ContractExcelRow {
  contract_code: string
  contract_name: string
  supplier_name: string
  contract_amount: number | string
  contract_start_date: string
  contract_type: string
  contract_warranty_period: number | string
  initial_check_date?: string
  final_check_date?: string
  contract_status: string
  settlemented_price?: number | string
  amount_paid?: number | string
  paid_record?: string
}

/** 资产类型批量导入行 */
export interface AssetTypeExcelRow {
  type_code: string
  type_name: string
  parent_type_code?: string
  level?: string
  type_description?: string
  sort_order?: string
}

/** 仓库批量导入行 */
export interface StorageExcelRow {
  storage_code: string
  storage_name: string
  storage_address?: string
  storage_type?: string
  storage_description?: string
}

/** 出库批量导入行 */
export interface OutAssetExcelRow {
  outasset_code: string
  outasset_number: number | string
  outasset_current_status?: string
  outasset_date: string
  return_date?: string
  outasset_type?: string
  outasset_description?: string
  outasset_name?: string
  outasset_applicant_name?: string
  outasset_manager_name?: string
  outasset_storage?: string
}

/** 损坏资产批量导入行 */
export interface DamagedAssetExcelRow {
  damaged_asset_code: string
  damaged_asset_number: number | string
  damaged_asset_storage_code: string
  damaged_asset_contract_code?: string
  damaged_date?: string
  approval_status?: string
  approver?: string
  damaged_asset_description?: string
}

/** 未登记资产批量导入行 */
export interface UnregisteredAssetExcelRow {
  scenario_type: string
  discovery_date: string
  discovery_location: string
  asset_name: string
  asset_brand?: string
  asset_specification?: string
  asset_type_code?: string
  estimated_value?: number | string
  related_asset_code?: string
  target_storage_code?: string
  handle_description?: string
}

/** 部门批量导入行 */
export interface DepartmentExcelRow {
  department_code: string
  department_name: string
  department_information: string
}
