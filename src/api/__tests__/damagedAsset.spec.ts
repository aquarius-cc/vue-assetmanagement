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

import { damagedAssetAPI } from '@/api/damagedAsset'

describe('damagedAssetAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getDamagedAssets calls GET /assets/damaged-assets/', async () => {
    await damagedAssetAPI.getDamagedAssets({ page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/damaged-assets/', { page: 1 })
  })

  it('getDamagedAsset calls GET /assets/damaged-assets/{code}/', async () => {
    await damagedAssetAPI.getDamagedAsset('DA001')
    expect(mockRequest.get).toHaveBeenCalledWith(
      '/assets/damaged-assets/DA001/',
      undefined,
      true,
      300000,
    )
  })

  it('createDamagedAsset calls POST /assets/damaged-assets/', async () => {
    await damagedAssetAPI.createDamagedAsset({ asset_code: 'A001' } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/damaged-assets/', { asset_code: 'A001' })
  })

  it('updateDamagedAsset calls PUT /assets/damaged-assets/{code}/', async () => {
    await damagedAssetAPI.updateDamagedAsset('DA001', { description: 'Updated' })
    expect(mockRequest.put).toHaveBeenCalledWith('/assets/damaged-assets/DA001/', {
      description: 'Updated',
    })
  })

  it('deleteDamagedAsset calls DELETE /assets/damaged-assets/{code}/', async () => {
    await damagedAssetAPI.deleteDamagedAsset('DA001')
    expect(mockRequest.delete).toHaveBeenCalledWith('/assets/damaged-assets/DA001/')
  })

  it('batchDeleteDamagedAssets calls POST /assets/damaged-assets/batch-delete/', async () => {
    await damagedAssetAPI.batchDeleteDamagedAssets(['DA001', 'DA002'])
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/damaged-assets/batch-delete/', {
      ids: ['DA001', 'DA002'],
    })
  })

  it('getDamagedAssetsByAsset calls GET /assets/damaged-assets/by-asset/{code}/', async () => {
    await damagedAssetAPI.getDamagedAssetsByAsset('A001')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/damaged-assets/by-asset/A001/')
  })

  it('approveDamagedAsset calls POST /assets/damaged-assets/{code}/approve/', async () => {
    await damagedAssetAPI.approveDamagedAsset('DA001', { approver_jobcode: 'E001' })
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/damaged-assets/DA001/approve/', {
      approver_jobcode: 'E001',
    })
  })

  it('rejectDamagedAsset calls POST /assets/damaged-assets/{code}/reject/', async () => {
    await damagedAssetAPI.rejectDamagedAsset('DA001', { approver_jobcode: 'E001' })
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/damaged-assets/DA001/reject/', {
      approver_jobcode: 'E001',
    })
  })
})
