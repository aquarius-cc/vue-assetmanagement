/**
 * 资产类型管理 API
 * 对应后端接口: /api/assets/asset-types/
 * 所有字段名采用 snake_case 与后端序列化器保持一致
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  AssetType,
  AssetTypeCreateForm,
  AssetTypeUpdateForm,
  AssetTypeListResponse,
  AssetTypeQueryParams,
} from '@/utils/AssetType'
import type { BatchDeleteResult } from '@/stores/createEntityStore'

/**
 * 批量创建资产类型响应
 * 对应后端 AssetTypeViewSet.batch_create action 返回格式
 */
export interface AssetTypeBatchCreateResult {
  total: number
  success_count: number
  fail_count: number
  success_items: AssetType[]
  fail_items: Array<{
    index: number
    error_code: string
    error_message: string
    input_data: AssetTypeCreateForm
    row_number?: number
  }>
}

/**
 * 资产类型管理 API
 */
export const assetTypeAPI = {
  /**
   * 获取资产类型列表
   * @param params 查询参数
   * @returns 资产类型列表响应
   */
  getAssetTypes: (params?: AssetTypeQueryParams): Promise<AssetTypeListResponse> => {
    return unwrapResponse(request.get<AssetTypeListResponse>('/assets/asset-types/', params))
  },

  /**
   * 根据 recordcode 获取资产类型详情（启用缓存）
   * @param recordcode 资产类型 recordcode
   * @returns 资产类型详情
   */
  getAssetTypeByRecordcode: (recordcode: string): Promise<AssetType> => {
    return unwrapResponse(
      request.get<AssetType>(`/assets/asset-types/${recordcode}/`, undefined, true, 300000),
    )
  },

  /**
   * 创建资产类型
   * @param data 资产类型创建表单数据
   * @returns 创建的资产类型
   */
  createAssetType: (data: AssetTypeCreateForm): Promise<AssetType> => {
    return unwrapResponse(request.post<AssetType>('/assets/asset-types/', data))
  },

  /**
   * 更新资产类型
   * @param data 资产类型更新表单数据（需包含 recordcode）
   * @returns 更新后的资产类型
   */
  updateAssetType: (data: AssetTypeUpdateForm): Promise<AssetType> => {
    const recordcode = data.recordcode
    if (!recordcode) {
      throw new Error('recordcode is required for update')
    }
    return unwrapResponse(request.put<AssetType>(`/assets/asset-types/${recordcode}/`, data))
  },

  /**
   * 局部更新资产类型
   * @param data 资产类型更新表单数据（需包含 recordcode）
   * @returns 更新后的资产类型
   */
  partialUpdateAssetType: (
    data: Partial<AssetTypeUpdateForm> & { recordcode: string },
  ): Promise<AssetType> => {
    return unwrapResponse(request.patch<AssetType>(`/assets/asset-types/${data.recordcode}/`, data))
  },

  /**
   * 删除资产类型
   * @param recordcode 资产类型 recordcode
   */
  deleteAssetType: (recordcode: string): Promise<void> => {
    return unwrapResponse(request.delete<void>(`/assets/asset-types/${recordcode}/`))
  },

  /**
   * 批量删除资产类型
   * POST /api/assets/asset-types/batch-delete/
   * 后端 AssetTypeBatchDeleteSerializer 接收 ids 列表（type_code 值）
   */
  batchDeleteAssetTypes: (type_codes: string[]): Promise<BatchDeleteResult> => {
    return unwrapResponse(
      request.post<BatchDeleteResult>('/assets/asset-types/batch-delete/', {
        ids: type_codes,
      }),
    )
  },

  /**
   * 批量创建资产类型
   * POST /api/assets/asset-types/batch-create/
   * 后端 AssetTypeBatchCreateItemSerializer 接收 type_code/type_name/parent_type_code/level/type_description/sort_order
   */
  batchCreateAssetTypes: (items: AssetTypeCreateForm[]): Promise<AssetTypeBatchCreateResult> => {
    return unwrapResponse(
      request.post<AssetTypeBatchCreateResult>('/assets/asset-types/batch-create/', {
        items,
      }),
    )
  },
}
