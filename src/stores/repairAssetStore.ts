/**
 * @file 维修资产 Store，基于 createEntityStore 工厂创建
 * @module stores/repairAssetStore
 * @exports
 *   - useRepairAssetStore: 维修资产管理状态 Store
 * @callers
 *   - components/componentsdetails/RepairAssetDetails.vue
 * @dependsOn
 *   - api/repairAsset: 维修资产 API 接口
 *   - stores/createEntityStore: 实体 Store 工厂
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { repairAssetAPI } from '@/api/repairAsset'
import type {
  RepairAssetExtended,
  RepairAssetCreateForm,
  RepairAssetUpdateForm,
} from '@/types/repairasset'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'

/**
 * 维修资产 Store
 */
export const useRepairAssetStore = createEntityStore<RepairAssetExtended, PaginationQuery>(
  'repairAsset',
  {
    idKey: 'recordcode',
    nameField: 'repair_asset_name',
    displayName: '维修资产',
    api: {
      getList: async (params?: PaginationQuery) => {
        const safeParams: PaginationQuery = params || {
          page: 1,
          page_size: 10,
        }
        const response = await repairAssetAPI.getRepairAssets(safeParams)
        return {
          count: response.count,
          next: response.next,
          previous: response.previous,
          results: response.results as RepairAssetExtended[],
        }
      },
      getById: (code) => repairAssetAPI.getRepairAssetByCode(code),
      create: (data) => repairAssetAPI.createRepairAsset(data as RepairAssetCreateForm),
      update: (data) => repairAssetAPI.updateRepairAsset(data as RepairAssetUpdateForm),
      delete: (code) => repairAssetAPI.deleteRepairAsset(code),
      batchDelete: (codes) => repairAssetAPI.batchDeleteRepairAssets(codes),
    },
    message: ElMessage,
    enablePagination: true,
    defaultPageSize: 20,
    enableCache: false,
  },
)
