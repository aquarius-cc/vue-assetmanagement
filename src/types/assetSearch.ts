/**
 * [批次4 C4/M-14] 4 个搜索组件 SearchForm 唯一类型源（键名逐字保留，DR-1/DR-4 收敛）。
 * 消费方：ScrapableAssetsSearch / RecyclableOutAssetsSearch / WastedAssetsSearch /
 * ExportableAssetsSearch（模板 v-model 键名不变）。
 */

/** 四个搜索组件共有的基础字段 */
interface AssetSearchBase {
  asset_code: string
  asset_name: string
  asset_specification: string
  asset_brand: string
}

export interface ScrapableSearchForm extends AssetSearchBase {
  asset_storage_name: string
  asset_contract_code: string
  asset_contract_name: string
}

export interface ExportableSearchForm extends AssetSearchBase {
  asset_contract_code: string
  asset_contract_name: string
}

export interface RecyclableOutSearchForm extends AssetSearchBase {
  outasset_applicant_name: string
  outasset_manager_name: string
  department: string
}

export interface WastedSearchForm extends AssetSearchBase {
  contract_name: string
  contract_code: string
}
