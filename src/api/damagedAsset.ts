/**
 * 损坏资产管理 API
 * 对应后端接口: /api/assets/damaged-assets/
 * 所有字段名采用 snake_case 与后端序列化器保持一致
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  DamagedAsset,
  DamagedAssetCreateForm,
  DamagedAssetUpdateForm,
  DamagedAssetListResponse,
  DamagedAssetQueryParams,
} from '@/utils/DamagedAsset'
import type { BatchDeleteResult } from '@/stores/createEntityStore'

/**
 * 损坏资产管理 API
 */
export const damagedAssetAPI = {
  /**
   * 获取损坏资产列表
   * @param params 查询参数
   * @returns 损坏资产列表响应
   */
  getDamagedAssets: (params?: DamagedAssetQueryParams): Promise<DamagedAssetListResponse> => {
    return unwrapResponse(request.get<DamagedAssetListResponse>('/assets/damaged-assets/', params))
  },

  /**
   * 获取损坏资产详情（启用缓存）
   * @param code 损坏资产编码
   * @returns 损坏资产详情
   */
  getDamagedAsset: (code: string): Promise<DamagedAsset> => {
    return unwrapResponse(request.get(
      `/assets/damaged-assets/${code}/`,
      undefined,
      true, // 使用缓存
      300000, // 缓存时间 5 分钟
    ))
  },

  /**
   * 创建损坏记录
   * @param data 损坏记录创建表单数据
   * @returns 创建的损坏记录
   */
  createDamagedAsset: (data: DamagedAssetCreateForm): Promise<DamagedAsset> => {
    return unwrapResponse(request.post<DamagedAsset>('/assets/damaged-assets/', data))
  },

  /**
   * 更新损坏记录
   * @param code 损坏资产编码
   * @param data 损坏记录更新表单数据
   * @returns 更新后的损坏记录
   */
  updateDamagedAsset: (code: string, data: Partial<DamagedAssetUpdateForm>): Promise<DamagedAsset> => {
    return unwrapResponse(request.put<DamagedAsset>(`/assets/damaged-assets/${code}/`, data))
  },

  /**
   * 删除损坏记录
   * @param code 损坏资产编码
   */
  deleteDamagedAsset: (code: string): Promise<void> => {
    return unwrapResponse(request.delete<void>(`/assets/damaged-assets/${code}/`))
  },

  /**
   * 批量删除待报废资产
   * POST /api/assets/damaged-assets/batch-delete/
   * 对应后端 DamagedAssetViewSet.batch_delete action
   */
  batchDeleteDamagedAssets: (codes: string[]): Promise<BatchDeleteResult> => {
    return unwrapResponse(
      request.post<BatchDeleteResult>('/assets/damaged-assets/batch-delete/', {
        ids: codes,
      }),
    )
  },

  /**
   * 根据资产编码获取损坏记录
   * @param asset_code 资产编码
   * @returns 损坏记录列表响应
   */
  getDamagedAssetsByAsset: (asset_code: string): Promise<DamagedAssetListResponse> => {
    return unwrapResponse(request.get<DamagedAssetListResponse>(`/assets/damaged-assets/by-asset/${asset_code}/`))
  },
}
