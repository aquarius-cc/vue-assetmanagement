/**
 * BrokenAsset API
 * Backend: /api/assets/broken-assets/
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  BrokenAssetExtended,
  BrokenAssetCreateForm,
  BrokenAssetUpdateForm,
  BrokenAssetListResponse,
  BrokenAssetQueryParams,
  BrokenAssetBatchCreateForm,
  BrokenAssetBatchCreateResult,
} from '@/utils/BrokenAsset'
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
    return unwrapResponse(request.post<BrokenAssetExtended>('/assets/broken-assets/', data))
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
    return unwrapResponse(
      request.post<BrokenAssetBatchCreateResult>('/assets/broken-assets/batch-create/', data),
    )
  },

  getBrokenAssetsByAsset: (asset_code: string): Promise<BrokenAssetListResponse> => {
    return unwrapResponse(
      request.get<BrokenAssetListResponse>(`/assets/broken-assets/by-asset/${asset_code}/`),
    )
  },
}
