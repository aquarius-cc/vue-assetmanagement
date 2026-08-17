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

import { auditLogAPI } from '@/api/auditLog'

describe('auditLogAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getAuditLogs calls GET /audit-logs/', async () => {
    await auditLogAPI.getAuditLogs({ page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/audit-logs/', { page: 1 })
  })

  it('getAuditLogByLoggingId calls GET /audit-logs/by-logging-id/{id}/', async () => {
    await auditLogAPI.getAuditLogByLoggingId('log-456')
    expect(mockRequest.get).toHaveBeenCalledWith('/audit-logs/by-logging-id/log-456/')
  })
})
