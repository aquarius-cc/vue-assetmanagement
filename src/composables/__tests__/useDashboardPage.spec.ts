import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockDashboardStore, mockAuthInfoContainer, mockAuthLogout } = vi.hoisted(() => {
  const mockAuthInfoContainer: { current: unknown } = { current: null }
  return {
    mockDashboardStore: {
      distributeStats: [],
      recycleStats: [],
      wasteStats: [],
      statusOverview: { chartData: [{ name: 'in_store', value: 3 }], totalAssets: 3 },
      recentOutAssets: [],
      recentRecycleAssets: [],
      initDashboardData: vi.fn(async () => {}),
      fetchRecentOutAssets: vi.fn(async () => {}),
      fetchRecentRecycleAssets: vi.fn(async () => {}),
      fetchDashboardOverview: vi.fn(async () => {}),
    },
    mockAuthInfoContainer,
    mockAuthLogout: vi.fn(async () => {}),
  }
})

vi.mock('@/stores/dashboard', () => ({
  useDashboardStore: () => mockDashboardStore,
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ authInfo: mockAuthInfoContainer.current, logout: mockAuthLogout }),
}))

vi.mock('element-plus', () => ({
  ElMessage: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}))

import { useDashboardPage } from '../useDashboardPage'
import { useDashboardUser, LOGIN_START_TIME_KEY } from '../useDashboardUser'
import { ElMessage } from 'element-plus'

const mockElMessageInfo = vi.mocked(ElMessage.info)
const mockElMessageSuccess = vi.mocked(ElMessage.success)
const mockElMessageError = vi.mocked(ElMessage.error)

function stubLocationReload() {
  const reloadSpy = vi.fn()
  Object.defineProperty(window, 'location', {
    value: { reload: reloadSpy },
    writable: true,
  })
  return reloadSpy
}

describe('useDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthInfoContainer.current = null
    vi.mocked(mockDashboardStore.initDashboardData).mockResolvedValue()
    vi.mocked(mockDashboardStore.fetchRecentOutAssets).mockResolvedValue()
    vi.mocked(mockDashboardStore.fetchRecentRecycleAssets).mockResolvedValue()
    vi.mocked(mockDashboardStore.fetchDashboardOverview).mockResolvedValue()
    vi.mocked(mockAuthLogout).mockResolvedValue()
  })

  describe('authInfo', () => {
    it('无用户时返回默认文案', () => {
      const { authInfo } = useDashboardPage()
      expect(authInfo.value).toEqual({
        real_name: '暂无用户',
        auth_name: '暂无管理员用户名',
      })
    })

    it('有用户时映射用户名与激活状态', () => {
      mockAuthInfoContainer.current = { auth_username: 'admin', isactive: true }
      const { authInfo } = useDashboardPage()
      expect(authInfo.value).toEqual({
        real_name: 'admin',
        auth_name: 'admin',
        isactive: true,
      })
    })

    it('用户名为空时回退到默认文案', () => {
      mockAuthInfoContainer.current = { auth_username: '', isactive: false }
      const { authInfo } = useDashboardPage()
      expect(authInfo.value).toEqual({
        real_name: '暂无用户',
        auth_name: '暂无管理员用户名',
        isactive: false,
      })
    })
  })

  describe('统计状态透传', () => {
    it('computed 直接引用 store 数据', () => {
      mockDashboardStore.statusOverview = {
        chartData: [{ name: 'in_use', value: 5 }],
        totalAssets: 42,
      }
      const { statusOverview, distributeStats, recycleStats, wasteStats } = useDashboardPage()

      expect(distributeStats.value).toEqual([])
      expect(recycleStats.value).toEqual([])
      expect(wasteStats.value).toEqual([])
      expect(statusOverview.value).toEqual({
        chartData: [{ name: 'in_use', value: 5 }],
        totalAssets: 42,
      })
    })
  })

  describe('chartOption', () => {
    it('series data 引用 statusOverview.chartData', () => {
      mockDashboardStore.statusOverview = {
        chartData: [{ name: 'in_store', value: 3 }],
        totalAssets: 3,
      }
      const { chartOption } = useDashboardPage()
      const series = chartOption.value.series?.[0] as { data: unknown }
      expect(series.data).toEqual([{ name: 'in_store', value: 3 }])
    })

    it('graphic 中央文本显示总资产数', () => {
      mockDashboardStore.statusOverview = {
        chartData: [{ name: 'in_store', value: 3 }],
        totalAssets: 3,
      }
      const { chartOption } = useDashboardPage()
      const graphic = chartOption.value.graphic as unknown as { style: { text: string } }[]
      expect(graphic[0].style.text).toBe('3')
      expect(graphic[1].style.text).toBe('总资产')
    })
  })

  describe('仪表盘数据加载', () => {
    it('加载成功时重置 loadError', async () => {
      const { retryFetchDashboard, loadError } = useDashboardPage()
      loadError.value = true

      await retryFetchDashboard()

      expect(loadError.value).toBe(false)
      expect(mockDashboardStore.initDashboardData).toHaveBeenCalled()
    })

    it('加载失败时置 loadError', async () => {
      vi.mocked(mockDashboardStore.initDashboardData).mockRejectedValue(new Error('boom'))
      const { retryFetchDashboard, loadError } = useDashboardPage()

      await retryFetchDashboard()

      expect(loadError.value).toBe(true)
    })

    it('retryFetchDashboard 触发一次 initDashboardData', async () => {
      const { retryFetchDashboard } = useDashboardPage()

      await retryFetchDashboard()

      expect(mockDashboardStore.initDashboardData).toHaveBeenCalledTimes(1)
    })
  })

  describe('refreshData', () => {
    it('成功时提示刷新成功', async () => {
      const { refreshData } = useDashboardPage()

      await refreshData()

      expect(mockElMessageInfo).toHaveBeenCalledWith('正在刷新发放数据...')
      expect(mockDashboardStore.fetchRecentOutAssets).toHaveBeenCalledWith(5)
      expect(mockDashboardStore.fetchDashboardOverview).toHaveBeenCalled()
      expect(mockElMessageSuccess).toHaveBeenCalledWith('发放数据刷新成功')
    })

    it('失败时提示刷新失败', async () => {
      vi.mocked(mockDashboardStore.fetchRecentOutAssets).mockRejectedValue(new Error('boom'))
      const { refreshData } = useDashboardPage()

      await refreshData()

      expect(mockElMessageError).toHaveBeenCalledWith('boom')
    })
  })

  describe('refreshRecycleData', () => {
    it('成功时提示回收刷新成功', async () => {
      const { refreshRecycleData } = useDashboardPage()

      await refreshRecycleData()

      expect(mockElMessageInfo).toHaveBeenCalledWith('正在刷新回收数据...')
      expect(mockDashboardStore.fetchRecentRecycleAssets).toHaveBeenCalledWith(5)
      expect(mockElMessageSuccess).toHaveBeenCalledWith('回收数据刷新成功')
    })

    it('失败时提示刷新失败', async () => {
      vi.mocked(mockDashboardStore.fetchRecentRecycleAssets).mockRejectedValue(new Error('boom'))
      const { refreshRecycleData } = useDashboardPage()

      await refreshRecycleData()

      expect(mockElMessageError).toHaveBeenCalledWith('boom')
    })
  })

  describe('logout', () => {
    it('调用 authStore.logout 后刷新页面', async () => {
      const reloadSpy = stubLocationReload()
      const { logout } = useDashboardPage()

      await logout()

      expect(mockAuthLogout).toHaveBeenCalled()
      expect(reloadSpy).toHaveBeenCalled()
    })

    it('logout 异常时仍刷新页面', async () => {
      vi.mocked(mockAuthLogout).mockRejectedValue(new Error('boom'))
      const reloadSpy = stubLocationReload()
      const { logout } = useDashboardPage()

      await logout()

      expect(reloadSpy).toHaveBeenCalled()
    })

    it('防重入：进行中再次调用不重复触发', async () => {
      const reloadSpy = stubLocationReload()
      vi.mocked(mockAuthLogout).mockImplementation(() => new Promise(() => {}))
      const { logout } = useDashboardPage()

      const first = logout()
      void first
      const second = logout()
      await second

      expect(mockAuthLogout).toHaveBeenCalledTimes(1)
      expect(reloadSpy).not.toHaveBeenCalled()
    })
  })
})

