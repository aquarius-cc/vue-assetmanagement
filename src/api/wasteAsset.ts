/**
 * 报废资产管理 API
 * 对应后端接口: /api/assets/waste-assets/
 * 所有字段名采用 snake_case 与后端序列化器保持一致
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  WasteAsset,
  WasteAssetCreateForm,
  WasteAssetUpdateForm,
  WasteAssetQueryParams,
  WasteAssetListResponse,
  WasteAssetStats,
} from '@/utils/WasteAsset'
import type { BatchDeleteResult } from '@/stores/createEntityStore'

/**
 * 报废资产管理 API
 */
export const wasteAssetAPI = {
  /**
   * 获取报废资产列表
   * @param params 查询参数
   * @returns 报废资产列表响应
   */
  getWasteAssets: (params?: WasteAssetQueryParams): Promise<WasteAssetListResponse> => {
    return unwrapResponse(request.get<WasteAssetListResponse>('/assets/waste-assets/', params))
  },

  /**
   * 获取报废资产详情（启用缓存）
   * @param code 资产编码
   * @returns 报废资产详情
   */
  getWasteAsset: (code: string): Promise<WasteAsset> => {
    return unwrapResponse(
      request.get(
        `/assets/waste-assets/${code}/`,
        undefined,
        true, // 使用缓存
        300000, // 缓存时间 5 分钟
      ),
    )
  },

  /**
   * 创建报废记录
   * @param data 报废记录创建表单数据
   * @returns 创建的报废记录
   */
  createWasteAsset: (data: WasteAssetCreateForm): Promise<WasteAsset> => {
    return unwrapResponse(request.post<WasteAsset>('/assets/waste-assets/', data))
  },

  /**
   * 更新报废记录
   * @param id 报废记录 ID
   * @param data 报废记录更新表单数据
   * @returns 更新后的报废记录
   */
  updateWasteAsset: (code: string, data: Partial<WasteAssetUpdateForm>): Promise<WasteAsset> => {
    return unwrapResponse(request.put<WasteAsset>(`/assets/waste-assets/${code}/`, data))
  },

  /**
   * 删除报废记录
   * @param id 报废记录 ID
   */
  deleteWasteAsset: (code: string): Promise<void> => {
    return unwrapResponse(request.delete<void>(`/assets/waste-assets/${code}/`))
  },

  /**
   * 批量删除已报废资产
   * POST /api/assets/waste-assets/batch-delete/
   * 对应后端 WasteAssetViewSet.batch_delete action
   */
  batchDeleteWasteAssets: (codes: string[]): Promise<BatchDeleteResult> => {
    return unwrapResponse(
      request.post<BatchDeleteResult>('/assets/waste-assets/batch-delete/', {
        ids: codes,
      }),
    )
  },

  /**
   * 根据资产编码获取报废记录
   * @param asset_code 资产编码
   * @returns 报废记录列表响应
   */
  getWasteAssetsByAsset: (asset_code: string): Promise<WasteAssetListResponse> => {
    return unwrapResponse(
      request.get<WasteAssetListResponse>(`/assets/waste-assets/by-asset/${asset_code}/`),
    )
  },

  /**
   * 获取报废统计信息
   * @returns 报废统计数据
   */
  getWasteAssetStatistics: (): Promise<WasteAssetStats> => {
    return unwrapResponse(request.get<WasteAssetStats>('/assets/waste-assets/statistics/'))
  },

  /**
   * [MR-09] 按日期范围查询已报废记录
   * @param start_date 开始日期 (YYYY-MM-DD)
   * @param end_date 结束日期 (YYYY-MM-DD)
   * @returns 已报废记录列表响应
   */
  getWasteAssetsByDateRange: (
    start_date: string,
    end_date: string,
  ): Promise<WasteAssetListResponse> => {
    return unwrapResponse(
      request.get<WasteAssetListResponse>('/assets/waste-assets/by-date-range/', {
        start_date,
        end_date,
      }),
    )
  },
}
