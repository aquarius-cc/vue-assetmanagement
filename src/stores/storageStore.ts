/**
 * @file 仓库管理 Store，基于 createEntityStore 工厂创建
 * @module stores/storageStore
 * @exports
 *   - useStorageStore: 仓库管理状态 Store
 *   - batchCreateStorages: 批量创建仓库（仓库批量导入数据访问入口）
 * @callers
 *   - composables/useRecycleFormAssociations.ts
 *   - components/componentsdetails/StorageDetails.vue
 *   - components/componentsdetails/detils/AssetForm.vue
 *   - components/componentsdetails/detils/StorageForm.vue
 *   - components/componentsdetails/detils/StorageBatchImport.vue
 *   - components/componentsdetails/detils/RecycleAssetBasicDetails.vue
 *   - components/componentsdetails/detils/UnregisteredAssetForm.vue
 *   - components/componentsdetails/detils/DamagedAssetForm.vue
 * @dependsOn
 *   - api/storage: 仓库 API 接口
 *   - stores/createEntityStore: 实体 Store 工厂
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { storageAPI } from '@/api/storage'
import type { Storage, StorageCreateForm, StorageUpdateForm } from '@/types/storage'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'
import type { StorageBatchCreateResult } from '@/api/storage'

export type { StorageBatchCreateResult } from '@/api/storage'

/**
 * 批量创建仓库
 * 统一数据访问入口，供仓库批量导入复用
 * @param items 待创建的仓库列表
 * @returns 批量创建结果（含成功/失败明细）
 */
export const batchCreateStorages = (
  items: StorageCreateForm[],
): Promise<StorageBatchCreateResult> => {
  return storageAPI.batchCreateStorages(items)
}

/**
 * 仓库 Store
 */
export const useStorageStore = createEntityStore<Storage, PaginationQuery>('storage', {
  idKey: 'recordcode',
  nameField: 'storage_name',
  displayName: '仓库',
  api: {
    getList: async (params?: PaginationQuery) => {
      const safeParams: PaginationQuery = params || {
        page: 1,
        page_size: 10,
      }
      const response = await storageAPI.getStorages(safeParams)
      return {
        count: response.count,
        results: response.results as Storage[],
      }
    },
    getById: (code) => storageAPI.getStorageByRecordcode(code),
    create: (data) => storageAPI.createStorage(data as StorageCreateForm),
    update: (data) => storageAPI.updateStorage(data as StorageUpdateForm & { recordcode?: string }),
    delete: (code) => {
      return storageAPI.deleteStorage(code)
    },
    batchDelete: (codes) => storageAPI.batchDeleteStorages(codes),
  },
  message: ElMessage,
  enablePagination: true,
  defaultPageSize: 20,
  enableCache: false,
})
