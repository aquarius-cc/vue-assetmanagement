/**
 * @file 遗失资产管理 API，提供遗失资产的增删改查、批量操作等接口
 * @module api/lostAsset
 * @exports
 *   - lostAssetAPI: 遗失资产管理 API 对象（包含所有遗失资产相关方法）
 * @callers
 *   - stores/lostAssetStore: 遗失资产状态管理
 *   - views/LostAssetManage: 遗失资产管理视图
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/lostasset: 遗失资产相关类型定义
 *   - stores/createEntityStore: 批量删除结果类型
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  LostAssetExtended,
  LostAssetCreateForm,
  LostAssetUpdateForm,
  LostAssetListResponse,
  LostAssetQueryParams,
  LostAssetBatchCreateForm,
  LostAssetBatchCreateResult,
} from '@/types/lostasset'
import type { BatchDeleteResult } from '@/stores/createEntityStore'

/**
 * 遗失资产管理 API
 */
export const lostAssetAPI = {
  /**
   * 获取遗失资产列表
   * @param params 查询参数
   * @returns 遗失资产列表响应
   */
  getLostAssets: (params?: LostAssetQueryParams): Promise<LostAssetListResponse> => {
    return unwrapResponse(request.get<LostAssetListResponse>('/assets/lost-assets/', params))
  },

  /**
   * 获取遗失资产详情（启用缓存）
   * @param recordcode 遗失记录编码
   * @returns 遗失资产详情
   */
  getLostAssetByCode: (recordcode: string): Promise<LostAssetExtended> => {
    return unwrapResponse(
      request.get<LostAssetExtended>(`/assets/lost-assets/${recordcode}/`, undefined, true, 300000),
    )
  },

  /**
   * 创建遗失记录
   * @param data 遗失记录创建表单数据
   * @returns 创建的遗失记录
   */
  createLostAsset: (data: LostAssetCreateForm): Promise<LostAssetExtended> => {
    return unwrapResponse(request.post<LostAssetExtended>('/assets/lost-assets/', data))
  },

  /**
   * 更新遗失记录
   * PUT /api/assets/lost-assets/{recordcode}/
   * @param data 遗失记录更新表单数据（需包含 recordcode）
   * @returns 更新后的遗失记录
   */
  updateLostAsset: (data: Partial<LostAssetUpdateForm>): Promise<LostAssetExtended> => {
    const recordcode = (data as Record<string, unknown>).recordcode || data.id
    if (!recordcode) {
      throw new Error('recordcode is required for update')
    }
    return unwrapResponse(
      request.put<LostAssetExtended>(`/assets/lost-assets/${recordcode}/`, data),
    )
  },

  /**
   * 删除遗失记录
   * @param recordcode 遗失记录编码
   */
  deleteLostAsset: (recordcode: string): Promise<void> => {
    return unwrapResponse(request.delete<void>(`/assets/lost-assets/${recordcode}/`))
  },

  /**
   * 批量删除遗失资产
   * POST /api/assets/lost-assets/batch-delete/
   * 对应后端 LostAssetViewSet.batch_delete action
   */
  batchDeleteLostAssets: (recordcodes: string[]): Promise<BatchDeleteResult> => {
    return unwrapResponse(
      request.post<BatchDeleteResult>('/assets/lost-assets/batch-delete/', {
        ids: recordcodes,
      }),
    )
  },

  /**
   * 批量创建遗失记录
   * POST /api/assets/lost-assets/batch-create/
   * 对应后端 LostAssetViewSet.batch_create action
   */
  batchCreateLostAssets: (data: LostAssetBatchCreateForm): Promise<LostAssetBatchCreateResult> => {
    return unwrapResponse(
      request.post<LostAssetBatchCreateResult>('/assets/lost-assets/batch-create/', data),
    )
  },

  /**
   * 根据资产编码获取遗失记录
   * @param asset_code 资产编码
   * @returns 遗失记录列表响应
   */
  getLostAssetsByAsset: (asset_code: string): Promise<LostAssetListResponse> => {
    return unwrapResponse(
      request.get<LostAssetListResponse>(`/assets/lost-assets/by-asset/${asset_code}/`),
    )
  },

  /**
   * 标记资产为遗失
   * POST /api/assets/assets/{recordcode}/mark-lost/
   * 对应后端 AssetViewSet.mark_lost action
   * 注意：asset 由 URL 中的 recordcode 标识，请求体无需 asset_recordcode
   * @param recordcode 资产记录编码（用作 URL 查找参数）
   * @param data 遗失信息
   * @returns 资产详情
   */
  markAssetAsLost: (
    recordcode: string,
    data: {
      lost_reason: string
      last_known_location?: string | null
      lost_description?: string | null
      lost_date?: string | null
    },
  ): Promise<LostAssetExtended> => {
    return unwrapResponse(
      request.post<LostAssetExtended>(`/assets/assets/${recordcode}/mark-lost/`, data),
    )
  },

  /**
   * 找回遗失资产并转入待发放状态（Action 端点）
   * POST /api/assets/assets/{recordcode}/found/
   * 对应后端 AssetViewSet.found_and_return action
   * 注意：asset 由 URL 中的 recordcode 标识（lookup_field="recordcode"）
   * @param recordcode 资产记录编码（用作 URL 查找参数）
   * @param data 找回信息
   * @returns 资产详情
   */
  foundAsset: (
    recordcode: string,
    data: {
      found_location?: string
      found_description?: string
    },
  ): Promise<LostAssetExtended> => {
    return unwrapResponse(
      request.post<LostAssetExtended>(`/assets/assets/${recordcode}/found/`, data),
    )
  },
}
