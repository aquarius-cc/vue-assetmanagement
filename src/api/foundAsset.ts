/**
 * @file 找到资产管理 API，提供找到资产的增删改查、批量操作等接口
 * @module api/foundAsset
 * @exports
 *   - foundAssetAPI: 找到资产管理 API 对象（包含所有找到资产相关方法）
 * @callers
 *   - stores/foundAssetStore: 找到资产状态管理
 *   - views/FoundAssetManage: 找到资产管理视图
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/foundasset: 找到资产相关类型定义
 *   - stores/createEntityStore: 批量删除结果类型
 */
import { request, unwrapResponse } from '@/api/index'
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
    return unwrapResponse(request.post<FoundAssetExtended>('/assets/found-assets/', data))
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

  deleteFoundAsset: (recordcode: string): Promise<void> => {
    return unwrapResponse(request.delete<void>(`/assets/found-assets/${recordcode}/`))
  },

  batchDeleteFoundAssets: (recordcodes: string[]): Promise<BatchDeleteResult> => {
    return unwrapResponse(
      request.post<BatchDeleteResult>('/assets/found-assets/batch-delete/', {
        ids: recordcodes,
      }),
    )
  },

  getFoundAssetsByAsset: (asset_code: string): Promise<FoundAssetListResponse> => {
    return unwrapResponse(
      request.get<FoundAssetListResponse>(`/assets/found-assets/by-asset/${asset_code}/`),
    )
  },
}
