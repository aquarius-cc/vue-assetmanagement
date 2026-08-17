/**
 * @file 仓库管理 API，提供仓库的增删改查、批量操作等接口
 * @module api/storage
 * @exports
 *   - storageAPI: 仓库管理 API 对象（包含所有仓库相关方法）
 *   - StorageBatchCreateResult: 批量创建仓库响应类型
 * @callers
 *   - stores/storageStore: 仓库状态管理
 *   - views/StorageManage: 仓库管理视图
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/storage: 仓库相关类型定义
 *   - stores/createEntityStore: 批量删除结果类型
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  Storage,
  StorageQueryParams,
  StorageCreateForm,
  StorageUpdateForm,
  StorageResponse,
} from '@/types/storage'
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
   * @param recordcode 仓库 recordcode
   * @returns 仓库详情
   */
  getStorageByRecordcode: (recordcode: string): Promise<Storage> => {
    return unwrapResponse(
      request.get<Storage>(`/assets/storages/${recordcode}/`, undefined, true, 300000),
    )
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
   * @param data 仓库更新表单数据（需包含 recordcode）
   * @returns 更新后的仓库信息
   */
  updateStorage: (data: Partial<StorageUpdateForm> & { recordcode?: string }): Promise<Storage> => {
    const recordcode = data.recordcode
    if (!recordcode) {
      throw new Error('recordcode is required for update')
    }
    return unwrapResponse(request.put<Storage>(`/assets/storages/${recordcode}/`, data))
  },

  /**
   * 删除仓库（软删除）
   * @param recordcode 仓库 recordcode
   */
  deleteStorage: (recordcode: string): Promise<void> => {
    return unwrapResponse(request.delete<void>(`/assets/storages/${recordcode}/`))
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
