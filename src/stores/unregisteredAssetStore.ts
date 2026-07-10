/**
 * 未登记资产 Store
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { unregisteredAssetAPI } from '@/api/unregisteredAsset'
import type { UnregisteredAsset, UnregisteredAssetCreateForm, UnregisteredAssetUpdateForm } from '@/utils/UnregisteredAsset'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'

/**
 * 未登记资产 Store
 */
export const useUnregisteredAssetStore = createEntityStore<UnregisteredAsset, PaginationQuery>('unregisteredAsset', {
  idKey: 'code',
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
    create: (data) => unregisteredAssetAPI.createUnregisteredAsset(data as UnregisteredAssetCreateForm),
    update: (data) => unregisteredAssetAPI.updateUnregisteredAsset(data.code!, data as UnregisteredAssetUpdateForm),
    delete: (code) => unregisteredAssetAPI.deleteUnregisteredAsset(code),
    batchDelete: (codes) => unregisteredAssetAPI.batchDeleteUnregisteredAssets(codes),
  },
  message: ElMessage,
  idToString: (code: unknown) => String(code),
  enablePagination: true,
  defaultPageSize: 20,
  enableCache: false,
})
