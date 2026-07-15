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

import { unregisteredAssetAPI } from '@/api/unregisteredAsset'

describe('unregisteredAssetAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getUnregisteredAssets calls GET /unregisteredassets/unregistered-assets/', async () => {
    await unregisteredAssetAPI.getUnregisteredAssets({ page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/unregisteredassets/unregistered-assets/', { page: 1 })
  })

  it('getUnregisteredAsset calls GET /unregisteredassets/unregistered-assets/{code}/', async () => {
    await unregisteredAssetAPI.getUnregisteredAsset('UA001')
    expect(mockRequest.get).toHaveBeenCalledWith('/unregisteredassets/unregistered-assets/UA001/', undefined, true, 300000)
  })

  it('createUnregisteredAsset calls POST /unregisteredassets/unregistered-assets/', async () => {
    await unregisteredAssetAPI.createUnregisteredAsset({ asset_name: 'New' } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/unregisteredassets/unregistered-assets/', { asset_name: 'New' })
  })

  it('updateUnregisteredAsset calls PUT /unregisteredassets/unregistered-assets/{code}/', async () => {
    await unregisteredAssetAPI.updateUnregisteredAsset('UA001', { asset_name: 'Updated' })
    expect(mockRequest.put).toHaveBeenCalledWith('/unregisteredassets/unregistered-assets/UA001/', { asset_name: 'Updated' })
  })

  it('deleteUnregisteredAsset calls DELETE /unregisteredassets/unregistered-assets/{code}/', async () => {
    await unregisteredAssetAPI.deleteUnregisteredAsset('UA001')
    expect(mockRequest.delete).toHaveBeenCalledWith('/unregisteredassets/unregistered-assets/UA001/')
  })

  it('batchDeleteUnregisteredAssets calls POST /unregisteredassets/unregistered-assets/batch-delete/', async () => {
    await unregisteredAssetAPI.batchDeleteUnregisteredAssets(['UA001', 'UA002'])
    expect(mockRequest.post).toHaveBeenCalledWith('/unregisteredassets/unregistered-assets/batch-delete/', { ids: ['UA001', 'UA002'] })
  })

  it('approveUnregisteredAsset calls POST /unregisteredassets/unregistered-assets/{code}/approve/', async () => {
    await unregisteredAssetAPI.approveUnregisteredAsset('UA001', { status: 'approved' } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/unregisteredassets/unregistered-assets/UA001/approve/', { status: 'approved' })
  })
})
