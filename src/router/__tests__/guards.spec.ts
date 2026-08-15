// TECHNICAL_DEBT: >500 lines（存量文件，2026-07-07 基线前已超限；本次修改新增 <50 行，暂不拆分）
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDecryptedToken } from '@/utils/tokenCrypto'
import { ElMessage } from 'element-plus'
import { setupAuthGuard } from '../guards'

vi.mock('@/utils/tokenCrypto', () => ({
  getDecryptedToken: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
}))

const mockInitAuthState = vi.fn()
const mockSilentLogout = vi.fn()
const mockGetAuthInfo = vi.fn().mockResolvedValue(undefined)
const mockLoadMyPermissions = vi.fn().mockResolvedValue(undefined)
const mockInitAppState = vi.fn()
const mockSetLoading = vi.fn()
const mockSetPageTitle = vi.fn()
const mockSetBreadcrumbs = vi.fn()

const mockAuthStore = {
  authInfo: null as any,
  isLoggedIn: false,
  access_token: null as string | null,
  userRole: 'regular_user',
  isSuperuser: false,
  authInitialized: true,
  permissions: [] as string[],
  permissionsLoaded: false, // N1: 权限加载完成标记
  initAuthState: mockInitAuthState,
  silentLogout: mockSilentLogout,
  getAuthInfo: mockGetAuthInfo,
  loadMyPermissions: mockLoadMyPermissions,
}

const mockAppStore = {
  setLoading: mockSetLoading,
  setPageTitle: mockSetPageTitle,
  setBreadcrumbs: mockSetBreadcrumbs,
  initAppState: mockInitAppState,
}

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
}))

vi.mock('@/stores/app', () => ({
  useAppStore: vi.fn(() => mockAppStore),
}))