// ======================== useDashboardUser（OP-07 并入锚，Dashboard 用户会话共用源） ========================
describe('useDashboardUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthInfoContainer.current = null
    vi.mocked(mockAuthLogout).mockResolvedValue()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('authInfo：无用户默认文案 / 有用户映射 / 用户名空回退', () => {
    mockAuthInfoContainer.current = null
    expect(useDashboardUser().authInfo.value).toEqual({
      real_name: '暂无用户',
      auth_name: '暂无管理员用户名',
    })
    mockAuthInfoContainer.current = { auth_username: 'root', isactive: true }
    expect(useDashboardUser().authInfo.value).toEqual({
      real_name: 'root',
      auth_name: 'root',
      isactive: true,
    })
    mockAuthInfoContainer.current = { auth_username: '', isactive: false }
    expect(useDashboardUser().authInfo.value).toEqual({
      real_name: '暂无用户',
      auth_name: '暂无管理员用户名',
      isactive: false,
    })
  })

  it('logout 清理 LOGIN_START_TIME_KEY 后经 store 登出并 reload', async () => {
    stubLocationReload()
    const removeSpy = vi.spyOn(sessionStorage, 'removeItem')
    await useDashboardUser().logout()
    expect(removeSpy).toHaveBeenCalledWith(LOGIN_START_TIME_KEY)
    expect(mockAuthLogout).toHaveBeenCalledTimes(1)
  })

  it('logout 失败：logError 落痕且仍 reload', async () => {
    stubLocationReload()
    mockAuthInfoContainer.current = null
    const removeSpy = vi.spyOn(sessionStorage, 'removeItem').mockImplementation(() => {})
    sessionStorage.setItem(LOGIN_START_TIME_KEY, 't')
    vi.mocked(mockAuthLogout).mockRejectedValueOnce(new Error('net'))
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await useDashboardUser().logout()

    expect(removeSpy).toHaveBeenCalledWith(LOGIN_START_TIME_KEY)
    expect(logSpy).toHaveBeenCalled()
    logSpy.mockRestore()
  })
})
