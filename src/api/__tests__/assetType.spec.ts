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

import { assetTypeAPI } from '@/api/assetType'

describe('assetTypeAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getAssetTypes calls GET /assets/asset-types/', async () => {
    await assetTypeAPI.getAssetTypes({ page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/asset-types/', { page: 1 })
  })

  it('getAssetTypeByRecordcode calls GET /assets/asset-types/{code}/', async () => {
    await assetTypeAPI.getAssetTypeByRecordcode('AT001')
    expect(mockRequest.get).toHaveBeenCalledWith(
      '/assets/asset-types/AT001/',
      undefined,
      true,
      300000,
    )
  })

  it('createAssetType calls POST /assets/asset-types/', async () => {
    await assetTypeAPI.createAssetType({ type_code: 'AT001' } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/asset-types/', { type_code: 'AT001' })
  })

  it('updateAssetType calls PUT /assets/asset-types/{code}/', async () => {
    await assetTypeAPI.updateAssetType({ recordcode: 'AT001', type_name: 'Updated' } as never)
    expect(mockRequest.put).toHaveBeenCalledWith('/assets/asset-types/AT001/', {
      recordcode: 'AT001',
      type_name: 'Updated',
    })
  })

  it('updateAssetType throws when recordcode is missing', () => {
    expect(() => assetTypeAPI.updateAssetType({ type_name: 'Test' } as never)).toThrow(
      'recordcode is required',
    )
  })

  it('deleteAssetType calls DELETE /assets/asset-types/{code}/', async () => {
    await assetTypeAPI.deleteAssetType('AT001')
    expect(mockRequest.delete).toHaveBeenCalledWith('/assets/asset-types/AT001/')
  })

  it('batchDeleteAssetTypes calls POST /assets/asset-types/batch-delete/', async () => {
    await assetTypeAPI.batchDeleteAssetTypes(['AT001', 'AT002'])
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/asset-types/batch-delete/', {
      ids: ['AT001', 'AT002'],
    })
  })

  it('batchCreateAssetTypes calls POST /assets/asset-types/batch-create/', async () => {
    await assetTypeAPI.batchCreateAssetTypes([{ type_code: 'AT001' } as never])
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/asset-types/batch-create/', {
      items: [{ type_code: 'AT001' }],
    })
  })
})