describe('Router Guards', () => {
  let mockRouter: any
  let beforeEachCallback: any
  let afterEachCallback: any

  // 构造模拟 JWT token（header.payload.signature 格式）

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthStore.authInfo = null
    mockAuthStore.isLoggedIn = false
    mockAuthStore.access_token = null
    mockAuthStore.userRole = 'regular_user'
    mockAuthStore.isSuperuser = false
    mockAuthStore.authInitialized = true
    mockAuthStore.permissions = []
    mockAuthStore.permissionsLoaded = false

    mockRouter = {
      beforeEach: vi.fn((cb: any) => {
        beforeEachCallback = cb
      }),
      afterEach: vi.fn((cb: any) => {
        afterEachCallback = cb
      }),
    }
  })

  function setupAndCapture() {
    setupAuthGuard(mockRouter)
  }

  describe('beforeEach guard', () => {
    it('should redirect to /login when user is not authenticated', async () => {
      ;(getDecryptedToken as any).mockReturnValue(null)
      setupAndCapture()

      const to = { path: '/main', meta: {} }
      const from = { path: '/' }
      const result = await beforeEachCallback(to, from)

      expect(result).toBe('/login')
    })

    it('should allow access to whitelist pages', async () => {
      ;(getDecryptedToken as any).mockReturnValue(null)
      setupAndCapture()

      const to = { path: '/login', meta: {} }
      const from = { path: '/' }
      const result = await beforeEachCallback(to, from)

      expect(result).toBe(true)
    })

    it('should redirect authenticated user from /login to /main', async () => {
      ;(getDecryptedToken as any).mockReturnValue('valid-token')
      mockAuthStore.isLoggedIn = true
      mockAuthStore.access_token = 'valid-token'

      setupAndCapture()

      const to = { path: '/login', meta: {} }
      const from = { path: '/' }
      const result = await beforeEachCallback(to, from)

      expect(result).toBe('/main')
    })

    it('should allow access to pages with requiresAuth: false', async () => {
      ;(getDecryptedToken as any).mockReturnValue(null)
      setupAndCapture()

      const to = { path: '/scan', meta: { requiresAuth: false } }
      const from = { path: '/' }
      const result = await beforeEachCallback(to, from)

      expect(result).toBe(true)
    })

    it('should deny admin routes for regular users', async () => {
      ;(getDecryptedToken as any).mockReturnValue('valid-token')
      mockAuthStore.isLoggedIn = true
      mockAuthStore.access_token = 'valid-token'
      mockAuthStore.userRole = 'regular_user'
      mockAuthStore.authInfo = { auth_id: 1, auth_username: 'test' }

      setupAndCapture()

      const to = { path: '/main/userdetails', meta: {} }
      const from = { path: '/' }
      const result = await beforeEachCallback(to, from)

      expect(result).toBe('/main')
      expect(ElMessage.error).toHaveBeenCalledWith('您没有权限访问该页面')
    })

    it('should allow admin access to admin routes', async () => {
      ;(getDecryptedToken as any).mockReturnValue('valid-token')
      mockAuthStore.isLoggedIn = true
      mockAuthStore.access_token = 'valid-token'
      mockAuthStore.userRole = 'system_admin'
      mockAuthStore.authInfo = { auth_id: 1, auth_username: 'admin' }

      setupAndCapture()

      const to = { path: '/main/userdetails', meta: {} }
      const from = { path: '/' }
      const result = await beforeEachCallback(to, from)

      expect(result).toBe(true)
    })

    it('should init auth state when authInitialized is false', async () => {
      ;(getDecryptedToken as any).mockReturnValue('valid-token')
      mockAuthStore.isLoggedIn = false
      mockAuthStore.authInfo = null
      mockAuthStore.authInitialized = false

      setupAndCapture()

      const to = { path: '/login', meta: {} }
      const from = { path: '/' }
      await beforeEachCallback(to, from)

      expect(mockInitAuthState).toHaveBeenCalled()
    })

    it('should silentLogout on token verification failure', async () => {
      ;(getDecryptedToken as any).mockReturnValue('valid-token')
      mockAuthStore.isLoggedIn = true
      mockAuthStore.access_token = 'valid-token'
      mockAuthStore.authInfo = null
      mockGetAuthInfo.mockRejectedValueOnce(new Error('Token expired'))

      setupAndCapture()

      const to = { path: '/main', meta: {} }
      const from = { path: '/' }
      const result = await beforeEachCallback(to, from)

      expect(result).toBe('/login')
      expect(mockSilentLogout).toHaveBeenCalled()
    })
  })

  describe('permissions loading (N1)', () => {
    function loginAsValidUser() {
      ;(getDecryptedToken as any).mockReturnValue('valid-token')
      mockAuthStore.isLoggedIn = true
      mockAuthStore.access_token = 'valid-token'
      mockAuthStore.authInfo = { auth_id: 1, auth_username: 'test' }
      mockAuthStore.userRole = 'regular_user'
    }

    it('should load permissions when permissionsLoaded is false', async () => {
      loginAsValidUser()
      mockAuthStore.permissionsLoaded = false
      setupAndCapture()

      const result = await beforeEachCallback({ path: '/main', meta: {} }, { path: '/' })

      expect(result).toBe(true)
      expect(mockLoadMyPermissions).toHaveBeenCalledTimes(1)
    })

    it('should NOT reload permissions when permissionsLoaded is true even if permissions are empty', async () => {
      // 回归护栏：regular_user 无角色时后端返回 []，但已加载完成，
      // 守卫不得把空权限误判为"未加载"而每次导航重复请求
      loginAsValidUser()
      mockAuthStore.permissionsLoaded = true
      mockAuthStore.permissions = []
      setupAndCapture()

      const result = await beforeEachCallback({ path: '/main', meta: {} }, { path: '/' })

      expect(result).toBe(true)
      expect(mockLoadMyPermissions).not.toHaveBeenCalled()
    })

    it('should NOT reload permissions when already loaded with non-empty permissions', async () => {
      loginAsValidUser()
      mockAuthStore.permissionsLoaded = true
      mockAuthStore.permissions = ['asset:read']
      setupAndCapture()

      const result = await beforeEachCallback({ path: '/main', meta: {} }, { path: '/' })

      expect(result).toBe(true)
      expect(mockLoadMyPermissions).not.toHaveBeenCalled()
    })
  })

  describe('afterEach hook', () => {
    it('should set page title from route meta', () => {
      setupAndCapture()
      afterEachCallback({ path: '/main', meta: { title: '首页' } })
      expect(mockSetPageTitle).toHaveBeenCalledWith('首页')
    })

    it('should generate breadcrumbs', () => {
      setupAndCapture()
      afterEachCallback({ path: '/main/assetdetails', meta: {} })
      expect(mockSetBreadcrumbs).toHaveBeenCalled()
    })

    it('should disable loading after navigation', () => {
      setupAndCapture()
      afterEachCallback({ path: '/main', meta: {} })
      expect(mockSetLoading).toHaveBeenCalledWith(false)
    })
  })

  describe('roleWhitelist — system_admin only routes', () => {
    it.each([
      '/main/assettypedetails',
      '/main/storagedetails',
      '/main/contractdetails',
      '/main/userdetails',
      '/main/departmentdetails',
      '/main/system',
    ])('should allow system_admin on %s', async (path) => {
      ;(getDecryptedToken as any).mockReturnValue('valid-token')
      mockAuthStore.isLoggedIn = true
      mockAuthStore.access_token = 'valid-token'
      mockAuthStore.userRole = 'system_admin'
      mockAuthStore.authInfo = { auth_id: 1, auth_username: 'admin' }

      setupAndCapture()

      const result = await beforeEachCallback({ path, meta: {} }, { path: '/' })
      expect(result).toBe(true)
    })

    it.each(['/main/assettypedetails', '/main/userdetails', '/main/departmentdetails'])(
      'should deny regular_user on %s',
      async (path) => {
        ;(getDecryptedToken as any).mockReturnValue('valid-token')
        mockAuthStore.isLoggedIn = true
        mockAuthStore.access_token = 'valid-token'
        mockAuthStore.userRole = 'regular_user'
        mockAuthStore.authInfo = { auth_id: 1, auth_username: 'test' }

        setupAndCapture()

        const result = await beforeEachCallback({ path, meta: {} }, { path: '/' })
        expect(result).toBe('/main')
      },
    )
  })

  describe('roleWhitelist — dept_manager + system_admin routes', () => {
    it.each([
      '/main/damagedassetdetails',
      '/main/damagedassetbasicdetails',
      '/main/unregisteredassetdetails',
      '/main/unregisteredassetbasicdetails',
    ])('should allow dept_manager on %s', async (path) => {
      ;(getDecryptedToken as any).mockReturnValue('valid-token')
      mockAuthStore.isLoggedIn = true
      mockAuthStore.access_token = 'valid-token'
      mockAuthStore.userRole = 'dept_manager'
      mockAuthStore.authInfo = { auth_id: 1, auth_username: 'mgr' }

      setupAndCapture()

      const result = await beforeEachCallback({ path, meta: {} }, { path: '/' })
      expect(result).toBe(true)
    })

    it('should deny regular_user on damagedassetdetails', async () => {
      ;(getDecryptedToken as any).mockReturnValue('valid-token')
      mockAuthStore.isLoggedIn = true
      mockAuthStore.access_token = 'valid-token'
      mockAuthStore.userRole = 'regular_user'
      mockAuthStore.authInfo = { auth_id: 1, auth_username: 'test' }

      setupAndCapture()

      const result = await beforeEachCallback(
        { path: '/main/damagedassetdetails', meta: {} },
        { path: '/' },
      )
      expect(result).toBe('/main')
    })
  })

  describe('roleWhitelist — auditor routes', () => {
    it('should allow auditor on /main/auditlogdetails', async () => {
      ;(getDecryptedToken as any).mockReturnValue('valid-token')
      mockAuthStore.isLoggedIn = true
      mockAuthStore.access_token = 'valid-token'
      mockAuthStore.userRole = 'auditor'
      mockAuthStore.authInfo = { auth_id: 1, auth_username: 'auditor' }

      setupAndCapture()

      const result = await beforeEachCallback(
        { path: '/main/auditlogdetails', meta: {} },
        { path: '/' },
      )
      expect(result).toBe(true)
    })

    it('should deny regular_user on /main/auditlogdetails', async () => {
      ;(getDecryptedToken as any).mockReturnValue('valid-token')
      mockAuthStore.isLoggedIn = true
      mockAuthStore.access_token = 'valid-token'
      mockAuthStore.userRole = 'regular_user'
      mockAuthStore.authInfo = { auth_id: 1, auth_username: 'test' }

      setupAndCapture()

      const result = await beforeEachCallback(
        { path: '/main/auditlogdetails', meta: {} },
        { path: '/' },
      )
      expect(result).toBe('/main')
    })
  })

  describe('checkRoleAccess — unlisted routes default to open', () => {
    it('should allow any authenticated role on /main/assetdetails', async () => {
      ;(getDecryptedToken as any).mockReturnValue('valid-token')
      mockAuthStore.isLoggedIn = true
      mockAuthStore.access_token = 'valid-token'
      mockAuthStore.userRole = 'regular_user'
      mockAuthStore.authInfo = { auth_id: 1, auth_username: 'test' }

      setupAndCapture()

      const result = await beforeEachCallback(
        { path: '/main/assetdetails', meta: {} },
        { path: '/' },
      )
      expect(result).toBe(true)
    })

    it('should allow any role on /main/outassetdetails', async () => {
      ;(getDecryptedToken as any).mockReturnValue('valid-token')
      mockAuthStore.isLoggedIn = true
      mockAuthStore.access_token = 'valid-token'
      mockAuthStore.userRole = 'regular_user'
      mockAuthStore.authInfo = { auth_id: 1, auth_username: 'test' }

      setupAndCapture()

      const result = await beforeEachCallback(
        { path: '/main/outassetdetails', meta: {} },
        { path: '/' },
      )
      expect(result).toBe(true)
    })
  })

  describe('checkRoleAccess — longest prefix matching', () => {
    it('should match /main/userdetails before /main', async () => {
      ;(getDecryptedToken as any).mockReturnValue('valid-token')
      mockAuthStore.isLoggedIn = true
      mockAuthStore.access_token = 'valid-token'
      mockAuthStore.userRole = 'regular_user'
      mockAuthStore.authInfo = { auth_id: 1, auth_username: 'test' }

      setupAndCapture()

      const result = await beforeEachCallback(
        { path: '/main/userdetails', meta: {} },
        { path: '/' },
      )
      expect(result).toBe('/main')
    })

    it('should match /main/damagedassetdetails prefix for nested paths', async () => {
      ;(getDecryptedToken as any).mockReturnValue('valid-token')
      mockAuthStore.isLoggedIn = true
      mockAuthStore.access_token = 'valid-token'
      mockAuthStore.userRole = 'regular_user'
      mockAuthStore.authInfo = { auth_id: 1, auth_username: 'test' }

      setupAndCapture()

      const result = await beforeEachCallback(
        { path: '/main/damagedassetdetails/some-detail', meta: {} },
        { path: '/' },
      )
      expect(result).toBe('/main')
    })
  })

  describe('breadcrumbs', () => {
    it('should include 首页 as first breadcrumb for /main', () => {
      setupAndCapture()
      afterEachCallback({ path: '/main', meta: {} })

      const callArg = mockSetBreadcrumbs.mock.calls[0][0]
      expect(callArg[0]).toEqual({ name: '首页', path: '/main' })
    })

    it('should generate breadcrumb chain for /main/assetdetails', () => {
      setupAndCapture()
      afterEachCallback({ path: '/main/assetdetails', meta: {} })

      const callArg = mockSetBreadcrumbs.mock.calls[0][0]
      expect(callArg).toEqual([
        { name: '首页', path: '/main' },
        { name: '资产管理', path: '/main/assetdetails' },
      ])
    })

    it('should generate three-level breadcrumb for /main/userdetails', () => {
      setupAndCapture()
      afterEachCallback({ path: '/main/userdetails', meta: {} })

      const callArg = mockSetBreadcrumbs.mock.calls[0][0]
      expect(callArg).toEqual([
        { name: '首页', path: '/main' },
        { name: '用户管理', path: '/main/userdetails' },
      ])
    })

    it('should map known segments to Chinese names', () => {
      setupAndCapture()
      afterEachCallback({ path: '/main/contractdetails', meta: {} })

      const callArg = mockSetBreadcrumbs.mock.calls[0][0]
      expect(callArg).toEqual([
        { name: '首页', path: '/main' },
        { name: '合同管理', path: '/main/contractdetails' },
      ])
    })

    it('should only include 首页 for /main path', () => {
      setupAndCapture()
      afterEachCallback({ path: '/main', meta: {} })

      const callArg = mockSetBreadcrumbs.mock.calls[0][0]
      expect(callArg).toHaveLength(1)
    })
  })

  describe('login redirect', () => {
    it('should redirect authenticated user away from /login to /main', async () => {
      ;(getDecryptedToken as any).mockReturnValue('valid-token')
      mockAuthStore.isLoggedIn = true
      mockAuthStore.access_token = 'valid-token'

      setupAndCapture()

      const result = await beforeEachCallback({ path: '/login', meta: {} }, { path: '/main' })
      expect(result).toBe('/main')
    })

    it('should show warning when unauthenticated user tries to access protected route', async () => {
      ;(getDecryptedToken as any).mockReturnValue(null)
      setupAndCapture()

      const result = await beforeEachCallback({ path: '/main', meta: {} }, { path: '/' })
      expect(result).toBe('/login')
      expect(ElMessage.warning).toHaveBeenCalledWith('请先登录')
    })

    it('should redirect to /login on guard error', async () => {
      ;(getDecryptedToken as any).mockReturnValue('valid-token')
      mockAuthStore.isLoggedIn = true
      mockAuthStore.access_token = 'valid-token'
      mockAuthStore.authInfo = null
      mockGetAuthInfo.mockRejectedValueOnce(new Error('Network error'))

      setupAndCapture()

      const result = await beforeEachCallback({ path: '/main', meta: {} }, { path: '/' })
      expect(result).toBe('/login')
      expect(mockSilentLogout).toHaveBeenCalled()
      expect(ElMessage.error).toHaveBeenCalledWith('登录已过期，请重新登录')
    })
  })

  describe('app state initialization', () => {
    it('should set loading to true before guard runs', async () => {
      ;(getDecryptedToken as any).mockReturnValue(null)
      setupAndCapture()

      await beforeEachCallback({ path: '/login', meta: {} }, { path: '/' })

      expect(mockSetLoading).toHaveBeenCalledWith(true)
    })
  })

  describe('superuser bypass — is_superuser in store', () => {
    it('should allow superuser access to system_admin-only routes even with role=regular_user', async () => {
      mockAuthStore.isLoggedIn = true
      mockAuthStore.access_token = 'valid-token'
      mockAuthStore.userRole = 'regular_user'
      mockAuthStore.isSuperuser = true
      mockAuthStore.authInfo = { auth_id: 1, auth_username: 'whdtadmin' }

      setupAndCapture()

      const result = await beforeEachCallback(
        { path: '/main/userdetails', meta: {} },
        { path: '/' },
      )
      expect(result).toBe(true)
    })

    it('should allow superuser access to /main/system', async () => {
      mockAuthStore.isLoggedIn = true
      mockAuthStore.access_token = 'valid-token'
      mockAuthStore.userRole = 'regular_user'
      mockAuthStore.isSuperuser = true
      mockAuthStore.authInfo = { auth_id: 1, auth_username: 'whdtadmin' }

      setupAndCapture()

      const result = await beforeEachCallback({ path: '/main/system', meta: {} }, { path: '/' })
      expect(result).toBe(true)
    })

    it('should deny non-superuser with role=regular_user on admin routes', async () => {
      mockAuthStore.isLoggedIn = true
      mockAuthStore.access_token = 'valid-token'
      mockAuthStore.userRole = 'regular_user'
      mockAuthStore.isSuperuser = false
      mockAuthStore.authInfo = { auth_id: 2, auth_username: 'normal' }

      setupAndCapture()

      const result = await beforeEachCallback(
        { path: '/main/userdetails', meta: {} },
        { path: '/' },
      )
      expect(result).toBe('/main')
      expect(ElMessage.error).toHaveBeenCalledWith('您没有权限访问该页面')
    })
  })
})
