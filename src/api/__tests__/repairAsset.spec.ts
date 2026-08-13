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

import { repairAssetAPI } from '@/api/repairAsset'

describe('repairAssetAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getRepairAssets calls GET /assets/repair-assets/', async () => {
    await repairAssetAPI.getRepairAssets({ page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/repair-assets/', { page: 1 })
  })

  it('getRepairAssetByCode calls GET /assets/repair-assets/{code}/', async () => {
    await repairAssetAPI.getRepairAssetByCode('RP001')
    expect(mockRequest.get).toHaveBeenCalledWith(
      '/assets/repair-assets/RP001/',
      undefined,
      true,
      300000,
    )
  })

  it('createRepairAsset calls POST /assets/repair-assets/', async () => {
    await repairAssetAPI.createRepairAsset({ asset_code: 'A001' } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/repair-assets/', { asset_code: 'A001' })
  })

  it('updateRepairAsset calls PUT /assets/repair-assets/{code}/', async () => {
    await repairAssetAPI.updateRepairAsset({ recordcode: 'RP001', description: 'Updated' } as never)
    expect(mockRequest.put).toHaveBeenCalledWith('/assets/repair-assets/RP001/', {
      recordcode: 'RP001',
      description: 'Updated',
    })
  })

  it('updateRepairAsset throws when recordcode is missing', () => {
    expect(() => repairAssetAPI.updateRepairAsset({ id: undefined } as never)).toThrow(
      'recordcode is required',
    )
  })

  it('deleteRepairAsset calls DELETE /assets/repair-assets/{code}/', async () => {
    await repairAssetAPI.deleteRepairAsset('RP001')
    expect(mockRequest.delete).toHaveBeenCalledWith('/assets/repair-assets/RP001/')
  })

  it('batchDeleteRepairAssets calls POST /assets/repair-assets/batch-delete/', async () => {
    await repairAssetAPI.batchDeleteRepairAssets(['RP001', 'RP002'])
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/repair-assets/batch-delete/', {
      ids: ['RP001', 'RP002'],
    })
  })

  it('getRepairAssetsByAsset calls GET /assets/repair-assets/by-asset/{code}/', async () => {
    await repairAssetAPI.getRepairAssetsByAsset('A001')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/repair-assets/by-asset/A001/')
  })

  it('repairAsset calls POST /assets/assets/{recordcode}/repair/', async () => {
    await repairAssetAPI.repairAsset('RC001', {
      repair_asset_number: 1,
      repair_date: '2024-01-15',
      repair_reason: 'screen cracked',
      repair_description: 'needs screen replacement',
    })
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/assets/RC001/repair/', {
      repair_asset_number: 1,
      repair_date: '2024-01-15',
      repair_reason: 'screen cracked',
      repair_description: 'needs screen replacement',
    })
  })

  it('repairDone calls POST /assets/assets/{recordcode}/repair-done/', async () => {
    await repairAssetAPI.repairDone('RC001', {
      actual_return_date: '2024-01-20',
      physical_grade_after: 'good',
    })
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/assets/RC001/repair-done/', {
      actual_return_date: '2024-01-20',
      physical_grade_after: 'good',
    })
  })

  it('repairFailed calls POST /assets/assets/{recordcode}/repair-failed/', async () => {
    await repairAssetAPI.repairFailed('RC001')
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/assets/RC001/repair-failed/')
  })
})
