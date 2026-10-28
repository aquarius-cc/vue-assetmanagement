/**
 * @file 损坏资产管理 API，提供损坏资产的增删改查、批量操作等接口
 * @module api/brokenAsset
 * @exports
 *   - brokenAssetAPI: 损坏资产管理 API 对象（包含所有损坏资产相关方法）
 * @callers
 *   - stores/brokenAssetStore: 损坏资产状态管理
 *   - components/componentsdetails/BrokenAssetDetails: 损坏资产管理视图
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/brokenasset: 损坏资产相关类型定义
 *   - stores/createEntityStore: 批量删除结果类型
 */
import { request, unwrapResponse, getBlob } from '@/api/index'
import { invalidateAssetCache } from './assetCache'
import type { BlobDownload } from '@/api/request'
import type {
  BrokenAssetExtended,
  BrokenAssetCreateForm,
  BrokenAssetUpdateForm,
  BrokenAssetListResponse,
  BrokenAssetQueryParams,
  BrokenAssetBatchCreateForm,
  BrokenAssetBatchCreateResult,
} from '@/types/brokenasset'
import type { BatchDeleteResult } from '@/stores/createEntityStore'

export const brokenAssetAPI = {
  getBrokenAssets: (params?: BrokenAssetQueryParams): Promise<BrokenAssetListResponse> => {
    return unwrapResponse(request.get<BrokenAssetListResponse>('/assets/broken-assets/', params))
  },

  getBrokenAssetByCode: (recordcode: string): Promise<BrokenAssetExtended> => {
    return unwrapResponse(
      request.get<BrokenAssetExtended>(
        `/assets/broken-assets/${recordcode}/`,
        undefined,
        true,
        300000,
      ),
    )
  },

  createBrokenAsset: (data: BrokenAssetCreateForm): Promise<BrokenAssetExtended> => {
    // [M-RC-08] 损坏登记改变资产状态，失效资产详情/列表缓存
    const result = unwrapResponse(request.post<BrokenAssetExtended>('/assets/broken-assets/', data))
    invalidateAssetCache(data.asset_recordcode)
    return result
  },

  updateBrokenAsset: (data: Partial<BrokenAssetUpdateForm>): Promise<BrokenAssetExtended> => {
    const recordcode = (data as Record<string, unknown>).recordcode || data.id
    if (!recordcode) {
      throw new Error('recordcode is required for update')
    }
    return unwrapResponse(
      request.put<BrokenAssetExtended>(`/assets/broken-assets/${recordcode}/`, data),
    )
  },

  deleteBrokenAsset: (recordcode: string): Promise<void> => {
    return unwrapResponse(request.delete<void>(`/assets/broken-assets/${recordcode}/`))
  },

  batchDeleteBrokenAssets: (recordcodes: string[]): Promise<BatchDeleteResult> => {
    return unwrapResponse(
      request.post<BatchDeleteResult>('/assets/broken-assets/batch-delete/', {
        ids: recordcodes,
      }),
    )
  },

  batchCreateBrokenAssets: (
    data: BrokenAssetBatchCreateForm,
  ): Promise<BrokenAssetBatchCreateResult> => {
    // [M-RC-08] 批量登记涉及多资产状态，宽失效全部资产缓存
    const result = unwrapResponse(
      request.post<BrokenAssetBatchCreateResult>('/assets/broken-assets/batch-create/', data),
    )
    invalidateAssetCache()
    return result
  },

  getBrokenAssetsByAsset: (asset_code: string): Promise<BrokenAssetListResponse> => {
    return unwrapResponse(
      request.get<BrokenAssetListResponse>(`/assets/broken-assets/by-asset/${asset_code}/`),
    )
  },

  /**
   * 服务端 Excel 导出（BF-092/I-1）
   * 省略 limit/offset 时全量导出，总行数超 EXPORT_MAX_ROWS 会被后端拒绝（400）。
   */
  exportExcel: (params?: Record<string, unknown>): Promise<BlobDownload> => {
    return getBlob('/assets/broken-assets/export/', params, 'broken_assets.xlsx')
  },
}
