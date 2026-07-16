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

import { wasteAssetAPI } from '@/api/wasteAsset'

describe('wasteAssetAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getWasteAssets calls GET /assets/waste-assets/', async () => {
    await wasteAssetAPI.getWasteAssets({ page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/waste-assets/', { page: 1 })
  })

  it('getWasteAsset calls GET /assets/waste-assets/{code}/', async () => {
    await wasteAssetAPI.getWasteAsset('WA001')
    expect(mockRequest.get).toHaveBeenCalledWith(
      '/assets/waste-assets/WA001/',
      undefined,
      true,
      300000,
    )
  })

  it('createWasteAsset calls POST /assets/waste-assets/', async () => {
    await wasteAssetAPI.createWasteAsset({ asset_code: 'A001' } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/waste-assets/', { asset_code: 'A001' })
  })

  it('updateWasteAsset calls PUT /assets/waste-assets/{code}/', async () => {
    await wasteAssetAPI.updateWasteAsset('WA001', { description: 'Updated' })
    expect(mockRequest.put).toHaveBeenCalledWith('/assets/waste-assets/WA001/', {
      description: 'Updated',
    })
  })

  it('deleteWasteAsset calls DELETE /assets/waste-assets/{code}/', async () => {
    await wasteAssetAPI.deleteWasteAsset('WA001')
    expect(mockRequest.delete).toHaveBeenCalledWith('/assets/waste-assets/WA001/')
  })

  it('batchDeleteWasteAssets calls POST /assets/waste-assets/batch-delete/', async () => {
    await wasteAssetAPI.batchDeleteWasteAssets(['WA001', 'WA002'])
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/waste-assets/batch-delete/', {
      ids: ['WA001', 'WA002'],
    })
  })

  it('getWasteAssetsByAsset calls GET /assets/waste-assets/by-asset/{code}/', async () => {
    await wasteAssetAPI.getWasteAssetsByAsset('A001')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/waste-assets/by-asset/A001/')
  })

  it('getWasteAssetStatistics calls GET /assets/waste-assets/statistics/', async () => {
    await wasteAssetAPI.getWasteAssetStatistics()
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/waste-assets/statistics/')
  })

  it('getWasteAssetsByDateRange calls GET /assets/waste-assets/by-date-range/', async () => {
    await wasteAssetAPI.getWasteAssetsByDateRange('2026-01-01', '2026-01-31')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/waste-assets/by-date-range/', {
      start_date: '2026-01-01',
      end_date: '2026-01-31',
    })
  })
})
