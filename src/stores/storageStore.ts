/**
 * 仓库管理 Store
 * 基于 createEntityStore 工厂创建
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { storageAPI } from '@/api/storage'
import type { Storage, StorageCreateForm, StorageUpdateForm } from '@/utils/Storage'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'

/**
 * 仓库 Store
 */
export const useStorageStore = createEntityStore<Storage, PaginationQuery>('storage', {
  idKey: 'storage_code',
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
        next: response.next,
        previous: response.previous,
        results: response.results as Storage[],
      }
    },
    getById: (code) => storageAPI.getStorageByCode(code),
    create: (data) => storageAPI.createStorage(data as StorageCreateForm),
    update: (data) => storageAPI.updateStorage(data as StorageUpdateForm),
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
