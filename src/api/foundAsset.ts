/**
 * @file 找到资产管理 API，提供找到资产的增删改查、批量操作等接口
 * @module api/foundAsset
 * @exports
 *   - foundAssetAPI: 找到资产管理 API 对象（包含所有找到资产相关方法）
 * @callers
 *   - stores/foundAssetStore: 找到资产状态管理
 *   - views/FoundAssetView: 找到资产管理视图
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/foundasset: 找到资产相关类型定义
 *   - stores/createEntityStore: 批量删除结果类型
 */
import { request, unwrapResponse, getBlob } from '@/api/index'
import { invalidateAssetCache, invalidateSubResourceCache } from './assetCache'
import type { BlobDownload } from '@/api/request'
import type {
  FoundAssetExtended,
  FoundAssetCreateForm,
  FoundAssetUpdateForm,
  FoundAssetListResponse,
  FoundAssetQueryParams,
} from '@/types/foundasset'
import type { BatchDeleteResult } from '@/stores/createEntityStore'

export const foundAssetAPI = {
  getFoundAssets: (params?: FoundAssetQueryParams): Promise<FoundAssetListResponse> => {
    return unwrapResponse(request.get<FoundAssetListResponse>('/assets/found-assets/', params))
  },

  getFoundAssetByCode: (recordcode: string): Promise<FoundAssetExtended> => {
    return unwrapResponse(
      request.get<FoundAssetExtended>(
        `/assets/found-assets/${recordcode}/`,
        undefined,
        true,
        300000,
      ),
    )
  },

  createFoundAsset: (data: FoundAssetCreateForm): Promise<FoundAssetExtended> => {
    // [M-RC-08] 找回改变资产状态，失效资产详情/列表缓存
    const result = unwrapResponse(request.post<FoundAssetExtended>('/assets/found-assets/', data))
    invalidateAssetCache(data.asset_recordcode)
    return result
  },

  updateFoundAsset: (data: Partial<FoundAssetUpdateForm>): Promise<FoundAssetExtended> => {
    const recordcode = (data as Record<string, unknown>).recordcode || data.id
    if (!recordcode) {
      throw new Error('recordcode is required for update')
    }
    return unwrapResponse(
      request.put<FoundAssetExtended>(`/assets/found-assets/${recordcode}/`, data),
    )
  },

  deleteFoundAsset: async (recordcode: string): Promise<void> => {
    // [M-CACHE-1] 单删命中不了列表 key（/assets/found-assets/?page=… 不含写 URL），显式失效
    await unwrapResponse(request.delete<void>(`/assets/found-assets/${recordcode}/`))
    invalidateSubResourceCache('/assets/found-assets/', [recordcode])
  },

  batchDeleteFoundAssets: async (recordcodes: string[]): Promise<BatchDeleteResult> => {
    const result = await unwrapResponse(
      request.post<BatchDeleteResult>('/assets/found-assets/batch-delete/', {
        ids: recordcodes,
      }),
    )
    // [M-CACHE-1] 批删 URL 两者皆不命中；同源：success_ids 优先，运行时缺失回退入参（保守过清）
    const successIds = Array.isArray(result.success_ids) ? result.success_ids : recordcodes
    invalidateSubResourceCache('/assets/found-assets/', successIds)
    return result
  },

  getFoundAssetsByAsset: (asset_code: string): Promise<FoundAssetListResponse> => {
    return unwrapResponse(
      request.get<FoundAssetListResponse>(`/assets/found-assets/by-asset/${asset_code}/`),
    )
  },

  /**
   * 服务端 Excel 导出（BF-092/I-1）
   * 省略 limit/offset 时全量导出，总行数超 EXPORT_MAX_ROWS 会被后端拒绝（400）。
   */
  exportExcel: (params?: Record<string, unknown>): Promise<BlobDownload> => {
    return getBlob('/assets/found-assets/export/', params, 'found_assets.xlsx')
  },
}
