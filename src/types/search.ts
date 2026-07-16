// types/search.ts
// 搜索表单类型（从各 .vue 文件迁移至此）

/** 可回收出库资产搜索表单 */
export interface RecyclableOutAssetsSearchForm {
  asset_code?: string
  asset_name?: string
  contract_code?: string
}

/** 可报废资产搜索表单 */
export interface ScrapableAssetsSearchForm {
  asset_code?: string
  asset_name?: string
}

/** 已报废资产搜索表单 */
export interface WastedAssetsSearchForm {
  asset_code?: string
  asset_name?: string
  waste_date_start?: string
  waste_date_end?: string
}

/** 合同表单数据（扩展自合同创建表单） */
export interface ContractFormData {
  contract_code: string
  contract_name: string
  contract_type: string
  contract_amount: number | null
  contract_start_date: string
  contract_end_date: string
  supplier_name: string
  contract_status: string
  settlemented_price: number | null
  contract_total_quantity: number | null
  contract_description: string
}
