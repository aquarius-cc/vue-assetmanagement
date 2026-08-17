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

import { storageAPI } from '@/api/storage'

describe('storageAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getStorages calls GET /assets/storages/', async () => {
    await storageAPI.getStorages({ page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/storages/', { page: 1 })
  })

  it('getStorageByRecordcode calls GET /assets/storages/{code}/', async () => {
    await storageAPI.getStorageByRecordcode('ST001')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/storages/ST001/', undefined, true, 300000)
  })

  it('createStorage calls POST /assets/storages/', async () => {
    await storageAPI.createStorage({ storage_name: 'New' } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/storages/', { storage_name: 'New' })
  })

  it('updateStorage calls PUT /assets/storages/{code}/', async () => {
    await storageAPI.updateStorage({ recordcode: 'ST001', storage_name: 'Updated' })
    expect(mockRequest.put).toHaveBeenCalledWith('/assets/storages/ST001/', {
      recordcode: 'ST001',
      storage_name: 'Updated',
    })
  })

  it('updateStorage throws when recordcode is missing', () => {
    expect(() => storageAPI.updateStorage({ storage_name: 'Test' })).toThrow(
      'recordcode is required',
    )
  })

  it('deleteStorage calls DELETE /assets/storages/{code}/', async () => {
    await storageAPI.deleteStorage('ST001')
    expect(mockRequest.delete).toHaveBeenCalledWith('/assets/storages/ST001/')
  })

  it('batchDeleteStorages calls POST /assets/storages/batch-delete/', async () => {
    await storageAPI.batchDeleteStorages(['ST001', 'ST002'])
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/storages/batch-delete/', {
      ids: ['ST001', 'ST002'],
    })
  })

  it('batchCreateStorages calls POST /assets/storages/batch-create/', async () => {
    await storageAPI.batchCreateStorages([{ storage_name: 'X' } as never])
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/storages/batch-create/', {
      items: [{ storage_name: 'X' }],
    })
  })
})
