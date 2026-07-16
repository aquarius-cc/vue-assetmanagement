import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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

import { dashboardAPI } from '@/api/dashboard'

describe('dashboardAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('PROD', false)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('getDashboardOverview calls GET /dashboard/overview/', async () => {
    await dashboardAPI.getDashboardOverview()
    expect(mockRequest.get).toHaveBeenCalledWith('/dashboard/overview/')
  })

  it('getRecentOutAssets calls GET /dashboard/recent_out_assets/', async () => {
    await dashboardAPI.getRecentOutAssets(5)
    expect(mockRequest.get).toHaveBeenCalledWith('/dashboard/recent_out_assets/', { limit: 5 })
  })

  it('getRecentOutAssets defaults limit to 10', async () => {
    await dashboardAPI.getRecentOutAssets()
    expect(mockRequest.get).toHaveBeenCalledWith('/dashboard/recent_out_assets/', { limit: 10 })
  })

  it('getRecentRecycleAssets calls GET /dashboard/recent_recycle_assets/', async () => {
    await dashboardAPI.getRecentRecycleAssets(3)
    expect(mockRequest.get).toHaveBeenCalledWith('/dashboard/recent_recycle_assets/', { limit: 3 })
  })

  it('getRecentRecycleAssets defaults limit to 10', async () => {
    await dashboardAPI.getRecentRecycleAssets()
    expect(mockRequest.get).toHaveBeenCalledWith('/dashboard/recent_recycle_assets/', { limit: 10 })
  })

  it('getAssetTrend calls GET /dashboard/trend/', async () => {
    await dashboardAPI.getAssetTrend({ period: 'daily' })
    expect(mockRequest.get).toHaveBeenCalledWith('/dashboard/trend/', { period: 'daily' })
  })

  it('getDepartmentDistribution calls GET /dashboard/department_distribution/', async () => {
    await dashboardAPI.getDepartmentDistribution()
    expect(mockRequest.get).toHaveBeenCalledWith('/dashboard/department_distribution/')
  })

  it('getAssetTypeDistribution calls GET /dashboard/type_distribution/', async () => {
    await dashboardAPI.getAssetTypeDistribution()
    expect(mockRequest.get).toHaveBeenCalledWith('/dashboard/type_distribution/')
  })

  it('getExpiringAssets calls GET /dashboard/expiring_assets/', async () => {
    await dashboardAPI.getExpiringAssets(15)
    expect(mockRequest.get).toHaveBeenCalledWith('/dashboard/expiring_assets/', { days: 15 })
  })

  it('getExpiringAssets defaults days to 30', async () => {
    await dashboardAPI.getExpiringAssets()
    expect(mockRequest.get).toHaveBeenCalledWith('/dashboard/expiring_assets/', { days: 30 })
  })

  it('getMaintenanceReminders calls GET /dashboard/maintenance_reminders/', async () => {
    await dashboardAPI.getMaintenanceReminders()
    expect(mockRequest.get).toHaveBeenCalledWith('/dashboard/maintenance_reminders/')
  })
})
