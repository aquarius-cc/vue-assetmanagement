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

import { outAssetAPI } from '@/api/outAsset'

describe('outAssetAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getOutAssets calls GET /assets/out-assets/', async () => {
    await outAssetAPI.getOutAssets({ page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/out-assets/', { page: 1 })
  })

  it('getRecyclableOutAssets calls GET /assets/out-assets/recyclable/', async () => {
    await outAssetAPI.getRecyclableOutAssets({ page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/out-assets/recyclable/', { page: 1 })
  })

  it('getOutAssetByCode calls GET /assets/out-assets/{code}/', async () => {
    await outAssetAPI.getOutAssetByCode('OA001')
    expect(mockRequest.get).toHaveBeenCalledWith(
      '/assets/out-assets/OA001/',
      undefined,
      true,
      300000,
    )
  })

  it('createOutAsset calls POST /assets/out-assets/', async () => {
    await outAssetAPI.createOutAsset({ outasset_code: 'A001', outasset_person: 'E001' } as never)
    expect(mockRequest.post).toHaveBeenCalled()
  })

  it('deleteOutAsset calls DELETE /assets/out-assets/{code}/', async () => {
    await outAssetAPI.deleteOutAsset('OA001')
    expect(mockRequest.delete).toHaveBeenCalledWith('/assets/out-assets/OA001/')
  })

  it('batchDeleteOutAssets calls POST /assets/out-assets/batch-delete/', async () => {
    await outAssetAPI.batchDeleteOutAssets(['OA001', 'OA002'])
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/out-assets/batch-delete/', {
      ids: ['OA001', 'OA002'],
    })
  })

  it('batchCreateOutAssets calls POST /assets/out-assets/batch-create/', async () => {
    await outAssetAPI.batchCreateOutAssets([{ outasset_code: 'A001' } as never])
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/out-assets/batch-create/', {
      items: [{ outasset_code: 'A001' }],
    })
  })
})
