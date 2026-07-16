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

    it('应该初始化RBAC角色为regular_user', () => {
      expect(authStore.userRole).toBe('regular_user')
      expect(authStore.userDepartmentCode).toBeNull()
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

    it('应该重置RBAC角色和部门编码', () => {
      authStore.userRole = 'admin'
      authStore.userDepartmentCode = 'DEP001'

      authStore.silentLogout()

      expect(authStore.userRole).toBe('regular_user')
      expect(authStore.userDepartmentCode).toBeNull()
    })

    it('应该调用clearAllAuthTokens和localStorage.removeItem', async () => {
      const { clearAllAuthTokens } = vi.mocked(await import('@/utils/tokenCrypto'))
      const removeItemSpy = vi.spyOn(localStorage, 'removeItem')

      authStore.silentLogout()

      expect(clearAllAuthTokens).toHaveBeenCalled()
      expect(removeItemSpy).toHaveBeenCalledWith('authInfo')
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

    it('authInfo为null时不应抛出异常', () => {
      authStore.authInfo = null
      expect(() => authStore.updateAuthInfo({ isactive: false })).not.toThrow()
    })
  })

  describe('logout', () => {
    it('有refresh_token时应调用后端logout API', async () => {
      const { authAPI } = await import('@/api/auth')
      const { clearAllAuthTokens } = vi.mocked(await import('@/utils/tokenCrypto'))

      authStore.refresh_token = 'refresh-token-123'
      vi.mocked(authAPI.logout).mockResolvedValue(undefined)

      await authStore.logout()

      expect(authAPI.logout).toHaveBeenCalledWith('refresh-token-123')
      expect(clearAllAuthTokens).toHaveBeenCalled()
      expect(authStore.isLoggedIn).toBe(false)
      expect(authStore.authInfo).toBeNull()
    })

    it('无refresh_token时应跳过API调用仅清除本地状态', async () => {
      const { authAPI } = await import('@/api/auth')
      const { getDecryptedToken } = vi.mocked(await import('@/utils/tokenCrypto'))

      authStore.refresh_token = null
      vi.mocked(getDecryptedToken).mockReturnValue(null)

      await authStore.logout()

      expect(authAPI.logout).not.toHaveBeenCalled()
      expect(authStore.isLoggedIn).toBe(false)
    })

    it('后端API失败时仍应清除本地状态', async () => {
      const { authAPI } = await import('@/api/auth')

      authStore.refresh_token = 'refresh-token-123'
      authStore.isLoggedIn = true
      vi.mocked(authAPI.logout).mockRejectedValue(new Error('网络异常'))

      await authStore.logout()

      expect(authStore.isLoggedIn).toBe(false)
      expect(authStore.authInfo).toBeNull()
      expect(authStore.access_token).toBeNull()
    })

    it('退出后应重置RBAC角色和部门编码', async () => {
      authStore.userRole = 'admin'
      authStore.userDepartmentCode = 'DEP001'
      authStore.refresh_token = 'refresh-token-123'

      const { authAPI } = await import('@/api/auth')
      vi.mocked(authAPI.logout).mockResolvedValue(undefined)

      await authStore.logout()

      expect(authStore.userRole).toBe('regular_user')
      expect(authStore.userDepartmentCode).toBeNull()
    })
  })

  describe('initAuthState', () => {
    it('有保存的认证信息时应恢复登录状态', async () => {
      const { getDecryptedToken } = vi.mocked(await import('@/utils/tokenCrypto'))

      // 构造一个包含role的JWT payload (Base64编码)
      const payload = { role: 'admin', department_code: 'DEP001' }
      const token = `header.${btoa(JSON.stringify(payload))}.signature`

      vi.mocked(getDecryptedToken).mockImplementation((key: string) => {
        const map: Record<string, string> = {
          authInfo: JSON.stringify({ auth_id: 1, auth_username: 'admin', isactive: true }),
          access_token: token,
          refresh_token: 'refresh-token',
        }
        return map[key as string] || null
      })

      const result = authStore.initAuthState()

      expect(result).toBe(true)
      expect(authStore.isLoggedIn).toBe(true)
      expect(authStore.authInfo).toEqual({ auth_id: 1, auth_username: 'admin', isactive: true })
      expect(authStore.access_token).toBe(token)
      expect(authStore.refresh_token).toBe('refresh-token')
      expect(authStore.userRole).toBe('admin')
      expect(authStore.userDepartmentCode).toBe('DEP001')
    })

    it('无保存的认证信息时应返回false', async () => {
      const { getDecryptedToken } = vi.mocked(await import('@/utils/tokenCrypto'))
      vi.mocked(getDecryptedToken).mockReturnValue(null)

      const result = authStore.initAuthState()

      expect(result).toBe(false)
      expect(authStore.isLoggedIn).toBe(false)
    })

    it('JSON解析失败时应调用silentLogout', async () => {
      const { getDecryptedToken } = vi.mocked(await import('@/utils/tokenCrypto'))

      vi.mocked(getDecryptedToken).mockImplementation((key: string) => {
        const map: Record<string, string> = {
          authInfo: 'invalid-json{{{',
          access_token: 'token',
          refresh_token: 'refresh',
        }
        return map[key as string] || null
      })

      const result = authStore.initAuthState()

      expect(result).toBe(false)
      expect(authStore.isLoggedIn).toBe(false)
    })
  })

  describe('getAuthInfo', () => {
    it('成功获取用户信息时应更新authInfo', async () => {
      const { authAPI } = await import('@/api/auth')
      const { setEncryptedToken } = vi.mocked(
        await import('@/utils/tokenCrypto'),
      )

      vi.mocked(authAPI.getCurrentUserProfile).mockResolvedValue({
        auth_id: 1,
        auth_username: 'testuser',
        auth_is_active: true,
      } as any)

      await authStore.getAuthInfo()

      expect(authStore.authInfo).toEqual({
        auth_id: 1,
        auth_username: 'testuser',
        isactive: true,
      })
      expect(setEncryptedToken).toHaveBeenCalledWith(
        'authInfo',
        JSON.stringify({ auth_id: 1, auth_username: 'testuser', isactive: true }),
      )
    })

    it('API失败时应调用silentLogout并抛出异常', async () => {
      const { authAPI } = await import('@/api/auth')

      vi.mocked(authAPI.getCurrentUserProfile).mockRejectedValue(new Error('获取失败'))

      await expect(authStore.getAuthInfo()).rejects.toThrow('获取用户信息失败')
      expect(authStore.isLoggedIn).toBe(false)
      expect(authStore.authInfo).toBeNull()
    })
  })

  describe('login', () => {
    it('登录成功时应更新所有认证状态', async () => {
      const { authAPI } = await import('@/api/auth')
      const { setEncryptedToken: _setEncryptedToken } = vi.mocked(
        await import('@/utils/tokenCrypto'),
      )

      // 构造JWT payload
      const jwtPayload = { role: 'system_admin', department_code: 'DEP001' }
      const accessToken = `header.${btoa(JSON.stringify(jwtPayload))}.signature`
      const refreshToken = 'refresh-token-123'

      vi.mocked(authAPI.login).mockResolvedValue({
        code: 0,
        message: 'success',
        data: {
          user: { auth_id: 1, auth_username: 'admin', auth_is_active: true },
          access: accessToken,
          refresh: refreshToken,
        },
      } as any)

      const result = await authStore.login({ auth_username: 'admin', password: '123456' })

      expect(result.success).toBe(true)
      expect(authStore.isLoggedIn).toBe(true)
      expect(authStore.access_token).toBe(accessToken)
      expect(authStore.refresh_token).toBe(refreshToken)
      expect(authStore.authInfo).toEqual({
        auth_id: 1,
        auth_username: 'admin',
        isactive: true,
      })
      expect(authStore.userRole).toBe('system_admin')
      expect(authStore.userDepartmentCode).toBe('DEP001')
    })

    it('登录成功时应持久化存储认证信息', async () => {
      const { authAPI } = await import('@/api/auth')
      const { setEncryptedToken } = vi.mocked(
        await import('@/utils/tokenCrypto'),
      )

      vi.mocked(authAPI.login).mockResolvedValue({
        code: 0,
        message: 'success',
        data: {
          user: { auth_id: 1, auth_username: 'admin', auth_is_active: true },
          access: 'access-token',
          refresh: 'refresh-token',
        },
      } as any)

      await authStore.login({ auth_username: 'admin', password: '123456' })

      expect(setEncryptedToken).toHaveBeenCalledWith('access_token', 'access-token')
      expect(setEncryptedToken).toHaveBeenCalledWith('refresh_token', 'refresh-token')
      expect(setEncryptedToken).toHaveBeenCalledWith(
        'authInfo',
        JSON.stringify({ auth_id: 1, auth_username: 'admin', isactive: true }),
      )
    })

    it('登录失败时应返回错误信息且不更新状态', async () => {
      const { authAPI } = await import('@/api/auth')

      vi.mocked(authAPI.login).mockResolvedValue({
        code: 1,
        message: '用户名或密码错误',
        data: null,
      } as any)

      const result = await authStore.login({ auth_username: 'wrong', password: 'wrong' })

      expect(result.success).toBe(false)
      expect(result.message).toBe('用户名或密码错误')
      expect(authStore.isLoggedIn).toBe(false)
      expect(authStore.authInfo).toBeNull()
    })

    it('登录失败时应返回默认错误信息', async () => {
      const { authAPI } = await import('@/api/auth')

      vi.mocked(authAPI.login).mockResolvedValue({
        code: 1,
        message: null,
        data: null,
      } as any)

      const result = await authStore.login({ auth_username: 'wrong', password: 'wrong' })

      expect(result.success).toBe(false)
      expect(result.message).toBe('登录失败')
    })

    it('API异常时应捕获Error并返回错误信息', async () => {
      const { authAPI } = await import('@/api/auth')

      vi.mocked(authAPI.login).mockRejectedValue(new Error('网络连接超时'))

      const result = await authStore.login({ auth_username: 'admin', password: '123456' })

      expect(result.success).toBe(false)
      expect(result.message).toBe('网络连接超时')
      expect(authStore.isLoggedIn).toBe(false)
    })

    it('API异常时应返回默认错误信息', async () => {
      const { authAPI } = await import('@/api/auth')

      vi.mocked(authAPI.login).mockRejectedValue('unknown error')

      const result = await authStore.login({ auth_username: 'admin', password: '123456' })

      expect(result.success).toBe(false)
      expect(result.message).toBe('登录失败，请检查用户名和密码或后端服务器状态')
    })

    it('JWT无role字段时应使用默认角色regular_user', async () => {
      const { authAPI } = await import('@/api/auth')

      const accessToken = `header.${btoa(JSON.stringify({}))}.signature`

      vi.mocked(authAPI.login).mockResolvedValue({
        code: 0,
        message: 'success',
        data: {
          user: { auth_id: 1, auth_username: 'admin', auth_is_active: true },
          access: accessToken,
          refresh: 'refresh-token',
        },
      } as any)

      await authStore.login({ auth_username: 'admin', password: '123456' })

      expect(authStore.userRole).toBe('regular_user')
      expect(authStore.userDepartmentCode).toBeNull()
    })

    it('JWT解析失败时应使用默认角色', async () => {
      const { authAPI } = await import('@/api/auth')

      vi.mocked(authAPI.login).mockResolvedValue({
        code: 0,
        message: 'success',
        data: {
          user: { auth_id: 1, auth_username: 'admin', auth_is_active: true },
          access: 'invalid-jwt-token',
          refresh: 'refresh-token',
        },
      } as any)

      await authStore.login({ auth_username: 'admin', password: '123456' })

      expect(authStore.userRole).toBe('regular_user')
      expect(authStore.userDepartmentCode).toBeNull()
    })
  })
})
