import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'
import { permissionsAPI } from '@/api/permissions'

const device = vi.hoisted(() => ({
  detectAuthChannel: vi.fn(),
}))

const tokenMemory = vi.hoisted(() => ({
  setInMemoryAccessToken: vi.fn(),
  clearInMemoryAccessToken: vi.fn(),
  getInMemoryAccessToken: vi.fn(),
}))

const tokenRefresh = vi.hoisted(() => ({
  refreshAccessToken: vi.fn(),
}))

// Mock依赖模块
vi.mock('@/api/auth', () => ({
  authAPI: {
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUserProfile: vi.fn(),
  },
}))

vi.mock('@/api/permissions', () => ({
  permissionsAPI: {
    getMyPermissions: vi.fn(),
  },
}))

vi.mock('@/utils/tokenCrypto', () => ({
  setEncryptedToken: vi.fn(),
  getDecryptedToken: vi.fn(),
  clearAllAuthTokens: vi.fn(),
  removeToken: vi.fn(),
}))

vi.mock('@/utils/device', () => device)

vi.mock('@/utils/tokenMemory', () => tokenMemory)

vi.mock('@/utils/tokenRefresh', () => tokenRefresh)

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

    // 默认 bearer 通道（happy-dom 的 userAgent 非移动端，显式 mock 保证确定性）
    device.detectAuthChannel.mockReturnValue('bearer')

    // 默认权限加载成功（空权限集），各测试可按需覆盖
    vi.mocked(permissionsAPI.getMyPermissions).mockResolvedValue({
      permissions: [],
      data_scope: {
        scope_type: 'departments',
        department_codes: [],
        include_children: false,
      },
    })
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

    it('cookie通道即使无token也应调用logout API（后端删除Cookie）', async () => {
      device.detectAuthChannel.mockReturnValue('cookie')
      const { authAPI } = await import('@/api/auth')

      authStore.refresh_token = null
      vi.mocked(authAPI.logout).mockResolvedValue(undefined)

      await authStore.logout()

      expect(authAPI.logout).toHaveBeenCalledWith(undefined)
      expect(authStore.isLoggedIn).toBe(false)
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

      const result = await authStore.initAuthState()

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

      const result = await authStore.initAuthState()

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

      const result = await authStore.initAuthState()

      expect(result).toBe(false)
      expect(authStore.isLoggedIn).toBe(false)
    })

    it('cookie通道应经refresh验证会话并同步profile RBAC', async () => {
      device.detectAuthChannel.mockReturnValue('cookie')
      const { refreshAccessToken } = vi.mocked(await import('@/utils/tokenRefresh'))
      const { authAPI } = await import('@/api/auth')

      vi.mocked(refreshAccessToken).mockResolvedValue('cookie-access-token')
      vi.mocked(authAPI.getCurrentUserProfile).mockResolvedValue({
        auth_id: 1,
        auth_username: 'admin',
        auth_is_active: true,
        role: 'system_admin',
        department_code: 'DEP001',
        is_superuser: true,
      } as any)

      const result = await authStore.initAuthState()

      expect(refreshAccessToken).toHaveBeenCalledWith('cookie')
      expect(authStore.access_token).toBe('cookie-access-token')
      expect(result).toBe(true)
      expect(authStore.isLoggedIn).toBe(true)
      expect(authStore.userRole).toBe('system_admin')
      expect(authStore.userDepartmentCode).toBe('DEP001')
      expect(authStore.isSuperuser).toBe(true)
    })

    it('cookie通道refresh失败时应silentLogout', async () => {
      device.detectAuthChannel.mockReturnValue('cookie')
      const { refreshAccessToken } = vi.mocked(await import('@/utils/tokenRefresh'))
      vi.mocked(refreshAccessToken).mockRejectedValue(new Error('会话失效'))

      const result = await authStore.initAuthState()

      expect(result).toBe(false)
      expect(authStore.isLoggedIn).toBe(false)
    })
  })

  describe('getAuthInfo', () => {
    it('成功获取用户信息时应更新authInfo', async () => {
      const { authAPI } = await import('@/api/auth')
      const { setEncryptedToken } = vi.mocked(await import('@/utils/tokenCrypto'))

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

    it('profile返回RBAC字段时应同步角色与isSuperuser', async () => {
      const { authAPI } = await import('@/api/auth')

      vi.mocked(authAPI.getCurrentUserProfile).mockResolvedValue({
        auth_id: 1,
        auth_username: 'admin',
        auth_is_active: true,
        role: 'system_admin',
        department_code: 'DEP001',
        is_superuser: true,
      } as any)

      await authStore.getAuthInfo()

      expect(authStore.userRole).toBe('system_admin')
      expect(authStore.userDepartmentCode).toBe('DEP001')
      expect(authStore.isSuperuser).toBe(true)
      expect(authStore.isLoggedIn).toBe(true)
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
      const { setEncryptedToken } = vi.mocked(await import('@/utils/tokenCrypto'))

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

    it('cookie通道登录不应持久化token，仅存内存并清除历史bearer token', async () => {
      device.detectAuthChannel.mockReturnValue('cookie')
      const { authAPI } = await import('@/api/auth')
      const { setEncryptedToken, removeToken } = vi.mocked(await import('@/utils/tokenCrypto'))
      const { setInMemoryAccessToken } = vi.mocked(await import('@/utils/tokenMemory'))

      vi.mocked(authAPI.login).mockResolvedValue({
        code: 0,
        message: 'success',
        data: {
          user: { auth_id: 1, auth_username: 'admin', auth_is_active: true },
          access: 'cookie-access',
          refresh: 'cookie-refresh',
        },
      } as any)

      const result = await authStore.login({ auth_username: 'admin', password: '123456' })

      expect(result.success).toBe(true)
      expect(authStore.refresh_token).toBeNull()
      expect(authStore.access_token).toBe('cookie-access')
      expect(setInMemoryAccessToken).toHaveBeenCalledWith('cookie-access')
      expect(removeToken).toHaveBeenCalledWith('access_token')
      expect(removeToken).toHaveBeenCalledWith('refresh_token')
      expect(setEncryptedToken).not.toHaveBeenCalledWith('access_token', 'cookie-access')
      expect(setEncryptedToken).not.toHaveBeenCalledWith('refresh_token', 'cookie-refresh')
      // 非敏感 authInfo 仍持久化
      expect(setEncryptedToken).toHaveBeenCalledWith(
        'authInfo',
        JSON.stringify({ auth_id: 1, auth_username: 'admin', isactive: true }),
      )
    })
  })
})
