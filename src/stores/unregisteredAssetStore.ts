/**
 * @file 未登记资产 Store，基于 createEntityStore 工厂创建
 * @module stores/unregisteredAssetStore
 * @exports
 *   - useUnregisteredAssetStore: 未登记资产管理状态 Store
 * @callers
 *   - components/componentsdetails/UnregisteredAssetDetails.vue
 *   - components/componentsdetails/detils/UnregisteredAssetForm.vue
 *   - components/componentsdetails/detils/UnregisteredAssetBatchImport.vue
 *   - components/componentsdetails/detils/UnregisteredAssetBasicDetails.vue
 * @dependsOn
 *   - api/unregisteredAsset: 未登记资产 API 接口
 *   - stores/createEntityStore: 实体 Store 工厂
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { unregisteredAssetAPI } from '@/api/unregisteredAsset'
import type {
  UnregisteredAsset,
  UnregisteredAssetCreateForm,
  UnregisteredAssetUpdateForm,
} from '@/types/unregisteredasset'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'

/**
 * 未登记资产 Store
 */
export const useUnregisteredAssetStore = createEntityStore<UnregisteredAsset, PaginationQuery>(
  'unregisteredAsset',
  {
    idKey: 'unregistered_code',
    nameField: 'asset_name',
    displayName: '未登记资产',
    api: {
      getList: async (params?: PaginationQuery) => {
        const safeParams: PaginationQuery = params || {
          page: 1,
          page_size: 10,
        }
        const response = await unregisteredAssetAPI.getUnregisteredAssets(safeParams)
        return {
          count: response.count,
          next: response.next,
          previous: response.previous,
          results: response.results as UnregisteredAsset[],
        }
      },
      getById: (code) => unregisteredAssetAPI.getUnregisteredAsset(code),
      create: (data) =>
        unregisteredAssetAPI.createUnregisteredAsset(data as UnregisteredAssetCreateForm),
      update: (data) =>
        unregisteredAssetAPI.updateUnregisteredAsset(
          data.unregistered_code!,
          data as UnregisteredAssetUpdateForm,
        ),
      delete: (code) => unregisteredAssetAPI.deleteUnregisteredAsset(code),
      batchDelete: (codes) => unregisteredAssetAPI.batchDeleteUnregisteredAssets(codes),
    },
    message: ElMessage,
    idToString: (code: unknown) => String(code),
    enablePagination: true,
    defaultPageSize: 20,
    enableCache: false,
  },
)
