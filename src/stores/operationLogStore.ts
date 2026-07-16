/**
 * 操作日志 Store
 * 操作日志为只读模块，create/update/delete 传空函数
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { operationLogAPI } from '@/api/operationLog'
import type { OperationLog } from '@/utils/OperationLog'
import type { PaginationQuery } from '@/stores/createEntityStore'

/**
 * 操作日志 Store
 * 注意：操作日志是只读模块，create/update/delete 不会实际调用后端接口
 */
export const useOperationLogStore = createEntityStore<OperationLog, PaginationQuery>(
  'operationLog',
  {
    idKey: 'logging_id',
    nameField: 'asset_name',
    displayName: '操作日志',
    api: {
      getList: async (params?: PaginationQuery) => {
        const safeParams: PaginationQuery = params || {
          page: 1,
          page_size: 10,
        }
        const response = await operationLogAPI.getOperationLogs(safeParams)
        return {
          count: response.count,
          next: response.next,
          previous: response.previous,
          results: response.results as OperationLog[],
        }
      },
      getById: (pk) => operationLogAPI.getOperationLogDetail(pk),
      /** 只读模块，不实际创建 */
      create: async () => {
        throw new Error('操作日志为只读模块，不支持创建操作')
      },
      /** 只读模块，不实际更新 */
      update: async () => {
        throw new Error('操作日志为只读模块，不支持更新操作')
      },
      /** 只读模块，不实际删除 */
      delete: async () => {
        throw new Error('操作日志为只读模块，不支持删除操作')
      },
    },
    /** 禁用自动消息提示（只读模块不需要 CRUD 提示） */
    disableAutoMessage: true,
    idToString: (pk: unknown) => String(pk),
    enablePagination: true,
    defaultPageSize: 20,
    enableCache: false,
  },
)
