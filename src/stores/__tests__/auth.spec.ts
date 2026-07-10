import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'

// Mock依赖模块
vi.mock('@/api/auth', () => ({
  authAPI: {
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUserProfile: vi.fn(),
  },
}))

vi.mock('@/utils/tokenCrypto', () => ({
  setEncryptedToken: vi.fn(),
  getDecryptedToken: vi.fn(),
  clearAllAuthTokens: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('AuthStore', () => {
  let authStore: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    // 创建新的Pinia实例并激活
    const pinia = createPinia()
    setActivePinia(pinia)
    authStore = useAuthStore()

    // 清除所有mock调用记录
    vi.clearAllMocks()
  })

  describe('初始化状态', () => {
    it('应该初始化为未登录状态', () => {
      expect(authStore.isLoggedIn).toBe(false)
      expect(authStore.authInfo).toBeNull()
      expect(authStore.access_token).toBeNull()
      expect(authStore.refresh_token).toBeNull()
    })
  })

  describe('静默退出', () => {
    it('应该正确清除所有认证状态', () => {
      // 先设置一些状态
      authStore.authInfo = { auth_id: 1, auth_username: 'test', isactive: true }
      authStore.isLoggedIn = true
      authStore.access_token = 'test-token'

      // 执行静默退出
      authStore.silentLogout()

      // 验证状态已清除
      expect(authStore.authInfo).toBeNull()
      expect(authStore.isLoggedIn).toBe(false)
      expect(authStore.access_token).toBeNull()
      expect(authStore.refresh_token).toBeNull()
    })
  })

  describe('更新认证信息', () => {
    it('应该正确更新认证信息', () => {
      // 先设置初始认证信息
      authStore.authInfo = { auth_id: 1, auth_username: 'test', isactive: true }

      // 更新部分信息
      authStore.updateAuthInfo({ isactive: false })

      // 验证信息已更新
      expect(authStore.authInfo).toEqual({
        auth_id: 1,
        auth_username: 'test',
        isactive: false,
      })
    })
  })
})