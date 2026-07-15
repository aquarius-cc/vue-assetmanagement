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

import { operationLogAPI } from '@/api/operationLog'

describe('operationLogAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getOperationLogs calls GET /assets/operation-logs/', async () => {
    await operationLogAPI.getOperationLogs({ page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/operation-logs/', { page: 1 })
  })

  it('getOperationLogDetail calls GET /assets/operation-logs/{pk}/', async () => {
    await operationLogAPI.getOperationLogDetail(1)
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/operation-logs/1/', undefined, true, 300000)
  })

  it('getOperationLogByLoggingId calls GET /assets/operation-logs/by-logging-id/{id}/', async () => {
    await operationLogAPI.getOperationLogByLoggingId('log-123')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/operation-logs/by-logging-id/log-123/')
  })

  it('getRecentOperationLogs calls GET /assets/operation-logs/recent/', async () => {
    await operationLogAPI.getRecentOperationLogs(14)
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/operation-logs/recent/', { days: 14 })
  })

  it('getRecentOperationLogs defaults days to 7', async () => {
    await operationLogAPI.getRecentOperationLogs()
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/operation-logs/recent/', { days: 7 })
  })

  it('getUserOperationLogs calls GET /assets/operation-logs/user/{jobcode}/', async () => {
    await operationLogAPI.getUserOperationLogs('E001', { page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/operation-logs/user/E001/', { page: 1 })
  })
})
