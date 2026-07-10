/**
 * 仓库管理 API
 * 对应后端接口: /api/assets/storages/
 * 所有字段名采用 snake_case 与后端序列化器保持一致
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  Storage,
  StorageQueryParams,
  StorageCreateForm,
  StorageUpdateForm,
  StorageStats,
  StorageResponse,
} from '@/utils/Storage'
import type { BatchDeleteResult } from '@/stores/createEntityStore'

/**
 * 批量创建仓库响应
 * 对应后端 StorageViewSet.batch_create action 返回格式
 * fail_items 格式与后端 BatchOperationMixin.batch_execute 对齐
 */
export interface StorageBatchCreateResult {
  total: number
  success_count: number
  fail_count: number
  success_items: Storage[]
  fail_items: Array<{
    index: number
    error_code: string
    error_message: string
    input_data: StorageCreateForm
    row_number?: number
  }>
}

/**
 * 仓库管理 API
 */
export const storageAPI = {
  /**
   * 获取仓库列表
   * @param params 查询参数
   * @returns 仓库列表响应
   */
  getStorages: (params?: StorageQueryParams): Promise<StorageResponse> => {
    return unwrapResponse(request.get<StorageResponse>('/assets/storages/', params))
  },

  /**
   * 获取仓库详情（启用缓存）
   * @param storage_code 仓库编码
   * @returns 仓库详情
   */
  getStorageByCode: (storage_code: string): Promise<Storage> => {
    return unwrapResponse(request.get<Storage>(
      `/assets/storages/${storage_code}/`,
      undefined,
      true, // 使用缓存
      300000, // 缓存时间 5 分钟
    ))
  },

  /**
   * 搜索仓库
   * @param keyword 搜索关键词
   * @returns 仓库列表响应
   */
  searchStorages: (keyword: string): Promise<StorageResponse> => {
    return unwrapResponse(request.get<StorageResponse>('/assets/storages/', { keyword }))
  },

  /**
   * 创建仓库
   * @param storageInfo 仓库创建表单数据
   * @returns 创建的仓库信息
   */
  createStorage: (storageInfo: StorageCreateForm): Promise<Storage> => {
    return unwrapResponse(request.post<Storage>('/assets/storages/', storageInfo))
  },

  /**
   * 更新仓库信息
   * @param data 仓库更新表单数据（需包含 storage_code）
   * @returns 更新后的仓库信息
   */
  updateStorage: (data: Partial<StorageUpdateForm>): Promise<Storage> => {
    if (!data.storage_code) {
      throw new Error('storage_code is required for update')
    }
    return unwrapResponse(request.put<Storage>(`/assets/storages/${data.storage_code}/`, data))
  },

  /**
   * 局部更新仓库信息
   * @param data 仓库更新表单数据（需包含 storage_code）
   * @returns 更新后的仓库信息
   */
  partialUpdateStorage: (data: Partial<StorageUpdateForm>): Promise<Storage> => {
    if (!data.storage_code) {
      throw new Error('storage_code is required for update')
    }
    return unwrapResponse(request.patch<Storage>(`/assets/storages/${data.storage_code}/`, data))
  },

  /**
   * 删除仓库（软删除）
   * @param storage_code 仓库编码
   */
  deleteStorage: (storage_code: string): Promise<void> => {
    return unwrapResponse(request.delete<void>(`/assets/storages/${storage_code}/`))
  },

  /**
   * 批量删除仓库
   * @param storage_codes 仓库编码数组
   * @returns 批量删除结果
   */
  batchDeleteStorages: (storage_codes: string[]): Promise<BatchDeleteResult> => {
    return unwrapResponse(
      request.post<BatchDeleteResult>('/assets/storages/batch-delete/', {
        ids: storage_codes,
      }),
    )
  },

  /**
   * 获取仓库统计信息
   * GET /api/assets/storages/statistics/
   * 对应后端 StorageViewSet.statistics action
   */
  getStorageStatistics: (): Promise<StorageStats> => {
    return unwrapResponse(request.get<StorageStats>('/assets/storages/statistics/'))
  },

  /**
   * 批量创建仓库
   * POST /api/assets/storages/batch-create/
   * 对应后端 StorageViewSet.batch_create action
   * 一次性提交多条仓库数据，后端逐条处理并返回成功/失败明细
   */
  batchCreateStorages: (items: StorageCreateForm[]): Promise<StorageBatchCreateResult> => {
    return unwrapResponse(
      request.post<StorageBatchCreateResult>('/assets/storages/batch-create/', {
        items,
      }),
    )
  },
}
