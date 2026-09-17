/**
 * @file 资产类型 Store，基于 createEntityStore 工厂创建
 * @module stores/assetTypeStore
 * @exports
 *   - useAssetTypeStore: 资产类型管理状态 Store
 *   - batchCreateAssetTypes: 批量创建资产类型
 * @callers
 *   - composables/useRecycleFormAssociations.ts
 *   - components/componentsdetails/detils/AssetForm.vue
 *   - components/componentsdetails/detils/AssetTypeForm.vue
 *   - components/componentsdetails/detils/AssetTypeBatchImport.vue
 *   - components/componentsdetails/detils/UnregisteredAssetForm.vue
 * @dependsOn
 *   - api/assetType: 资产类型 API 接口
 *   - stores/createEntityStore: 实体 Store 工厂
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { assetTypeAPI } from '@/api/assetType'
import type { AssetTypeBatchCreateResult } from '@/api/assetType'
import type { AssetType, AssetTypeCreateForm, AssetTypeUpdateForm } from '@/types/assettype'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'

export type { AssetTypeBatchCreateResult } from '@/api/assetType'

/**
 * 资产类型 Store
 */
export const useAssetTypeStore = createEntityStore<AssetType, PaginationQuery>('assetType', {
  idKey: 'recordcode',
  nameField: 'type_name',
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
    getById: (code) => assetTypeAPI.getAssetTypeByRecordcode(code),
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

/**
 * 批量创建资产类型
 * 统一数据访问入口，供批量导入与详情页批量新增复用
 * @param items 待创建的资产类型列表
 * @returns 批量创建结果（含成功/失败明细）
 */
export const batchCreateAssetTypes = async (
  items: AssetTypeCreateForm[],
): Promise<AssetTypeBatchCreateResult> => {
  return assetTypeAPI.batchCreateAssetTypes(items)
}
