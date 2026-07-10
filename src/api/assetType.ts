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
 * fail_items 格式与后端 BatchOperationMixin.batch_execute 对齐
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
   * 根据资产类型编码获取详情（启用缓存）
   * @param asset_type_code 资产类型编码
   * @returns 资产类型详情
   */
  getAssetTypeByCode: (asset_type_code: string): Promise<AssetType> => {
    return unwrapResponse(request.get<AssetType>(`/assets/asset-types/${asset_type_code}/`,
      undefined,
      true, // 使用缓存
      300000, // 缓存时间 5 分钟
    ))
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
   * @param data 资产类型更新表单数据（需包含 asset_type_code）
   * @returns 更新后的资产类型
   */
  updateAssetType: (data: Partial<AssetTypeUpdateForm>): Promise<AssetType> => {
    if (!data.asset_type_code) {
      throw new Error('asset_type_code is required for update')
    }
    return unwrapResponse(request.put<AssetType>(`/assets/asset-types/${data.asset_type_code}/`, data))
  },

  /**
   * 局部更新资产类型
   * @param data 资产类型更新表单数据（需包含 asset_type_code）
   * @returns 更新后的资产类型
   */
  partialUpdateAssetType: (data: Partial<AssetTypeUpdateForm>): Promise<AssetType> => {
    if (!data.asset_type_code) {
      throw new Error('asset_type_code is required for update')
    }
    return unwrapResponse(request.patch<AssetType>(`/assets/asset-types/${data.asset_type_code}/`, data))
  },

  /**
   * 删除资产类型
   * @param asset_type_code 资产类型编码
   */
  deleteAssetType: (asset_type_code: string): Promise<void> => {
    return unwrapResponse(request.delete<void>(`/assets/asset-types/${asset_type_code}/`))
  },

  /**
   * 批量删除资产类型
   * POST /api/assets/asset-types/batch-delete/
   * 对应后端 AssetTypeViewSet.batch_delete action
   */
  batchDeleteAssetTypes: (asset_type_codes: string[]): Promise<BatchDeleteResult> => {
    return unwrapResponse(
      request.post<BatchDeleteResult>('/assets/asset-types/batch-delete/', {
        ids: asset_type_codes,
      }),
    )
  },

  /**
   * 批量创建资产类型
   * POST /api/assets/asset-types/batch-create/
   * 对应后端 AssetTypeViewSet.batch_create action
   * 一次性提交多条资产类型数据，后端逐条处理并返回成功/失败明细
   */
  batchCreateAssetTypes: (items: AssetTypeCreateForm[]): Promise<AssetTypeBatchCreateResult> => {
    return unwrapResponse(
      request.post<AssetTypeBatchCreateResult>('/assets/asset-types/batch-create/', {
        items,
      }),
    )
  },
}
