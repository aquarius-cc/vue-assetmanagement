/**
 * 回收资产 Store
 *
 * 主键说明：
 * - 使用 outasset_recordcode 作为主键（与后端API一致）
 * - 不使用 id，因为后端API的所有操作都基于 outasset_recordcode
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { recycleAssetAPI } from '@/api/recycleAsset'
import type {
  RecycleAssetExtended,
  RecycleAssetCreateForm,
  RecycleAssetUpdateForm,
} from '@/utils/RecycleAsset'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'

/**
 * 回收资产 Store
 */
export const useRecycleAssetStore = createEntityStore<RecycleAssetExtended, PaginationQuery>(
  'recycleAsset',
  {
    // 使用 recordcode 作为主键（与后端API的lookup_field一致）
    idKey: 'recordcode',
    nameField: 'recycle_asset_name',
    displayName: '回收资产',
    api: {
      getList: async (params?: PaginationQuery) => {
        const safeParams: PaginationQuery = params || {
          page: 1,
          page_size: 10,
        }
        const response = await recycleAssetAPI.getRecycleAssets(safeParams)
        return {
          count: response.count,
          next: response.next,
          previous: response.previous,
          results: response.results as RecycleAssetExtended[],
        }
      },
      getById: (code) => recycleAssetAPI.getRecycleAssetByCode(code),
      create: (data) => recycleAssetAPI.createRecycleAsset(data as RecycleAssetCreateForm),
      update: (data) => recycleAssetAPI.updateRecycleAsset(data as RecycleAssetUpdateForm),
      delete: (code) => recycleAssetAPI.deleteRecycleAsset(code),
      batchDelete: (codes) => recycleAssetAPI.batchDeleteRecycleAssets(codes),
    },
    message: ElMessage,
    enablePagination: true,
    defaultPageSize: 20,
    enableCache: false,
  },
)
