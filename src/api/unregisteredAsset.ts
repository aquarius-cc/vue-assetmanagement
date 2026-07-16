/**
 * 未登记资产管理 API
 * 对应后端接口: /unregisteredassets/unregistered-assets/
 * 所有字段名采用 snake_case 与后端序列化器保持一致
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  UnregisteredAsset,
  UnregisteredAssetCreateForm,
  UnregisteredAssetUpdateForm,
  UnregisteredAssetListResponse,
  UnregisteredAssetQueryParams,
  UnregisteredAssetApproveForm,
} from '@/utils/UnregisteredAsset'
import type { BatchDeleteResult } from '@/stores/createEntityStore'

/**
 * 未登记资产管理 API
 */
export const unregisteredAssetAPI = {
  /**
   * 获取未登记资产列表
   * @param params 查询参数
   * @returns 未登记资产列表响应
   */
  getUnregisteredAssets: (
    params?: UnregisteredAssetQueryParams,
  ): Promise<UnregisteredAssetListResponse> => {
    return unwrapResponse(
      request.get<UnregisteredAssetListResponse>(
        '/unregisteredassets/unregistered-assets/',
        params,
      ),
    )
  },

  /**
   * 获取未登记资产详情（启用缓存）
   * @param code 未登记资产编码
   * @returns 未登记资产详情
   */
  getUnregisteredAsset: (code: string): Promise<UnregisteredAsset> => {
    return unwrapResponse(
      request.get(
        `/unregisteredassets/unregistered-assets/${code}/`,
        undefined,
        true, // 使用缓存
        300000, // 缓存时间 5 分钟
      ),
    )
  },

  /**
   * 创建未登记资产
   * @param data 未登记资产创建表单数据
   * @returns 创建的未登记资产
   */
  createUnregisteredAsset: (data: UnregisteredAssetCreateForm): Promise<UnregisteredAsset> => {
    return unwrapResponse(
      request.post<UnregisteredAsset>('/unregisteredassets/unregistered-assets/', data),
    )
  },

  /**
   * 更新未登记资产
   * @param code 未登记资产编码
   * @param data 未登记资产更新表单数据
   * @returns 更新后的未登记资产
   */
  updateUnregisteredAsset: (
    code: string,
    data: Partial<UnregisteredAssetUpdateForm>,
  ): Promise<UnregisteredAsset> => {
    return unwrapResponse(
      request.put<UnregisteredAsset>(`/unregisteredassets/unregistered-assets/${code}/`, data),
    )
  },

  /**
   * 删除未登记资产
   * @param code 未登记资产编码
   */
  deleteUnregisteredAsset: (code: string): Promise<void> => {
    return unwrapResponse(request.delete<void>(`/unregisteredassets/unregistered-assets/${code}/`))
  },

  /**
   * 批量删除未登记资产
   * POST /api/unregisteredassets/unregistered-assets/batch-delete/
   * 对应后端 UnregisteredAssetViewSet.batch_delete action
   */
  batchDeleteUnregisteredAssets: (codes: string[]): Promise<BatchDeleteResult> => {
    return unwrapResponse(
      request.post<BatchDeleteResult>('/unregisteredassets/unregistered-assets/batch-delete/', {
        ids: codes,
      }),
    )
  },

  /**
   * 审批未登记资产
   * @param code 未登记资产编码
   * @param data 审批表单数据
   * @returns 更新后的未登记资产
   */
  approveUnregisteredAsset: (
    code: string,
    data: UnregisteredAssetApproveForm,
  ): Promise<UnregisteredAsset> => {
    return unwrapResponse(
      request.post<UnregisteredAsset>(
        `/unregisteredassets/unregistered-assets/${code}/approve/`,
        data,
      ),
    )
  },
}
