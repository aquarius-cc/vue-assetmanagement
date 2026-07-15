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

import { lostAssetAPI } from '@/api/lostAsset'

describe('lostAssetAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getLostAssets calls GET /assets/lost-assets/', async () => {
    await lostAssetAPI.getLostAssets({ page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/lost-assets/', { page: 1 })
  })

  it('getLostAssetByCode calls GET /assets/lost-assets/{code}/', async () => {
    await lostAssetAPI.getLostAssetByCode('LA001')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/lost-assets/LA001/', undefined, true, 300000)
  })

  it('createLostAsset calls POST /assets/lost-assets/', async () => {
    await lostAssetAPI.createLostAsset({ asset_code: 'A001' } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/lost-assets/', { asset_code: 'A001' })
  })

  it('updateLostAsset calls PUT /assets/lost-assets/{code}/', async () => {
    await lostAssetAPI.updateLostAsset({ recordcode: 'LA001', description: 'Updated' } as never)
    expect(mockRequest.put).toHaveBeenCalledWith('/assets/lost-assets/LA001/', { recordcode: 'LA001', description: 'Updated' })
  })

  it('updateLostAsset throws when recordcode is missing', () => {
    expect(() => lostAssetAPI.updateLostAsset({ id: undefined } as never)).toThrow('recordcode is required')
  })

  it('deleteLostAsset calls DELETE /assets/lost-assets/{code}/', async () => {
    await lostAssetAPI.deleteLostAsset('LA001')
    expect(mockRequest.delete).toHaveBeenCalledWith('/assets/lost-assets/LA001/')
  })

  it('batchDeleteLostAssets calls POST /assets/lost-assets/batch-delete/', async () => {
    await lostAssetAPI.batchDeleteLostAssets(['LA001', 'LA002'])
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/lost-assets/batch-delete/', { ids: ['LA001', 'LA002'] })
  })

  it('batchCreateLostAssets calls POST /assets/lost-assets/batch-create/', async () => {
    await lostAssetAPI.batchCreateLostAssets({ items: [{ asset_code: 'A001' }] } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/lost-assets/batch-create/', { items: [{ asset_code: 'A001' }] })
  })

  it('getLostAssetsByAsset calls GET /assets/lost-assets/by-asset/{code}/', async () => {
    await lostAssetAPI.getLostAssetsByAsset('A001')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/lost-assets/by-asset/A001/')
  })

  it('markAssetAsLost calls POST /assets/assets/{code}/mark-lost/', async () => {
    await lostAssetAPI.markAssetAsLost('A001', { lost_reason: 'theft' } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/assets/A001/mark-lost/', { lost_reason: 'theft' })
  })

  it('foundAsset calls POST /assets/assets/{code}/found/', async () => {
    await lostAssetAPI.foundAsset('A001', { found_location: 'office' })
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/assets/A001/found/', { found_location: 'office' })
  })
})
