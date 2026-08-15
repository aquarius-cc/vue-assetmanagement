/**
 * @file 用户认证 Store（双认证通道），负责登录、登出、Token 管理与 RBAC 角色解析
 * @module stores/auth
 * @exports
 *   - useAuthStore: 用户认证状态 Store
 * @description
 *   双认证通道（与后端 authentication.py / views.py 契约一致，DR-1）：
 *   - bearer 通道（移动端）：access/refresh 加密持久化到 localStorage
 *   - cookie 通道（PC）：HttpOnly Cookie 承载，token 仅存内存（供 WS），
 *     localStorage 仅保留非敏感的 authInfo；刷新/验证走 refresh 端点
 * @callers
 *   - views/LogIn.vue
 *   - router/guards.ts
 *   - composables/usePermission.ts
 *   - composables/useDashboardPage.ts
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authAPI } from '@/api/auth'
import { ElMessage } from 'element-plus'
import type { LoginForm, AuthInfo } from '@/types/authuser'
import {
  setEncryptedToken,
  getDecryptedToken,
  removeToken,
  clearAllAuthTokens,
} from '@/utils/tokenCrypto'
import { setInMemoryAccessToken, clearInMemoryAccessToken } from '@/utils/tokenMemory'
import { detectAuthChannel } from '@/utils/device'
import type { AuthChannel } from '@/utils/device'
import { refreshAccessToken } from '@/utils/tokenRefresh'
import { permissionsAPI } from '@/api/permissions'
import type { DataScope } from '@/types/permission'
import { DEFAULT_ROLE } from '@/constants/roles'
import { decodeJWTPayload } from '@/utils/decodeJwt'

export const useAuthStore = defineStore('AuthUser', () => {
  const authInfo = ref<AuthInfo | null>(null) // 认证用户信息
  const isLoggedIn = ref(false) // 登录状态
  const access_token = ref<string | null>(null) // 访问令牌（cookie 通道仅内存）
  const refresh_token = ref<string | null>(null) // 刷新令牌（cookie 通道为 null，HttpOnly）
  const userRole = ref<string>(DEFAULT_ROLE) // RBAC 角色
  const userDepartmentCode = ref<string | null>(null) // RBAC 部门编码
  const isSuperuser = ref(false) // 是否超级管理员（bearer 从 JWT，cookie 从 profile）

  // ===== RBAC 权限码与数据范围 =====
  const permissions = ref<string[]>([]) // 权限码列表，如 ['asset:read', 'asset:create']
  const dataScope = ref<DataScope | null>(null) // 数据范围

  // 防重入：避免并发请求重复加载权限
  let _permPromise: Promise<void> | null = null

  // N1: 权限是否已加载完成。仅加载成功后置 true
  const permissionsLoaded = ref(false)

  // 初始化是否已完成（避免守卫/登录页重复触发 initAuthState）
  const authInitialized = ref(false)

  /**
   * 重置认证状态（logout/silentLogout 共用，DR-1）
   */
  function resetAuthState(): void {
    authInfo.value = null
    isLoggedIn.value = false
    access_token.value = null
    refresh_token.value = null
    userRole.value = DEFAULT_ROLE
    userDepartmentCode.value = null
    isSuperuser.value = false
    permissions.value = []
    dataScope.value = null
    permissionsLoaded.value = false
    _permPromise = null
    clearAllAuthTokens()
    clearInMemoryAccessToken()
    localStorage.removeItem('authInfo')
    localStorage.removeItem('myPermissions')
  }

  // ===== 私有 helper（复用 DR-1） =====

  /**
   * RBAC：从 JWT 解析权威字段（后端 inject_rbac_claims 注入，DR-1）
   */
  function applyRbacFromJwt(access: string | null): void {
    const payload = decodeJWTPayload(access)
    if (!payload) return
    userRole.value = (payload.role as string) || DEFAULT_ROLE
    userDepartmentCode.value = (payload.department_code as string) || null
    isSuperuser.value = payload.is_superuser === true
  }

  /**
   * 按通道持久化 Token：bearer 落 localStorage；cookie 仅内存 + 清除历史
   */
  function persistTokensAfterLogin(channel: AuthChannel, access: string, refresh: string): void {
    if (channel === 'bearer') {
      refresh_token.value = refresh
      setEncryptedToken('access_token', access)
      setEncryptedToken('refresh_token', refresh)
      return
    }
    // cookie 通道：token 仅内存（HttpOnly 已接管持久化），清除历史 bearer token
    refresh_token.value = null
    setInMemoryAccessToken(access)
    removeToken('access_token')
    removeToken('refresh_token')
  }

  /**
   * 从本地缓存恢复权限（降级用，守卫会联网刷新）
   */
  function restoreCachedPermissions(): void {
    const savedPermsStr = getDecryptedToken('myPermissions')
    if (!savedPermsStr) return
    try {
      const savedPerms = JSON.parse(savedPermsStr) as {
        permissions: string[]
        data_scope: DataScope
      }
      permissions.value = savedPerms.permissions
      dataScope.value = savedPerms.data_scope
    } catch {
      permissions.value = []
      dataScope.value = null
    }
  }

  /**
   * bearer 通道：从加密存储恢复会话
   */
  async function restoreBearerSession(): Promise<boolean> {
    const savedAuthInfoStr = getDecryptedToken('authInfo')
    const savedAccessToken = getDecryptedToken('access_token')
    const savedRefreshToken = getDecryptedToken('refresh_token')
    if (!savedAuthInfoStr || !savedAccessToken || !savedRefreshToken) {
      return false
    }
    try {
      authInfo.value = JSON.parse(savedAuthInfoStr)
      access_token.value = savedAccessToken
      refresh_token.value = savedRefreshToken
      isLoggedIn.value = true
      restoreCachedPermissions()
      applyRbacFromJwt(savedAccessToken)
      return true
    } catch (error) {
      console.error('恢复用户状态失败:', error)
      silentLogout()
      return false
    }
  }

  /**
   * cookie 通道：HttpOnly Cookie 无法被 JS 读取，通过 refresh 验证会话并取 access
   */
  async function verifyCookieSession(): Promise<boolean> {
    try {
      const access = await refreshAccessToken('cookie')
      access_token.value = access
      await getAuthInfo()
      return isLoggedIn.value
    } catch (error) {
      console.error('Cookie 会话验证失败:', error)
      silentLogout()
      return false
    }
  }

  /**
   * 提取登录失败的错误提示（Error / Axios 响应 message / 兜底文案）
   */
  function extractLoginErrorMessage(error: unknown): string {
    const fallback = '登录失败，请检查用户名和密码或后端服务器状态'
    if (error instanceof Error) {
      return error.message || fallback
    }
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { message?: string } } }
      return axiosError.response?.data?.message || fallback
    }
    return fallback
  }

  /**
   * 用户登录（双通道：登录响应均含 access/refresh，按通道决定持久化策略）
   * @param loginData 登录表单数据
   */
  const login = async (loginData: LoginForm) => {
    try {
      const response = await authAPI.login({
        auth_username: loginData.auth_username,
        password: loginData.password,
      })

      if (response.code !== 0) {
        return { success: false, message: response.message || '登录失败' }
      }

      const channel = detectAuthChannel()
      const authUserData: AuthInfo = {
        auth_id: response.data.user.auth_id,
        auth_username: response.data.user.auth_username,
        isactive: response.data.user.auth_is_active,
      }

      authInfo.value = authUserData
      isLoggedIn.value = true
      access_token.value = response.data.access

      // RBAC: 从 JWT 解析（login 响应始终含 access token，双通道可用）
      applyRbacFromJwt(response.data.access)
      persistTokensAfterLogin(channel, response.data.access, response.data.refresh)

      // 非敏感用户信息始终持久化（供 WS jobcode、记住用户名等场景）
      setEncryptedToken('authInfo', JSON.stringify(authUserData))

      // 登录成功后加载权限（不 await，避免阻塞登录返回）
      void loadMyPermissions()
      return { success: true, message: '登录成功' }
    } catch (error) {
      console.error('登录失败:', error)
      return { success: false, message: extractLoginErrorMessage(error) }
    }
  }

  /**
   * 用户退出登录（完整流程）
   * @description 双通道：bearer 传 refresh 作废；cookie 空 body 由后端读 Cookie 并清除
   */
  const logout = async () => {
    try {
      const channel = detectAuthChannel()
      const token = refresh_token.value || getDecryptedToken('refresh_token')

      if (channel === 'cookie' || token) {
        await authAPI.logout(token || undefined)
        ElMessage.success('退出成功')
      } else {
        console.warn('退出登录时未找到 refresh_token，仅清除本地状态')
        ElMessage.success('已退出登录')
      }
    } catch (error) {
      console.error('退出登录接口异常，仍清除本地状态:', error)
      ElMessage.warning('退出登录时服务端通信异常，已清除本地状态')
    } finally {
      resetAuthState()
    }
  }

  /**
   * 静默退出登录（仅清除本地状态，不调用后端 API）
   */
  const silentLogout = () => {
    resetAuthState()
  }

  /**
   * 初始化认证状态（异步，通道感知）
   * @description
   *   - bearer 通道：从 localStorage 恢复
   *   - cookie 通道：refresh 端点验证会话并获取 access（供 WS），再拉取 profile
   * @returns 是否成功恢复登录状态
   */
  const initAuthState = async (): Promise<boolean> => {
    if (authInitialized.value) return isLoggedIn.value
    authInitialized.value = true

    const channel = detectAuthChannel()
    if (channel === 'cookie') return verifyCookieSession()
    return restoreBearerSession()
  }

  /**
   * 更新认证信息
   * @param newAuthInfo 新的认证信息（部分更新）
   */
  const updateAuthInfo = (newAuthInfo: Partial<AuthInfo>) => {
    if (authInfo.value) {
      authInfo.value = { ...authInfo.value, ...newAuthInfo }
      setEncryptedToken('authInfo', JSON.stringify(authInfo.value))
    }
  }

  /**
   * 获取当前用户信息（同步 RBAC 权威字段）
   * @description 调用 GET /api/auth/profile/，profile 返回 role/department_code/is_superuser
   */
  const getAuthInfo = async () => {
    try {
      const res = await authAPI.getCurrentUserProfile()
      if (res) {
        const userData: AuthInfo = {
          auth_id: res.auth_id,
          auth_username: res.auth_username,
          isactive: res.auth_is_active,
        }
        authInfo.value = userData
        setEncryptedToken('authInfo', JSON.stringify(userData))
        // RBAC 权威字段来自 profile（后端 DR-1 resolve_role_info 唯一实现）
        userRole.value = (res.role as string) || DEFAULT_ROLE
        userDepartmentCode.value = (res.department_code as string) || null
        isSuperuser.value = res.is_superuser === true
        isLoggedIn.value = true
        void loadMyPermissions()
      }
    } catch {
      silentLogout()
      throw new Error('获取用户信息失败')
    }
  }

  /**
   * 加载当前用户的权限码列表与数据范围
   * @description 调用 GET /api/v1/auth/my-permissions/
   */
  const loadMyPermissions = async (): Promise<void> => {
    if (_permPromise) return _permPromise
    _permPromise = (async () => {
      permissionsLoaded.value = false
      try {
        const res = await permissionsAPI.getMyPermissions()
        permissions.value = res.permissions
        dataScope.value = res.data_scope
        setEncryptedToken('myPermissions', JSON.stringify(res))
        permissionsLoaded.value = true
      } catch (error) {
        console.error('加载权限失败:', error)
        permissions.value = []
        dataScope.value = null
        ElMessage.warning('权限加载失败，部分功能可能不可用')
      } finally {
        _permPromise = null
      }
    })()
    return _permPromise
  }

  return {
    // 状态
    authInfo,
    isLoggedIn,
    access_token,
    refresh_token,
    userRole,
    userDepartmentCode,
    isSuperuser,
    permissions,
    dataScope,
    permissionsLoaded,
    authInitialized,

    // 操作方法
    login,
    logout,
    silentLogout,
    initAuthState,
    updateAuthInfo,
    getAuthInfo,
    loadMyPermissions,
  }
})
