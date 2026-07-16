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

import { harddiskSnAPI } from '@/api/harddiskSn'

describe('harddiskSnAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getHardDiskSNs calls GET /assets/harddisk-sn/', async () => {
    await harddiskSnAPI.getHardDiskSNs({ page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/harddisk-sn/', { page: 1 })
  })

  it('getHardDiskSN calls GET /assets/harddisk-sn/{code}/', async () => {
    await harddiskSnAPI.getHardDiskSN('HS001')
    expect(mockRequest.get).toHaveBeenCalledWith(
      '/assets/harddisk-sn/HS001/',
      undefined,
      true,
      300000,
    )
  })

  it('getHardDiskSNByCode calls POST /assets/harddisk-sn/search_by_serial_number/', async () => {
    await harddiskSnAPI.getHardDiskSNByCode('SN12345')
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/harddisk-sn/search_by_serial_number/', {
      harddisk_sn_code: 'SN12345',
    })
  })

  it('createHardDiskSN calls POST /assets/harddisk-sn/', async () => {
    await harddiskSnAPI.createHardDiskSN({ harddisk_sn: 'SN001' } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/harddisk-sn/', { harddisk_sn: 'SN001' })
  })

  it('updateHardDiskSN calls PUT /assets/harddisk-sn/{code}/', async () => {
    await harddiskSnAPI.updateHardDiskSN('HS001', { harddisk_sn: 'Updated' } as never)
    expect(mockRequest.put).toHaveBeenCalledWith('/assets/harddisk-sn/HS001/', {
      harddisk_sn: 'Updated',
    })
  })

  it('deleteHardDiskSN calls DELETE /assets/harddisk-sn/{code}/', async () => {
    await harddiskSnAPI.deleteHardDiskSN('HS001')
    expect(mockRequest.delete).toHaveBeenCalledWith('/assets/harddisk-sn/HS001/')
  })

  it('deleteHardDiskSNByCode calls DELETE /assets/harddisk-sn/{code}/', async () => {
    await harddiskSnAPI.deleteHardDiskSNByCode('SN001')
    expect(mockRequest.delete).toHaveBeenCalledWith('/assets/harddisk-sn/SN001/')
  })

  it('saveHardDiskSNBatch calls POST /assets/harddisk-sn/batch/', async () => {
    await harddiskSnAPI.saveHardDiskSNBatch({ asset_code: 'A001', disks: [] } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/harddisk-sn/batch/', {
      asset_code: 'A001',
      disks: [],
    })
  })

  it('getHardDiskSNsByAsset calls GET /assets/harddisk-sn/by-asset/{code}/', async () => {
    await harddiskSnAPI.getHardDiskSNsByAsset('A001')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/harddisk-sn/by-asset/A001/')
  })
})
