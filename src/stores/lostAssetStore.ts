/**
 * @file 遗失资产 Store，基于 createEntityStore 工厂创建
 * @module stores/lostAssetStore
 * @exports
 *   - useLostAssetStore: 遗失资产管理状态 Store
 * @callers
 *   - components/componentsdetails/LostAssetDetails.vue
 * @dependsOn
 *   - api/lostAsset: 遗失资产 API 接口
 *   - stores/createEntityStore: 实体 Store 工厂
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { lostAssetAPI } from '@/api/lostAsset'
import type { LostAssetExtended, LostAssetCreateForm, LostAssetUpdateForm } from '@/types/lostasset'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'

/**
 * 遗失资产 Store
 */
export const useLostAssetStore = createEntityStore<LostAssetExtended, PaginationQuery>(
  'lostAsset',
  {
    idKey: 'recordcode',
    nameField: 'asset_name',
    displayName: '遗失资产',
    api: {
      getList: async (params?: PaginationQuery) => {
        const safeParams: PaginationQuery = params || {
          page: 1,
          page_size: 10,
        }
        const response = await lostAssetAPI.getLostAssets(safeParams)
        return {
          count: response.count,
          next: response.next,
          previous: response.previous,
          results: response.results as LostAssetExtended[],
        }
      },
      getById: (code) => lostAssetAPI.getLostAssetByCode(code),
      create: (data) => lostAssetAPI.createLostAsset(data as LostAssetCreateForm),
      update: (data) => lostAssetAPI.updateLostAsset(data as LostAssetUpdateForm),
      delete: (code) => lostAssetAPI.deleteLostAsset(code),
      batchDelete: (codes) => lostAssetAPI.batchDeleteLostAssets(codes),
    },
    message: ElMessage,
    enablePagination: true,
    defaultPageSize: 20,
    enableCache: false,
  },
)
