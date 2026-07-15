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

import { foundAssetAPI } from '@/api/foundAsset'

describe('foundAssetAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getFoundAssets calls GET /assets/found-assets/', async () => {
    await foundAssetAPI.getFoundAssets({ page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/found-assets/', { page: 1 })
  })

  it('getFoundAssetByCode calls GET /assets/found-assets/{code}/', async () => {
    await foundAssetAPI.getFoundAssetByCode('FA001')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/found-assets/FA001/', undefined, true, 300000)
  })

  it('createFoundAsset calls POST /assets/found-assets/', async () => {
    await foundAssetAPI.createFoundAsset({ asset_code: 'A001' } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/found-assets/', { asset_code: 'A001' })
  })

  it('updateFoundAsset calls PUT /assets/found-assets/{code}/', async () => {
    await foundAssetAPI.updateFoundAsset({ recordcode: 'FA001', description: 'Updated' } as never)
    expect(mockRequest.put).toHaveBeenCalledWith('/assets/found-assets/FA001/', { recordcode: 'FA001', description: 'Updated' })
  })

  it('updateFoundAsset throws when recordcode is missing', () => {
    expect(() => foundAssetAPI.updateFoundAsset({ id: undefined } as never)).toThrow('recordcode is required')
  })

  it('deleteFoundAsset calls DELETE /assets/found-assets/{code}/', async () => {
    await foundAssetAPI.deleteFoundAsset('FA001')
    expect(mockRequest.delete).toHaveBeenCalledWith('/assets/found-assets/FA001/')
  })

  it('batchDeleteFoundAssets calls POST /assets/found-assets/batch-delete/', async () => {
    await foundAssetAPI.batchDeleteFoundAssets(['FA001', 'FA002'])
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/found-assets/batch-delete/', { ids: ['FA001', 'FA002'] })
  })

  it('getFoundAssetsByAsset calls GET /assets/found-assets/by-asset/{code}/', async () => {
    await foundAssetAPI.getFoundAssetsByAsset('A001')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/found-assets/by-asset/A001/')
  })
})
