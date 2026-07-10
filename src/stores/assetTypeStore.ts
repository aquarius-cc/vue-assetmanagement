/**
 * 资产类型 Store
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { assetTypeAPI } from '@/api/assetType'
import type { AssetType, AssetTypeCreateForm, AssetTypeUpdateForm } from '@/utils/AssetType'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'

/**
 * 资产类型 Store
 */
export const useAssetTypeStore = createEntityStore<AssetType, PaginationQuery>('assetType', {
  idKey: 'asset_type_code',
  nameField: 'asset_type_primary',
  displayName: '资产类型',
  api: {
    getList: async (params?: PaginationQuery) => {
      const safeParams: PaginationQuery = params || {
        page: 1,
        page_size: 10,
      }
      const response = await assetTypeAPI.getAssetTypes(safeParams)
      return {
        count: response.count,
        next: response.next,
        previous: response.previous,
        results: response.results as AssetType[],
      }
    },
    getById: (code) => assetTypeAPI.getAssetTypeByCode(code),
    create: (data) => assetTypeAPI.createAssetType(data as AssetTypeCreateForm),
    update: (data) => assetTypeAPI.updateAssetType(data as AssetTypeUpdateForm),
    delete: (code) => assetTypeAPI.deleteAssetType(code),
    batchDelete: (codes) => assetTypeAPI.batchDeleteAssetTypes(codes),
  },
  message: ElMessage,
  enablePagination: true,
  defaultPageSize: 20,
  enableCache: false,
})
