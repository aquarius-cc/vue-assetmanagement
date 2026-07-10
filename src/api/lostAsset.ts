/**
 * 遗失资产管理 API
 * 对应后端接口: /api/assets/lost-assets/
 * 所有字段名采用 snake_case 与后端序列化器保持一致
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
} from '@/utils/LostAsset'
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
    return unwrapResponse(request.get<LostAssetExtended>(
      `/assets/lost-assets/${recordcode}/`,
      undefined,
      true,
      300000,
    ))
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
    return unwrapResponse(request.put<LostAssetExtended>(`/assets/lost-assets/${recordcode}/`, data))
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
    return unwrapResponse(request.get<LostAssetListResponse>(`/assets/lost-assets/by-asset/${asset_code}/`))
  },

  /**
   * 标记资产为遗失
   * POST /api/assets/assets/{asset_code}/mark-lost/
   * @param asset_code 资产编码
   * @param data 遗失信息
   * @returns 资产详情
   */
  markAssetAsLost: (asset_code: string, data: LostAssetCreateForm): Promise<LostAssetExtended> => {
    return unwrapResponse(request.post<LostAssetExtended>(
      `/assets/assets/${asset_code}/mark-lost/`,
      data,
    ))
  },

  /**
   * 找回遗失资产
   * POST /api/assets/assets/{asset_code}/found/
   * @param asset_code 资产编码
   * @returns 资产详情
   */
  foundAsset: (asset_code: string): Promise<LostAssetExtended> => {
    return unwrapResponse(request.post<LostAssetExtended>(
      `/assets/assets/${asset_code}/found/`,
    ))
  },
}