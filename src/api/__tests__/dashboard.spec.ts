import { describe, it, expect, vi } from 'vitest'

vi.mock('@/api/index', () => ({
  request: { get: vi.fn() },
  unwrapResponse: (p: Promise<unknown>) => p,
}))

import { request } from '@/api/index'
import { dashboardAPI } from '../dashboard'

const mockGet = vi.mocked(request.get)

describe('dashboardAPI', () => {
  it('getDashboardOverview 请求概览端点', async () => {
    mockGet.mockResolvedValue({ code: 0, data: { total: 1 }, message: 'ok' })

    await dashboardAPI.getDashboardOverview()

    expect(mockGet).toHaveBeenCalledWith<[string]>('/dashboard/overview/')
  })

  it('getRecentOutAssets 无 limit 时默认 10', async () => {
    mockGet.mockResolvedValue({ code: 0, data: [{ id: 1 }], message: 'ok' })

    await dashboardAPI.getRecentOutAssets()

    expect(mockGet).toHaveBeenCalledWith('/dashboard/recent_out_assets/', { limit: 10 })
  })

  it('getRecentOutAssets 传 limit 时使用该值', async () => {
    mockGet.mockResolvedValue({ code: 0, data: [{ id: 1 }], message: 'ok' })

    await dashboardAPI.getRecentOutAssets(5)

    expect(mockGet).toHaveBeenCalledWith('/dashboard/recent_out_assets/', { limit: 5 })
  })

  it('getRecentRecycleAssets 无 limit 时默认 10', async () => {
    mockGet.mockResolvedValue({ code: 0, data: [{ id: 1 }], message: 'ok' })

    await dashboardAPI.getRecentRecycleAssets()

    expect(mockGet).toHaveBeenCalledWith('/dashboard/recent_recycle_assets/', { limit: 10 })
  })

  it('getAssetTrend 请求趋势端点', async () => {
    mockGet.mockResolvedValue({ code: 0, data: [{ date: '2026-01-01' }], message: 'ok' })

    await dashboardAPI.getAssetTrend({ start_date: '2026-01-01' })

    expect(mockGet).toHaveBeenCalledWith('/dashboard/trend/', { start_date: '2026-01-01' })
  })

  it('getDepartmentDistribution 请求分布端点', async () => {
    mockGet.mockResolvedValue({
      code: 0,
      data: [{ department_name: 'IT', asset_count: 1, percentage: 1 }],
      message: 'ok',
    })

    await dashboardAPI.getDepartmentDistribution()

    expect(mockGet).toHaveBeenCalledWith('/dashboard/department_distribution/')
  })

  it('getAssetTypeDistribution 请求类型分布端点', async () => {
    mockGet.mockResolvedValue({
      code: 0,
      data: [{ type_name: 'pc', count: 1, percentage: 1 }],
      message: 'ok',
    })

    await dashboardAPI.getAssetTypeDistribution()

    expect(mockGet).toHaveBeenCalledWith('/dashboard/type_distribution/')
  })

  it('getExpiringAssets 无 days 时默认 30', async () => {
    mockGet.mockResolvedValue({ code: 0, data: [{ asset_id: 1 }], message: 'ok' })

    await dashboardAPI.getExpiringAssets()

    expect(mockGet).toHaveBeenCalledWith('/dashboard/expiring_assets/', { days: 30 })
  })

  it('getMaintenanceReminders 请求提醒端点', async () => {
    mockGet.mockResolvedValue({ code: 0, data: [{ asset_id: 1 }], message: 'ok' })

    await dashboardAPI.getMaintenanceReminders()

    expect(mockGet).toHaveBeenCalledWith('/dashboard/maintenance_reminders/')
  })

  describe('PROD 环境下未实现端点直接返回空', () => {
    it('getAssetTrend 返回空数组', async () => {
      vi.stubEnv('PROD', 'true')

      await expect(dashboardAPI.getAssetTrend()).resolves.toEqual([])

      vi.unstubAllEnvs()
    })

    it('getDepartmentDistribution 返回空数组', async () => {
      vi.stubEnv('PROD', 'true')

      await expect(dashboardAPI.getDepartmentDistribution()).resolves.toEqual([])

      vi.unstubAllEnvs()
    })

    it('getAssetTypeDistribution 返回空数组', async () => {
      vi.stubEnv('PROD', 'true')

      await expect(dashboardAPI.getAssetTypeDistribution()).resolves.toEqual([])

      vi.unstubAllEnvs()
    })

    it('getExpiringAssets 返回空数组', async () => {
      vi.stubEnv('PROD', 'true')

      await expect(dashboardAPI.getExpiringAssets()).resolves.toEqual([])

      vi.unstubAllEnvs()
    })

    it('getMaintenanceReminders 返回空数组', async () => {
      vi.stubEnv('PROD', 'true')

      await expect(dashboardAPI.getMaintenanceReminders()).resolves.toEqual([])

      vi.unstubAllEnvs()
    })
  })
})
