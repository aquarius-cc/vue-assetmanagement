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

import { recycleAssetAPI } from '@/api/recycleAsset'

describe('recycleAssetAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getRecycleAssets calls GET /assets/recycle-assets/', async () => {
    await recycleAssetAPI.getRecycleAssets({ page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/recycle-assets/', { page: 1 })
  })

  it('getRecycleAssetByCode calls GET /assets/recycle-assets/{code}/', async () => {
    await recycleAssetAPI.getRecycleAssetByCode('RA001')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/recycle-assets/RA001/', undefined, true, 300000)
  })

  it('createRecycleAsset calls POST /assets/recycle-assets/', async () => {
    await recycleAssetAPI.createRecycleAsset({ asset_code: 'A001' } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/recycle-assets/', { asset_code: 'A001' })
  })

  it('updateRecycleAsset calls PUT /assets/recycle-assets/{code}/', async () => {
    await recycleAssetAPI.updateRecycleAsset({ recordcode: 'RA001', description: 'Updated' } as never)
    expect(mockRequest.put).toHaveBeenCalledWith('/assets/recycle-assets/RA001/', { recordcode: 'RA001', description: 'Updated' })
  })

  it('updateRecycleAsset throws when recordcode is missing', () => {
    expect(() => recycleAssetAPI.updateRecycleAsset({ id: undefined } as never)).toThrow('recordcode is required')
  })

  it('deleteRecycleAsset calls DELETE /assets/recycle-assets/{code}/', async () => {
    await recycleAssetAPI.deleteRecycleAsset('RA001')
    expect(mockRequest.delete).toHaveBeenCalledWith('/assets/recycle-assets/RA001/')
  })

  it('batchDeleteRecycleAssets calls POST /assets/recycle-assets/batch-delete/', async () => {
    await recycleAssetAPI.batchDeleteRecycleAssets(['RA001', 'RA002'])
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/recycle-assets/batch-delete/', { ids: ['RA001', 'RA002'] })
  })

  it('batchCreateRecycleAssets calls POST /assets/recycle-assets/batch-create/', async () => {
    await recycleAssetAPI.batchCreateRecycleAssets({ items: [{ asset_code: 'A001' }] } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/recycle-assets/batch-create/', { items: [{ asset_code: 'A001' }] })
  })

  it('getRecycleAssetsByAsset calls GET /assets/recycle-assets/by-asset/{code}/', async () => {
    await recycleAssetAPI.getRecycleAssetsByAsset('A001')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/recycle-assets/by-asset/A001/')
  })

  it('getRecycleAssetByOutAsset calls GET /assets/recycle-assets/by-outasset/{code}/', async () => {
    await recycleAssetAPI.getRecycleAssetByOutAsset('OA001')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/recycle-assets/by-outasset/OA001/')
  })
})
