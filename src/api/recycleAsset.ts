/**
 * @file 回收资产管理 API，提供回收资产的增删改查、批量操作等接口
 * @module api/recycleAsset
 * @exports
 *   - recycleAssetAPI: 回收资产管理 API 对象（包含所有回收资产相关方法）
 * @callers
 *   - stores/recycleAssetStore: 回收资产状态管理
 *   - composables/useRecycleFormSubmit: 回收表单提交组合式函数
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/recycleasset: 回收资产相关类型定义
 *   - stores/createEntityStore: 批量删除结果类型
 */
import { request, unwrapResponse, getBlob } from '@/api/index'
import { invalidateAssetCache, invalidateSubResourceCache } from './assetCache'
import type { BlobDownload } from '@/api/request'
import type {
  RecycleAssetExtended,
  RecycleAssetCreateForm,
  RecycleAssetUpdateForm,
  RecycleAssetQueryParams,
  RecycleAssetListResponse,
  RecycleAssetBatchCreateForm,
  RecycleAssetBatchCreateResult,
} from '@/types/recycleasset'
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
    return unwrapResponse(
      request.get<RecycleAssetExtended>(
        `/assets/recycle-assets/${outasset_recordcode}/`,
        undefined,
        true, // 使用缓存
        300000, // 缓存时间 5 分钟
      ),
    )
  },

  /**
   * 创建回收记录
   * @param data 回收记录创建表单数据
   * @returns 创建的回收记录
   */
  createRecycleAsset: (data: RecycleAssetCreateForm): Promise<RecycleAssetExtended> => {
    // [M-RC-08] 回收改变资产状态；表单仅 outasset_recordcode（无资产 rc）→ 宽失效
    const result = unwrapResponse(
      request.post<RecycleAssetExtended>('/assets/recycle-assets/', data),
    )
    invalidateAssetCache()
    return result
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
    return unwrapResponse(
      request.put<RecycleAssetExtended>(`/assets/recycle-assets/${recordcode}/`, data),
    )
  },

  /**
   * 删除回收记录
   * @param outasset_recordcode 出库记录编码
   */
  deleteRecycleAsset: async (outasset_recordcode: string): Promise<void> => {
    // [M-RC-08] 删除回收记录会恢复资产状态（cancel_recycle），URL 为 recycle rc → 宽失效
    const result = await unwrapResponse(
      request.delete<void>(`/assets/recycle-assets/${outasset_recordcode}/`),
    )
    // [M-CACHE-1] 资产侧宽失效（既有）+ 子资源精确失效（新增，命中不了列表 key），职责不重叠
    invalidateAssetCache()
    invalidateSubResourceCache('/assets/recycle-assets/', [outasset_recordcode])
    return result
  },

  /**
   * 批量删除回收资产
   * POST /api/assets/recycle-assets/batch-delete/
   * 对应后端 RecycleAssetViewSet.batch_delete action
   */
  batchDeleteRecycleAssets: async (outasset_recordcodes: string[]): Promise<BatchDeleteResult> => {
    // [M-RC-08] 批量删除涉及多资产状态，宽失效全部资产缓存
    const result = await unwrapResponse(
      request.post<BatchDeleteResult>('/assets/recycle-assets/batch-delete/', {
        ids: outasset_recordcodes,
      }),
    )
    // [M-RC-08] 资产侧宽失效（既有）+ [M-CACHE-1] 子资源精确失效（同源：success_ids 优先，缺失回退入参）
    invalidateAssetCache()
    const successIds = Array.isArray(result.success_ids) ? result.success_ids : outasset_recordcodes
    invalidateSubResourceCache('/assets/recycle-assets/', successIds)
    return result
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
  batchCreateRecycleAssets: (
    data: RecycleAssetBatchCreateForm,
  ): Promise<RecycleAssetBatchCreateResult> => {
    // [M-RC-08] 批量回收涉及多资产状态，宽失效全部资产缓存
    const result = unwrapResponse(
      request.post<RecycleAssetBatchCreateResult>('/assets/recycle-assets/batch-create/', data),
    )
    invalidateAssetCache()
    return result
  },

  /**
   * 服务端 Excel 导出（P2-04）
   * 省略 limit/offset 时全量导出，总行数超 EXPORT_MAX_ROWS 会被后端拒绝（400）。
   */
  exportExcel: (params?: Record<string, unknown>): Promise<BlobDownload> => {
    return getBlob('/assets/recycle-assets/export/', params, 'recycle_assets.xlsx')
  },
}
