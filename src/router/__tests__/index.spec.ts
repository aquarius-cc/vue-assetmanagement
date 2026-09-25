import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * 【Q-05】本文件 mock 原以 `__getCapturedConfig` 导出搭配 vi.resetModules()，reset 后
 * 可能返回不含该导出的模块实例（竞态），表现为 `__getCapturedConfig is not a function`。
 * 对策：全部 mock hoist 到不受 resetModules 影响的持有器，loadRouter 不再 import 被 mock 模块。
 * 注：本文件历史超时抖动并非 5s 阈值过小所致——隔离峰值 183ms，全量默认并行（15 workers）
 * 下多文件（60s/45s/74s）同时超时；`--maxWorkers=4` 可稳定全绿。故不放宽 testTimeout。
 */
const { mockCapturedConfig, mockCreateRouter, mockCreateWebHistory, mockSetupAuthGuard } =
  vi.hoisted(() => {
    const capturedConfig: { current: any } = { current: null }
    return {
      mockCapturedConfig: capturedConfig,
      mockCreateRouter: vi.fn((config: any) => {
        capturedConfig.current = config
        return {
          beforeEach: vi.fn(),
          afterEach: vi.fn(),
          push: vi.fn(),
          replace: vi.fn(),
          currentRoute: { value: { path: '/' } },
          routes: config.routes,
        }
      }),
      mockCreateWebHistory: vi.fn(() => ({})),
      mockSetupAuthGuard: vi.fn(),
    }
  })

vi.mock('vue-router', () => ({
  createRouter: mockCreateRouter,
  createWebHistory: mockCreateWebHistory,
}))

vi.mock('@/router/guards', () => ({
  setupAuthGuard: mockSetupAuthGuard,
}))

vi.mock('@/views/LogIn.vue', () => ({ default: { template: '<div>Login</div>' } }))

describe('Router Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockCapturedConfig.current = null
  })

  async function loadRouter() {
    const routerModule = await import('../index')
    return {
      router: routerModule.default,
      createRouter: mockCreateRouter,
      createWebHistory: mockCreateWebHistory,
      capturedConfig: mockCapturedConfig.current,
    }
  }

  it('should export a router instance', async () => {
    const { router } = await loadRouter()
    expect(router).toBeDefined()
  })

  it('should call createRouter', async () => {
    const { createRouter } = await loadRouter()
    expect(createRouter).toHaveBeenCalledTimes(1)
  })

  it('should call createWebHistory', async () => {
    const { createWebHistory } = await loadRouter()
    expect(createWebHistory).toHaveBeenCalled()
  })

  it('should call setupAuthGuard with the router', async () => {
    await loadRouter()
    expect(mockSetupAuthGuard).toHaveBeenCalledTimes(1)
  })

  it('should have root route redirect to /login', async () => {
    const { capturedConfig } = await loadRouter()
    const rootRoute = capturedConfig.routes.find((r: any) => r.path === '/')
    expect(rootRoute).toBeDefined()
    expect(rootRoute.redirect).toBe('/login')
  })

  it('should have /login route with requiresAuth: false', async () => {
    const { capturedConfig } = await loadRouter()
    const loginRoute = capturedConfig.routes.find((r: any) => r.path === '/login')
    expect(loginRoute).toBeDefined()
    expect(loginRoute.meta.requiresAuth).toBe(false)
    expect(loginRoute.meta.title).toBe('用户登录')
  })

  it('should have /main route with requiresAuth: true', async () => {
    const { capturedConfig } = await loadRouter()
    const mainRoute = capturedConfig.routes.find((r: any) => r.path === '/main')
    expect(mainRoute).toBeDefined()
    expect(mainRoute.meta.requiresAuth).toBe(true)
  })

  it('should have child routes under /main', async () => {
    const { capturedConfig } = await loadRouter()
    const mainRoute = capturedConfig.routes.find((r: any) => r.path === '/main')
    expect(mainRoute.children).toBeDefined()
    expect(mainRoute.children.length).toBeGreaterThan(0)
  })

  it('should have assetdetails as a child of /main', async () => {
    const { capturedConfig } = await loadRouter()
    const mainRoute = capturedConfig.routes.find((r: any) => r.path === '/main')
    const assetRoute = mainRoute.children.find((r: any) => r.path === 'assetdetails')
    expect(assetRoute).toBeDefined()
    expect(assetRoute.meta.title).toBe('资产管理')
  })

  it('should have scan route with requiresAuth: false', async () => {
    const { capturedConfig } = await loadRouter()
    const scanRoute = capturedConfig.routes.find((r: any) => r.path === '/scan/:recordcode')
    expect(scanRoute).toBeDefined()
    expect(scanRoute.meta.requiresAuth).toBe(false)
  })
})
