/**
 * 维修资产管理 API
 * 对应后端接口: /api/assets/repair-assets/
 * 所有字段名采用 snake_case 与后端序列化器保持一致
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  RepairAssetExtended,
  RepairAssetCreateForm,
  RepairAssetUpdateForm,
  RepairAssetListResponse,
  RepairAssetQueryParams,
  RepairAssetBatchCreateForm,
  RepairAssetBatchCreateResult,
} from '@/utils/RepairAsset'
import type { BatchDeleteResult } from '@/stores/createEntityStore'

/**
 * 维修资产管理 API
 */
export const repairAssetAPI = {
  /**
   * 获取维修资产列表
   * @param params 查询参数
   * @returns 维修资产列表响应
   */
  getRepairAssets: (params?: RepairAssetQueryParams): Promise<RepairAssetListResponse> => {
    return unwrapResponse(request.get<RepairAssetListResponse>('/assets/repair-assets/', params))
  },

  /**
   * 获取维修资产详情（启用缓存）
   * @param recordcode 维修记录编码
   * @returns 维修资产详情
   */
  getRepairAssetByCode: (recordcode: string): Promise<RepairAssetExtended> => {
    return unwrapResponse(
      request.get<RepairAssetExtended>(
        `/assets/repair-assets/${recordcode}/`,
        undefined,
        true,
        300000,
      ),
    )
  },

  /**
   * 创建维修记录
   * @param data 维修记录创建表单数据
   * @returns 创建的维修记录
   */
  createRepairAsset: (data: RepairAssetCreateForm): Promise<RepairAssetExtended> => {
    return unwrapResponse(request.post<RepairAssetExtended>('/assets/repair-assets/', data))
  },

  /**
   * 更新维修记录
   * PUT /api/assets/repair-assets/{recordcode}/
   * @param data 维修记录更新表单数据（需包含 recordcode）
   * @returns 更新后的维修记录
   */
  updateRepairAsset: (data: Partial<RepairAssetUpdateForm>): Promise<RepairAssetExtended> => {
    const recordcode = (data as Record<string, unknown>).recordcode || data.id
    if (!recordcode) {
      throw new Error('recordcode is required for update')
    }
    return unwrapResponse(
      request.put<RepairAssetExtended>(`/assets/repair-assets/${recordcode}/`, data),
    )
  },

  /**
   * 删除维修记录
   * @param recordcode 维修记录编码
   */
  deleteRepairAsset: (recordcode: string): Promise<void> => {
    return unwrapResponse(request.delete<void>(`/assets/repair-assets/${recordcode}/`))
  },

  /**
   * 批量删除维修资产
   * POST /api/assets/repair-assets/batch-delete/
   * 对应后端 RepairAssetViewSet.batch_delete action
   */
  batchDeleteRepairAssets: (recordcodes: string[]): Promise<BatchDeleteResult> => {
    return unwrapResponse(
      request.post<BatchDeleteResult>('/assets/repair-assets/batch-delete/', {
        ids: recordcodes,
      }),
    )
  },

  /**
   * 批量创建维修记录
   * POST /api/assets/repair-assets/batch-create/
   * 对应后端 RepairAssetViewSet.batch_create action
   */
  batchCreateRepairAssets: (
    data: RepairAssetBatchCreateForm,
  ): Promise<RepairAssetBatchCreateResult> => {
    return unwrapResponse(
      request.post<RepairAssetBatchCreateResult>('/assets/repair-assets/batch-create/', data),
    )
  },

  /**
   * 根据资产编码获取维修记录
   * @param asset_code 资产编码
   * @returns 维修记录列表响应
   */
  getRepairAssetsByAsset: (asset_code: string): Promise<RepairAssetListResponse> => {
    return unwrapResponse(
      request.get<RepairAssetListResponse>(`/assets/repair-assets/by-asset/${asset_code}/`),
    )
  },

  /**
   * 送修资产
   * POST /api/assets/assets/{asset_code}/repair/
   * @param asset_code 资产编码
   * @param data 维修信息
   * @returns 维修记录详情
   */
  repairAsset: (asset_code: string, data: RepairAssetCreateForm): Promise<RepairAssetExtended> => {
    return unwrapResponse(
      request.post<RepairAssetExtended>(`/assets/assets/${asset_code}/repair/`, data),
    )
  },

  /**
   * 维修完成
   * POST /api/assets/assets/{asset_code}/repair-done/
   * @param asset_code 资产编码
   * @param data 维修完成信息
   * @returns 维修记录详情
   */
  repairDone: (asset_code: string, data: RepairAssetUpdateForm): Promise<RepairAssetExtended> => {
    return unwrapResponse(
      request.post<RepairAssetExtended>(`/assets/assets/${asset_code}/repair-done/`, data),
    )
  },

  /**
   * 维修失败
   * POST /api/assets/assets/{asset_code}/repair-failed/
   * @param asset_code 资产编码
   * @param data 维修失败信息
   * @returns 维修记录详情
   */
  repairFailed: (asset_code: string, data: RepairAssetUpdateForm): Promise<RepairAssetExtended> => {
    return unwrapResponse(
      request.post<RepairAssetExtended>(`/assets/assets/${asset_code}/repair-failed/`, data),
    )
  },
}
