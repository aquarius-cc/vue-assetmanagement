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

import { scanAPI } from '@/api/scan'

const SAMPLE: Record<string, unknown> = {
  asset_code: 'A001',
  asset_name: '测试笔记本',
  asset_specification: 'i7/16G',
  asset_brand: 'DELL',
  asset_current_status: 'in_use',
  physical_grade: 'A',
}

describe('scanAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchPublicScanAsset calls GET /assets/public/scan/{recordcode}/', async () => {
    mockRequest.get.mockResolvedValue({ code: 0, data: SAMPLE, message: '' })

    await scanAPI.fetchPublicScanAsset('RC001')

    expect(mockRequest.get).toHaveBeenCalledWith('/assets/public/scan/RC001/')
  })

  it('fetchPublicScanAsset returns unwrapped data', async () => {
    mockRequest.get.mockResolvedValue({ code: 0, data: SAMPLE, message: '' })

    const result = await scanAPI.fetchPublicScanAsset('RC001')

    expect(result).toEqual(SAMPLE)
  })

  it('fetchPublicScanAsset throws when business code is not 0', async () => {
    mockRequest.get.mockResolvedValue({ code: 40001, data: null, message: '资产不存在' })

    await expect(scanAPI.fetchPublicScanAsset('RC404')).rejects.toThrow('资产不存在')
  })
})
