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

  it('getAuditLogDetail calls GET /audit-logs/{pk}/', async () => {
    await auditLogAPI.getAuditLogDetail(1)
    expect(mockRequest.get).toHaveBeenCalledWith('/audit-logs/1/', undefined, true, 300000)
  })

  it('getAuditLogByLoggingId calls GET /audit-logs/by-logging-id/{id}/', async () => {
    await auditLogAPI.getAuditLogByLoggingId('log-456')
    expect(mockRequest.get).toHaveBeenCalledWith('/audit-logs/by-logging-id/log-456/')
  })

  it('getRecentAuditLogs calls GET /audit-logs/recent/', async () => {
    await auditLogAPI.getRecentAuditLogs(14)
    expect(mockRequest.get).toHaveBeenCalledWith('/audit-logs/recent/', { days: 14 })
  })

  it('getRecentAuditLogs defaults days to 7', async () => {
    await auditLogAPI.getRecentAuditLogs()
    expect(mockRequest.get).toHaveBeenCalledWith('/audit-logs/recent/', { days: 7 })
  })

  it('getAuditLogsByApp calls GET /audit-logs/by-app/{app}/', async () => {
    await auditLogAPI.getAuditLogsByApp('assetmanagement', { page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/audit-logs/by-app/assetmanagement/', { page: 1 })
  })

  it('getAuditLogsByOperator calls GET /audit-logs/by-operator/{jobcode}/', async () => {
    await auditLogAPI.getAuditLogsByOperator('E001', { page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/audit-logs/by-operator/E001/', { page: 1 })
  })
})
