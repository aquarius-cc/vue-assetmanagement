/**
 * 待报废资产 Store
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { damagedAssetAPI } from '@/api/damagedAsset'
import type {
  DamagedAsset,
  DamagedAssetCreateForm,
  DamagedAssetUpdateForm,
} from '@/utils/DamagedAsset'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'

/**
 * 待报废资产 Store
 */
export const useDamagedAssetStore = createEntityStore<DamagedAsset, PaginationQuery>(
  'damagedAsset',
  {
    idKey: 'damaged_asset',
    nameField: 'damaged_asset_name',
    displayName: '待报废资产',
    api: {
      getList: async (params?: PaginationQuery) => {
        const safeParams: PaginationQuery = params || {
          page: 1,
          page_size: 10,
        }
        const response = await damagedAssetAPI.getDamagedAssets(safeParams)
        return {
          count: response.count,
          next: response.next,
          previous: response.previous,
          results: response.results as DamagedAsset[],
        }
      },
      getById: (code) => damagedAssetAPI.getDamagedAsset(code),
      create: (data) => damagedAssetAPI.createDamagedAsset(data as DamagedAssetCreateForm),
      update: (data) =>
        damagedAssetAPI.updateDamagedAsset(data.damaged_asset!, data as DamagedAssetUpdateForm),
      delete: (code) => damagedAssetAPI.deleteDamagedAsset(code),
      batchDelete: (codes) => damagedAssetAPI.batchDeleteDamagedAssets(codes),
    },
    message: ElMessage,
    idToString: (code: unknown) => String(code),
    enablePagination: true,
    defaultPageSize: 20,
    enableCache: false,
  },
)
