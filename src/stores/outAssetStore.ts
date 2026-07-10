/**
 * 出库资产 Store
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { outAssetAPI } from '@/api/outAsset'
import type { OutAssetDetail, OutAssetCreateForm, OutAssetUpdateForm } from '@/utils/OutAsset'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'

/**
 * 出库资产 Store
 */
export const useOutAssetStore = createEntityStore<OutAssetDetail, PaginationQuery>('outAsset', {
  idKey: 'recordcode',
  nameField: 'outasset_name',
  displayName: '出库资产',
  api: {
    getList: async (params?: PaginationQuery) => {
      const safeParams: PaginationQuery = params || {
        page: 1,
        page_size: 10,
      }
      const response = await outAssetAPI.getOutAssets(safeParams)
      return {
        count: response.count,
        next: response.next,
        previous: response.previous,
        results: response.results as OutAssetDetail[],
      }
    },
    getById: (code) => outAssetAPI.getOutAssetByCode(code),
    create: (data) => outAssetAPI.createOutAsset(data as OutAssetCreateForm),
    update: (data) => outAssetAPI.updateOutAsset(data as OutAssetUpdateForm),
    delete: (recordcode) => {
      return outAssetAPI.deleteOutAsset(recordcode)
    },
    batchDelete: (codes) => outAssetAPI.batchDeleteOutAssets(codes),
  },
  message: ElMessage,
  enablePagination: true,
  defaultPageSize: 20,
  enableCache: false,
})
