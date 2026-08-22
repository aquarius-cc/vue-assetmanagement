/**
 * 未登记资产表单「三向联动」逻辑（自 UnregisteredAssetForm.vue 物理提取，零逻辑变更）
 *
 * 包含：资产类型编码联动、关联资产编码联动、目标仓库编码联动的
 * 建议获取器（createSuggestionFetcher）与选择/变更处理函数。
 * 表单对象以参数注入，处理函数对表单字段的写入行为保持一致。
 */
import type { AssetDetail } from '@/types/asset'
import type { AssetType } from '@/types/assettype'
import type { Storage } from '@/types/storage'
import type { AssetTypeSuggestion } from '@/types/form-helpers'
import { createSuggestionFetcher } from '@/composables/useSuggestionFetcher'

/** 表单所需的最小字段类型（与组件内 FormDataType 一致） */
export interface UnregisteredFormFields {
  asset_type_code_display: string
  asset_type_code: string
  related_asset_code_display: string
  related_asset_code: string
  target_storage_code_display: string
  target_storage_code: string
}

/** 联动所需的 store 最小接口 */
export interface UnregisteredFormLinkageStores {
  assetStore: { getByName: (query: string) => Promise<AssetDetail[]> }
  assetTypeStore: {
    getList: (q: { search: string; page: number; page_size: number }) => Promise<AssetType[]>
  }
  storageStore: {
    getList: (q: { search: string; page: number; page_size: number }) => Promise<Storage[]>
  }
}

/**
 * @param form - reactive 表单对象
 * @param stores - 三个 store 实例
 */
export function useUnregisteredFormLinkage(
  form: UnregisteredFormFields,
  stores: UnregisteredFormLinkageStores,
) {
  const { assetStore, assetTypeStore, storageStore } = stores

  // ===== 资产类型编码联动 =====
  const fetchAssetTypeSuggestions = createSuggestionFetcher<AssetType, AssetTypeSuggestion>({
    fetchData: async (query: string) => {
      const response = await assetTypeStore.getList({ search: query, page: 1, page_size: 20 })
      return response
    },
    transform: (assetType: AssetType): AssetTypeSuggestion => ({
      value: assetType.type_code,
      type_code: assetType.type_code,
      type_name: assetType.type_name,
    }),
  })

  const handleAssetTypeSelect = (item: AssetTypeSuggestion) => {
    form.asset_type_code_display = item.type_code
    form.asset_type_code = item.type_code
  }

  const handleAssetTypeCodeChange = (value: string) => {
    if (!value.trim()) {
      form.asset_type_code = ''
    }
  }

  // ===== 关联资产编码联动 =====
  interface AssetSuggestion {
    value: string
    asset_name: string
    asset_code: string
    asset_specification: string | null
  }

  const fetchAssetSuggestions = createSuggestionFetcher<AssetDetail, AssetSuggestion>({
    fetchData: (query: string) => assetStore.getByName(query),
    transform: (asset: AssetDetail): AssetSuggestion => ({
      value: asset.asset_code,
      asset_name: asset.asset_name,
      asset_code: asset.asset_code,
      asset_specification: asset.asset_specification,
    }),
  })

  const handleRelatedAssetSelect = (item: AssetSuggestion) => {
    form.related_asset_code_display = item.asset_code
    form.related_asset_code = item.asset_code
  }

  const handleRelatedAssetCodeChange = (value: string) => {
    if (!value.trim()) {
      form.related_asset_code = ''
    }
  }

  // ===== 目标仓库编码联动 =====
  interface StorageSuggestion {
    value: string
    storage_name: string
    storage_code: string
    storage_address: string | null
  }

  const fetchStorageSuggestions = createSuggestionFetcher<Storage, StorageSuggestion>({
    fetchData: async (query: string) => {
      const response = await storageStore.getList({ search: query, page: 1, page_size: 20 })
      return response
    },
    transform: (storage: Storage): StorageSuggestion => ({
      value: storage.storage_code,
      storage_name: storage.storage_name,
      storage_code: storage.storage_code,
      storage_address: storage.storage_address,
    }),
  })

  const handleStorageSelect = (item: StorageSuggestion) => {
    form.target_storage_code_display = item.storage_code
    form.target_storage_code = item.storage_code
  }

  const handleStorageCodeChange = (value: string) => {
    if (!value.trim()) {
      form.target_storage_code = ''
    }
  }

  return {
    fetchAssetTypeSuggestions,
    handleAssetTypeSelect,
    handleAssetTypeCodeChange,
    fetchAssetSuggestions,
    handleRelatedAssetSelect,
    handleRelatedAssetCodeChange,
    fetchStorageSuggestions,
    handleStorageSelect,
    handleStorageCodeChange,
  }
}
