/**
 * @file 已报废资产 Store，基于 createEntityStore 工厂创建
 * @module stores/wasteAssetStore
 * @exports
 *   - useWasteAssetStore: 已报废资产管理状态 Store
 * @callers
 *   - services/assetLifecycleService.ts
 *   - components/componentsdetails/WasteAssetDetails.vue
 *   - components/componentsdetails/detils/WasteAssetForm.vue
 *   - components/componentsdetails/detils/WasteAssetBasicDetails.vue
 * @dependsOn
 *   - api/wasteAsset: 报废资产 API 接口
 *   - stores/createEntityStore: 实体 Store 工厂
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { wasteAssetAPI } from '@/api/wasteAsset'
import type { WasteAsset, WasteAssetCreateForm, WasteAssetUpdateForm } from '@/types/wasteasset'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'

/**
 * 报废资产 Store
 */
export const useWasteAssetStore = createEntityStore<WasteAsset, PaginationQuery>('wasteAsset', {
  idKey: 'asset_code',
  nameField: 'asset_name',
  displayName: '已报废资产',
  api: {
    getList: async (params?: PaginationQuery) => {
      const safeParams: PaginationQuery = params || {
        page: 1,
        page_size: 10,
      }
      const response = await wasteAssetAPI.getWasteAssets(safeParams)
      return {
        count: response.count,
        next: response.next,
        previous: response.previous,
        results: response.results as WasteAsset[],
      }
    },
    getById: (code) => wasteAssetAPI.getWasteAsset(code),
    create: (data) => wasteAssetAPI.createWasteAsset(data as WasteAssetCreateForm),
    update: (data) =>
      wasteAssetAPI.updateWasteAsset(data.asset_code!, data as WasteAssetUpdateForm),
    delete: (code) => wasteAssetAPI.deleteWasteAsset(code),
    batchDelete: (codes) => wasteAssetAPI.batchDeleteWasteAssets(codes),
  },
  message: ElMessage,
  idToString: (code) => String(code),
  enablePagination: true,
  defaultPageSize: 20,
  enableCache: false,
})
