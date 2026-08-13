/**
 * @file 故障资产 Store，基于 createEntityStore 工厂创建
 * @module stores/brokenAssetStore
 * @exports
 *   - useBrokenAssetStore: 故障资产管理状态 Store
 * @callers
 *   - components/componentsdetails/BrokenAssetDetails.vue
 * @dependsOn
 *   - api/brokenAsset: 故障资产 API 接口
 *   - stores/createEntityStore: 实体 Store 工厂
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { brokenAssetAPI } from '@/api/brokenAsset'
import type {
  BrokenAssetExtended,
  BrokenAssetCreateForm,
  BrokenAssetUpdateForm,
} from '@/types/brokenasset'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'

export const useBrokenAssetStore = createEntityStore<BrokenAssetExtended, PaginationQuery>(
  'brokenAsset',
  {
    idKey: 'recordcode',
    nameField: 'asset_name',
    displayName: 'Broken Asset',
    api: {
      getList: async (params?: PaginationQuery) => {
        const safeParams: PaginationQuery = params || {
          page: 1,
          page_size: 10,
        }
        const response = await brokenAssetAPI.getBrokenAssets(safeParams)
        return {
          count: response.count,
          next: response.next,
          previous: response.previous,
          results: response.results as BrokenAssetExtended[],
        }
      },
      getById: (code) => brokenAssetAPI.getBrokenAssetByCode(code),
      create: (data) => brokenAssetAPI.createBrokenAsset(data as BrokenAssetCreateForm),
      update: (data) => brokenAssetAPI.updateBrokenAsset(data as BrokenAssetUpdateForm),
      delete: (code) => brokenAssetAPI.deleteBrokenAsset(code),
      batchDelete: (codes) => brokenAssetAPI.batchDeleteBrokenAssets(codes),
    },
    message: ElMessage,
    enablePagination: true,
    defaultPageSize: 20,
    enableCache: false,
  },
)
