import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequest, mockUnwrapResponse } = vi.hoisted(() => ({
  mockRequest: {
    get: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    post: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    put: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    patch: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    delete: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
  },
  mockUnwrapResponse: vi.fn(async (promise: Promise<{ code: number; data: unknown; message: string }>) => {
    const res = await promise
    if (res.code !== 0) throw new Error(res.message || '请求失败')
    return res.data
  }),
}))

vi.mock('@/api/index', () => ({
  request: mockRequest,
  unwrapResponse: mockUnwrapResponse,
}))

import { brokenAssetAPI } from '@/api/brokenAsset'

describe('brokenAssetAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getBrokenAssets calls GET /assets/broken-assets/', async () => {
    await brokenAssetAPI.getBrokenAssets({ page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/broken-assets/', { page: 1 })
  })

  it('getBrokenAssetByCode calls GET /assets/broken-assets/{code}/', async () => {
    await brokenAssetAPI.getBrokenAssetByCode('BA001')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/broken-assets/BA001/', undefined, true, 300000)
  })

  it('createBrokenAsset calls POST /assets/broken-assets/', async () => {
    await brokenAssetAPI.createBrokenAsset({ asset_code: 'A001' } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/broken-assets/', { asset_code: 'A001' })
  })

  it('updateBrokenAsset calls PUT /assets/broken-assets/{code}/', async () => {
    await brokenAssetAPI.updateBrokenAsset({ recordcode: 'BA001', description: 'Updated' } as never)
    expect(mockRequest.put).toHaveBeenCalledWith('/assets/broken-assets/BA001/', { recordcode: 'BA001', description: 'Updated' })
  })

  it('updateBrokenAsset throws when recordcode is missing', () => {
    expect(() => brokenAssetAPI.updateBrokenAsset({ id: undefined } as never)).toThrow('recordcode is required')
  })

  it('deleteBrokenAsset calls DELETE /assets/broken-assets/{code}/', async () => {
    await brokenAssetAPI.deleteBrokenAsset('BA001')
    expect(mockRequest.delete).toHaveBeenCalledWith('/assets/broken-assets/BA001/')
  })

  it('batchDeleteBrokenAssets calls POST /assets/broken-assets/batch-delete/', async () => {
    await brokenAssetAPI.batchDeleteBrokenAssets(['BA001', 'BA002'])
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/broken-assets/batch-delete/', { ids: ['BA001', 'BA002'] })
  })

  it('batchCreateBrokenAssets calls POST /assets/broken-assets/batch-create/', async () => {
    await brokenAssetAPI.batchCreateBrokenAssets({ items: [{ asset_code: 'A001' }] } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/broken-assets/batch-create/', { items: [{ asset_code: 'A001' }] })
  })

  it('getBrokenAssetsByAsset calls GET /assets/broken-assets/by-asset/{code}/', async () => {
    await brokenAssetAPI.getBrokenAssetsByAsset('A001')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/broken-assets/by-asset/A001/')
  })
})
