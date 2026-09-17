/**
 * @file 出库资产 Store，基于 createEntityStore 工厂创建
 * @module stores/outAssetStore
 * @exports
 *   - useOutAssetStore: 出库资产管理状态 Store
 *   - batchCreateOutAssets: 批量创建出库资产（出库批量导入数据访问入口）
 * @callers
 *   - services/assetLifecycleService.ts
 *   - composables/useOutAssetForm.ts
 *   - components/componentsdetails/OutAssetDetails.vue
 *   - components/componentsdetails/detils/OutAssetForm.vue
 *   - components/componentsdetails/detils/OutAssetBatchImport.vue
 *   - components/componentsdetails/detils/OutAssetBasicDetails.vue
 *   - components/componentsdetails/detils/RecycleAssetForm.vue
 * @dependsOn
 *   - api/outAsset: 出库资产 API 接口
 *   - stores/createEntityStore: 实体 Store 工厂
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { outAssetAPI } from '@/api/outAsset'
import type { OutAssetDetail, OutAssetCreateForm, OutAssetUpdateForm } from '@/types/outasset'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'
import type { OutAssetBatchCreateResult } from '@/api/outAsset'

export type { OutAssetBatchCreateResult } from '@/api/outAsset'

/**
 * 批量创建出库资产
 * 统一数据访问入口，供出库资产批量导入复用
 * @param items 待创建的出库资产列表
 * @returns 批量创建结果（含成功/失败明细）
 */
export const batchCreateOutAssets = (
  items: OutAssetCreateForm[],
): Promise<OutAssetBatchCreateResult> => {
  return outAssetAPI.batchCreateOutAssets(items)
}

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
