/**
 * 报废资产 Store
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { wasteAssetAPI } from '@/api/wasteAsset'
import type { WasteAsset, WasteAssetCreateForm, WasteAssetUpdateForm } from '@/utils/WasteAsset'
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
