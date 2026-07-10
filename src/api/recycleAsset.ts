/**
 * 回收资产管理 API
 * 对应后端接口: /api/assets/recycle-assets/
 * 所有字段名采用 snake_case 与后端序列化器保持一致
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  RecycleAssetExtended,
  RecycleAssetCreateForm,
  RecycleAssetUpdateForm,
  RecycleAssetQueryParams,
  RecycleAssetListResponse,
  RecycleAssetBatchCreateForm,
  RecycleAssetBatchCreateResult,
} from '@/utils/RecycleAsset'
import type { BatchDeleteResult } from '@/stores/createEntityStore'

/**
 * 回收资产管理 API
 */
export const recycleAssetAPI = {
  /**
   * 获取回收资产列表
   * @param params 查询参数
   * @returns 回收资产列表响应
   */
  getRecycleAssets: (params?: RecycleAssetQueryParams): Promise<RecycleAssetListResponse> => {
    return unwrapResponse(request.get<RecycleAssetListResponse>('/assets/recycle-assets/', params))
  },

  /**
   * 获取回收资产详情（启用缓存）
   * @param outasset_recordcode 出库记录编码（作为回收记录的主键）
   * @returns 回收资产详情
   */
  getRecycleAssetByCode: (outasset_recordcode: string): Promise<RecycleAssetExtended> => {
    return unwrapResponse(request.get<RecycleAssetExtended>(
      `/assets/recycle-assets/${outasset_recordcode}/`,
      undefined,
      true, // 使用缓存
      300000, // 缓存时间 5 分钟
    ))
  },

  /**
   * 创建回收记录
   * @param data 回收记录创建表单数据
   * @returns 创建的回收记录
   */
  createRecycleAsset: (data: RecycleAssetCreateForm): Promise<RecycleAssetExtended> => {
    return unwrapResponse(request.post<RecycleAssetExtended>('/assets/recycle-assets/', data))
  },

  /**
   * 更新回收记录
   * PUT /api/assets/recycle-assets/{recordcode}/
   * @param data 回收记录更新表单数据（需包含 recordcode）
   * @returns 更新后的回收记录
   */
  updateRecycleAsset: (data: Partial<RecycleAssetUpdateForm>): Promise<RecycleAssetExtended> => {
    const recordcode = (data as Record<string, unknown>).recordcode || data.outasset_recordcode
    if (!recordcode) {
      throw new Error('recordcode is required for update')
    }
    return unwrapResponse(request.put<RecycleAssetExtended>(`/assets/recycle-assets/${recordcode}/`, data))
  },

  /**
   * 删除回收记录
   * @param outasset_recordcode 出库记录编码
   */
  deleteRecycleAsset: (outasset_recordcode: string): Promise<void> => {
    return unwrapResponse(request.delete<void>(`/assets/recycle-assets/${outasset_recordcode}/`))
  },

  /**
   * 批量删除回收资产
   * POST /api/assets/recycle-assets/batch-delete/
   * 对应后端 RecycleAssetViewSet.batch_delete action
   */
  batchDeleteRecycleAssets: (outasset_recordcodes: string[]): Promise<BatchDeleteResult> => {
    return unwrapResponse(
      request.post<BatchDeleteResult>('/assets/recycle-assets/batch-delete/', {
        ids: outasset_recordcodes,
      }),
    )
  },

  /**
   * 批量创建回收记录
   * POST /api/assets/recycle-assets/batch-create/
   * 对应后端 RecycleAssetViewSet.batch_create action
   * 字段映射：
   *   前端 recycle_asset_storage_code → 顶层 recycle_asset_storage
   *   前端 recycle_asset_recycle_person_jobcode → 顶层 recycle_asset_recycle_person_jobcode
   *   每条 outasset_recordcode → items[].recycle_outasset_code
   */
  batchCreateRecycleAssets: (data: RecycleAssetBatchCreateForm): Promise<RecycleAssetBatchCreateResult> => {
    return unwrapResponse(
      request.post<RecycleAssetBatchCreateResult>('/assets/recycle-assets/batch-create/', data),
    )
  },

  /**
   * 根据资产编码获取回收记录
   * @param asset_code 资产编码
   * @returns 回收记录列表响应
   */
  getRecycleAssetsByAsset: (asset_code: string): Promise<RecycleAssetListResponse> => {
    return unwrapResponse(request.get<RecycleAssetListResponse>(`/assets/recycle-assets/by-asset/${asset_code}/`))
  },

  /**
   * [MR-08] 按出库记录编码查询回收记录
   * @param outasset_recordcode 出库记录编码
   * @returns 回收记录列表响应
   */
  getRecycleAssetByOutAsset: (outasset_recordcode: string): Promise<RecycleAssetListResponse> => {
    return unwrapResponse(request.get<RecycleAssetListResponse>(
      `/assets/recycle-assets/by-outasset/${outasset_recordcode}/`
    ))
  },
}
