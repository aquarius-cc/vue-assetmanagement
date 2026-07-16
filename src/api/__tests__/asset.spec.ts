import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequest, mockUnwrapResponse } = vi.hoisted(() => ({
  mockRequest: {
    get: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    post: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    put: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    patch: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    delete: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
  },
  mockUnwrapResponse: vi.fn(
    async (promise: Promise<{ code: number; data: unknown; message: string }>) => {
      const res = await promise
      if (res.code !== 0) throw new Error(res.message || '请求失败')
      return res.data
    },
  ),
}))

vi.mock('@/api/index', () => ({
  request: mockRequest,
  unwrapResponse: mockUnwrapResponse,
}))

vi.mock('axios', () => ({
  isAxiosError: vi.fn((err: unknown) => err instanceof Error && 'response' in err),
}))

import { assetAPI } from '@/api/asset'

describe('assetAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getAssets calls GET /assets/assets/', async () => {
    await assetAPI.getAssets({ page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/assets/', { page: 1 })
  })

  it('createAsset calls POST /assets/assets/', async () => {
    await assetAPI.createAsset({ asset_name: 'Test' } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/assets/', { asset_name: 'Test' })
  })

  it('getAssetByCode calls GET /assets/assets/{code}/', async () => {
    await assetAPI.getAssetByCode('A001')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/assets/A001/', undefined, true, 300000)
  })

  it('updateAsset calls PUT /assets/assets/{code}/', async () => {
    await assetAPI.updateAsset({ asset_code: 'A001', asset_name: 'Updated' } as never)
    expect(mockRequest.put).toHaveBeenCalledWith('/assets/assets/A001/', { asset_name: 'Updated' })
  })

  it('updateAsset throws when asset_code is missing', () => {
    expect(() => assetAPI.updateAsset({ asset_name: 'Test' } as never)).toThrow(
      'asset_code is required',
    )
  })

  it('deleteAsset calls DELETE /assets/assets/{code}/', async () => {
    await assetAPI.deleteAsset('A001')
    expect(mockRequest.delete).toHaveBeenCalledWith('/assets/assets/A001/')
  })

  it('getAssetByName calls GET /assets/assets/getassetbyname/{name}/', async () => {
    await assetAPI.getAssetByName('Test Asset')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/assets/getassetbyname/Test%20Asset/')
  })

  it('searchAvailableAssets calls GET /assets/assets/search_available/', async () => {
    await assetAPI.searchAvailableAssets({ page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/assets/search_available/', { page: 1 })
  })

  it('searchAssets calls GET /assets/assets/search/', async () => {
    await assetAPI.searchAssets({ keyword: 'laptop' })
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/assets/search/', { keyword: 'laptop' })
  })

  it('combineSearch calls GET /assets/assets/combine_search/', async () => {
    await assetAPI.combineSearch({ asset_name: 'laptop' })
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/assets/combine_search/', {
      asset_name: 'laptop',
    })
  })

  it('getContractByAssetCode calls GET /assets/assets/contract_by_asset/{code}/', async () => {
    await assetAPI.getContractByAssetCode('A001')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/assets/contract_by_asset/A001/')
  })

  it('changeAssetStatus calls POST /assets/assets/{code}/change_status/', async () => {
    await assetAPI.changeAssetStatus('A001', { status: 'in_use' })
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/assets/A001/change_status/', {
      status: 'in_use',
    })
  })

  it('markAssetAsBroken calls POST /assets/assets/{code}/mark-broken/', async () => {
    await assetAPI.markAssetAsBroken('A001', { broken_reason: 'crack' })
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/assets/A001/mark-broken/', {
      broken_reason: 'crack',
    })
  })

  it('getCombinedDetails calls GET /assets/assets/combined_details/', async () => {
    await assetAPI.getCombinedDetails('A001')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/assets/combined_details/', {
      asset_code: 'A001',
    })
  })

  it('getAssetStatistics calls GET /assets/assets/statistics/', async () => {
    await assetAPI.getAssetStatistics()
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/assets/statistics/')
  })

  it('getAssetHistory calls GET /assets/assets/{code}/history/', async () => {
    await assetAPI.getAssetHistory('A001')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/assets/A001/history/')
  })

  it('getAssetTimeline calls GET /assets/assets/{code}/timeline/', async () => {
    await assetAPI.getAssetTimeline('A001')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/assets/A001/timeline/')
  })

  it('batchDeleteAssets calls POST /assets/assets/batch-delete/', async () => {
    await assetAPI.batchDeleteAssets(['A001', 'A002'])
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/assets/batch-delete/', {
      ids: ['A001', 'A002'],
    })
  })

  it('batchCreateAssets calls POST /assets/assets/batch-create/', async () => {
    await assetAPI.batchCreateAssets([{ asset_name: 'X' } as never])
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/assets/batch-create/', {
      items: [{ asset_name: 'X' }],
    })
  })
})
