/**
 * @file 维修资产管理 API，提供维修资产的增删改查、批量操作等接口
 * @module api/repairAsset
 * @exports
 *   - repairAssetAPI: 维修资产管理 API 对象（包含所有维修资产相关方法）
 * @callers
 *   - stores/repairAssetStore: 维修资产状态管理
 *   - views/RepairAssetManage: 维修资产管理视图
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/repairasset: 维修资产相关类型定义
 *   - stores/createEntityStore: 批量删除结果类型
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  RepairAssetExtended,
  RepairAssetCreateForm,
  RepairAssetUpdateForm,
  RepairAssetListResponse,
  RepairAssetQueryParams,
} from '@/types/repairasset'
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
   * 送修资产（Action 端点）
   * POST /api/assets/assets/{recordcode}/repair/
   * 对应后端 AssetViewSet.repair action
   * 注意：asset 由 URL 中的 recordcode 标识（lookup_field="recordcode"），
   *       请求体无需 asset_code 和 operator_jobcode（后端从 operator_context 获取）
   * @param recordcode 资产记录编码（用作 URL 查找参数）
   * @param data 维修信息（不含 asset_code）
   * @returns 维修记录详情
   */
  repairAsset: (
    recordcode: string,
    data: Omit<RepairAssetCreateForm, 'asset_code' | 'operator_jobcode'>,
  ): Promise<RepairAssetExtended> => {
    return unwrapResponse(
      request.post<RepairAssetExtended>(`/assets/assets/${recordcode}/repair/`, data),
    )
  },

  /**
   * 维修完成（Action 端点）
   * POST /api/assets/assets/{recordcode}/repair-done/
   * 对应后端 AssetViewSet.repair_done action
   * 注意：asset 由 URL 中的 recordcode 标识
   * @param recordcode 资产记录编码（用作 URL 查找参数）
   * @param data 维修完成信息（actual_return_date, physical_grade_after）
   * @returns 维修记录详情
   */
  repairDone: (
    recordcode: string,
    data: Pick<RepairAssetUpdateForm, 'actual_return_date' | 'physical_grade_after'>,
  ): Promise<RepairAssetExtended> => {
    return unwrapResponse(
      request.post<RepairAssetExtended>(`/assets/assets/${recordcode}/repair-done/`, data),
    )
  },

  /**
   * 维修失败（Action 端点）
   * POST /api/assets/assets/{recordcode}/repair-failed/
   * 对应后端 AssetViewSet.repair_failed action
   * 注意：asset 由 URL 中的 recordcode 标识，请求体无需额外参数
   * @param recordcode 资产记录编码（用作 URL 查找参数）
   * @returns 维修记录详情
   */
  repairFailed: (recordcode: string): Promise<RepairAssetExtended> => {
    return unwrapResponse(
      request.post<RepairAssetExtended>(`/assets/assets/${recordcode}/repair-failed/`),
    )
  },
}
