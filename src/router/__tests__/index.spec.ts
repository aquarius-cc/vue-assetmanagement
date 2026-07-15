import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSetupAuthGuard = vi.fn()

vi.mock('vue-router', () => {
  let capturedConfig: any = null
  return {
    createRouter: vi.fn((config: any) => {
      capturedConfig = config
      return {
        beforeEach: vi.fn(),
        afterEach: vi.fn(),
        push: vi.fn(),
        replace: vi.fn(),
        currentRoute: { value: { path: '/' } },
        routes: config.routes,
      }
    }),
    createWebHistory: vi.fn(() => ({})),
    __getCapturedConfig: () => capturedConfig,
  }
})

vi.mock('@/router/guards', () => ({
  setupAuthGuard: mockSetupAuthGuard,
}))

vi.mock('@/views/LogIn.vue', () => ({ default: { template: '<div>Login</div>' } }))

describe('Router Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  async function loadRouter() {
    const routerModule = await import('../index')
    const { createRouter, createWebHistory } = await import('vue-router')
    const vueRouter = await import('vue-router') as any
    return {
      router: routerModule.default,
      createRouter: vi.mocked(createRouter),
      createWebHistory: vi.mocked(createWebHistory),
      capturedConfig: vueRouter.__getCapturedConfig(),
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
