/**
 * FoundAsset Store
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { foundAssetAPI } from '@/api/foundAsset'
import type {
  FoundAssetExtended,
  FoundAssetCreateForm,
  FoundAssetUpdateForm,
} from '@/utils/FoundAsset'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'

export const useFoundAssetStore = createEntityStore<FoundAssetExtended, PaginationQuery>(
  'foundAsset',
  {
    idKey: 'recordcode',
    nameField: 'asset_name',
    displayName: 'Found Asset',
    api: {
      getList: async (params?: PaginationQuery) => {
        const safeParams: PaginationQuery = params || {
          page: 1,
          page_size: 10,
        }
        const response = await foundAssetAPI.getFoundAssets(safeParams)
        return {
          count: response.count,
          next: response.next,
          previous: response.previous,
          results: response.results as FoundAssetExtended[],
        }
      },
      getById: (code) => foundAssetAPI.getFoundAssetByCode(code),
      create: (data) => foundAssetAPI.createFoundAsset(data as FoundAssetCreateForm),
      update: (data) => foundAssetAPI.updateFoundAsset(data as FoundAssetUpdateForm),
      delete: (code) => foundAssetAPI.deleteFoundAsset(code),
      batchDelete: (codes) => foundAssetAPI.batchDeleteFoundAssets(codes),
    },
    message: ElMessage,
    enablePagination: true,
    defaultPageSize: 20,
    enableCache: false,
  },
)
