/**
 * @file 用户认证 Store，负责登录、登出、Token 管理与 RBAC 角色解析
 * @module stores/auth
 * @exports
 *   - useAuthStore: 用户认证状态 Store
 * @callers
 *   - views/LogIn.vue
 *   - router/guards.ts
 *   - composables/usePermission.ts
 *   - composables/useDashboardPage.ts
 * @dependsOn
 *   - api/auth: 登录、登出、获取用户信息 API
 *   - utils/tokenCrypto: Token 加密存储工具
 *   - types/authuser: 认证相关类型定义
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authAPI } from '@/api/auth'
import { ElMessage } from 'element-plus'
import type { LoginForm, AuthInfo } from '@/types/authuser'
import { setEncryptedToken, getDecryptedToken, clearAllAuthTokens } from '@/utils/tokenCrypto'
import { permissionsAPI } from '@/api/permissions'
import type { DataScope } from '@/types/permission'
import { DEFAULT_ROLE } from '@/constants/roles'
import { decodeJWTPayload } from '@/utils/decodeJwt'

export const useAuthStore = defineStore('AuthUser', () => {
  const authInfo = ref<AuthInfo | null>(null) // 认证用户信息
  const isLoggedIn = ref(false) // 登录状态
  const access_token = ref<string | null>(null) // 访问令牌
  const refresh_token = ref<string | null>(null) // 刷新令牌
  const userRole = ref<string>(DEFAULT_ROLE) // RBAC 角色
  const userDepartmentCode = ref<string | null>(null) // RBAC 部门编码

  // ===== 新增：RBAC 权限码与数据范围 =====
  const permissions = ref<string[]>([]) // 权限码列表，如 ['asset:read', 'asset:create']
  const dataScope = ref<DataScope | null>(null) // 数据范围

  // 防重入：避免并发请求重复加载权限（修复竞态漏洞 2）
  let _permPromise: Promise<void> | null = null

  /**
   * 用户登录
   * @param loginData 登录表单数据 (LoginForm)
   * @returns 登录结果 { success: boolean, message?: string }
   */
  const login = async (loginData: LoginForm) => {
    try {
      // 调用登录 API，传递 auth_username 和 password
      const response = await authAPI.login({
        auth_username: loginData.auth_username,
        password: loginData.password,
      })

      // 根据后端 API 响应格式解析数据
      // 后端返回结构: { code, message, data: { user, access, refresh } }
      // 成功条件：code === 0（AGENTS.md §3 跨端契约）
      const isSuccess = response.code === 0

      if (isSuccess) {
        // 构建 AuthInfo 对象用于本地存储
        const authUserData: AuthInfo = {
          auth_id: response.data.user.auth_id,
          auth_username: response.data.user.auth_username,
          isactive: response.data.user.auth_is_active,
        }

        // 更新状态
        authInfo.value = authUserData
        isLoggedIn.value = true
        access_token.value = response.data.access
        refresh_token.value = response.data.refresh

        // RBAC: 从 JWT 中解析 role + department_code
        const payload = decodeJWTPayload(response.data.access)
        if (payload) {
          userRole.value = (payload.role as string) || DEFAULT_ROLE
          userDepartmentCode.value = (payload.department_code as string) || null
        }

        // 持久化存储认证信息（使用加密存储，与token一致）
        setEncryptedToken('authInfo', JSON.stringify(authUserData))
        setEncryptedToken('access_token', response.data.access)
        setEncryptedToken('refresh_token', response.data.refresh)

        // [新增] 登录成功后加载权限（不 await，避免阻塞登录返回）
        // 权限加载失败不影响登录，由 loadMyPermissions 内部降级处理
        void loadMyPermissions()
        // 注意：不再调用 ElMessage.success()，由调用方（LogIn.vue）统一处理成功提示
        return { success: true, message: '登录成功' }
      } else {
        const errorMessage = response.message || '登录失败'
        // 注意：不再调用 ElMessage.error()，由调用方（LogIn.vue）统一处理错误提示显示
        return { success: false, message: errorMessage }
      }
    } catch (error) {
      console.error('登录失败:', error)
      // 提取错误信息：优先从 Error.message 获取（authAPI 已提取后端 msg），其次从 AxiosError 获取
      let errorMessage = '登录失败，请检查用户名和密码或后端服务器状态'
      if (error instanceof Error) {
        // authAPI.login() 抛出的 Error 对象，message 已包含后端详细错误信息
        errorMessage = error.message || errorMessage
      } else if (error && typeof error === 'object' && 'response' in error) {
        // AxiosError：网络请求失败时的错误格式
        const axiosError = error as { response?: { data?: { message?: string } } }
        errorMessage = axiosError.response?.data?.message || errorMessage
      }
      // 注意：不再调用 ElMessage.error()，由调用方（LogIn.vue）统一处理错误提示显示
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 用户退出登录（完整流程）
   * @description 先调用后端 API 通知服务端作废 Token，再清除本地认证状态
   *
   * 流程:
   *   1. 获取当前 refresh_token（优先从内存，其次从加密存储）
   *   2. 调用后端 POST /api/auth/logout/ 接口作废 Token
   *   3. 无论接口成功或失败，都清除本地认证状态
   *   4. 显示退出结果消息
   *
   * 适用场景: 用户主动点击"退出"按钮
   */
  const logout = async () => {
    try {
      // 优先从内存中获取 refresh_token，若为空则从加密存储中读取
      const token = refresh_token.value || getDecryptedToken('refresh_token')

      if (token) {
        // 调用后端退出登录接口，通知服务端作废 Token
        await authAPI.logout(token)
        ElMessage.success('退出成功')
      } else {
        // 无 refresh_token，仅清除本地状态
        console.warn('退出登录时未找到 refresh_token，仅清除本地状态')
        ElMessage.success('已退出登录')
      }
    } catch (error) {
      // 后端接口调用失败（如网络异常、Token 已过期等）
      // 仍然清除本地状态，确保前端不会残留过期凭证
      console.error('退出登录接口异常，仍清除本地状态:', error)
      ElMessage.warning('退出登录时服务端通信异常，已清除本地状态')
    } finally {
      // 无论接口成功或失败，都必须清除本地认证状态
      authInfo.value = null
      isLoggedIn.value = false
      access_token.value = null
      refresh_token.value = null
      userRole.value = DEFAULT_ROLE
      userDepartmentCode.value = null
      // [新增] 清空权限状态
      permissions.value = []
      dataScope.value = null
      _permPromise = null
      clearAllAuthTokens() // 清除本地存储的认证信息
      localStorage.removeItem('authInfo')
      localStorage.removeItem('myPermissions') // [新增]清除本地缓存权限
    }
  }

  /**
   * 静默退出登录（仅清除本地状态）
   * @description 不调用后端 API，仅清除前端认证状态和存储
   *
   * 适用场景:
   *   - Token 过期/无效，路由守卫自动跳转登录页
   *   - 获取用户信息失败，需要强制退出
   *   - 网络断开等无法与后端通信的场景
   */
  const silentLogout = () => {
    authInfo.value = null
    isLoggedIn.value = false
    access_token.value = null
    refresh_token.value = null
    userRole.value = DEFAULT_ROLE
    userDepartmentCode.value = null
    // [新增] 清空权限状态
    permissions.value = []
    dataScope.value = null
    _permPromise = null
    clearAllAuthTokens() // 清除本地存储的认证信息
    localStorage.removeItem('authInfo')
    localStorage.removeItem('myPermissions') // [新增] 清除本地缓存权限
  }

  /**
   * 初始化认证状态
   * 从本地存储恢复认证信息，用于页面刷新后保持登录状态
   * @returns 是否成功恢复状态
   */
  const initAuthState = () => {
    // 使用加密方式读取authInfo（与token存储方式一致）
    const savedAuthInfoStr = getDecryptedToken('authInfo')
    const savedAccessToken = getDecryptedToken('access_token')
    const savedRefreshToken = getDecryptedToken('refresh_token')

    if (savedAuthInfoStr && savedAccessToken && savedRefreshToken) {
      try {
        authInfo.value = JSON.parse(savedAuthInfoStr)
        access_token.value = savedAccessToken
        refresh_token.value = savedRefreshToken
        isLoggedIn.value = true

        // [新增] 从本地缓存恢复权限（降级用，守卫会联网刷新）
        const savedPermsStr = getDecryptedToken('myPermissions')
        if (savedPermsStr) {
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

        // RBAC: 从存储的 access_token 中解析 role + department_code
        const payload = decodeJWTPayload(savedAccessToken)
        if (payload) {
          userRole.value = (payload.role as string) || DEFAULT_ROLE
          userDepartmentCode.value = (payload.department_code as string) || null
        }

        return true
      } catch (error) {
        console.error('恢复用户状态失败:', error)
        // 使用 silentLogout 而非 logout：
        // initAuthState 是页面刷新后从本地存储恢复状态时调用的，
        // 此时可能网络不可用或后端未启动，调用 logout() 会尝试请求后端作废 Token 导致失败。
        // silentLogout 仅清除本地认证状态，不调用后端 API，适用于网络异常等场景。
        silentLogout()
        return false
      }
    }
    return false
  }

  /**
   * 更新认证信息
   * @param newAuthInfo 新的认证信息（部分更新）
   */
  const updateAuthInfo = (newAuthInfo: Partial<AuthInfo>) => {
    if (authInfo.value) {
      authInfo.value = { ...authInfo.value, ...newAuthInfo }
      // 使用加密存储（与登录时一致）
      setEncryptedToken('authInfo', JSON.stringify(authInfo.value))
    }
  }

  // [HR-04] 已删除 changePassword 方法，原因：后端 /auth/change-password/ 端点已无效

  /**
   * 获取当前用户信息
   * @description 调用 GET /api/auth/profile/ 接口
   * @returns Promise<void>
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
        // 使用加密存储（与登录时一致）
        setEncryptedToken('authInfo', JSON.stringify(userData))
        // [新增] 登录成功后加载权限（不 await，避免阻塞登录返回）
        // 权限加载失败不影响登录，由 loadMyPermissions 内部降级处理
        void loadMyPermissions()
      }
    } catch {
      // 使用 silentLogout 而非 logout：
      // getAuthInfo 失败可能是token过期导致，此时logout API调用也会失败（401循环）
      // silentLogout 仅清除本地状态，不调用后端API
      silentLogout()
      throw new Error('获取用户信息失败')
    }
  }

  /**
   * 加载当前用户的权限码列表与数据范围
   * @description 调用 GET /api/v1/auth/my-permissions/
   *
   * 防重入：并发调用时复用同一个 Promise（修复竞态）
   * 降级策略：加载失败时 permissions 置空，不阻塞登录流程
   *
   * AR-3 合规说明：超时复用全局 TIMEOUT（request.ts:88），
   * 不单独重试——权限加载失败降级为空数组，避免登录卡死。
   */
  const loadMyPermissions = async (): Promise<void> => {
    if (_permPromise) return _permPromise
    _permPromise = (async () => {
      try {
        const res = await permissionsAPI.getMyPermissions()
        permissions.value = res.permissions
        dataScope.value = res.data_scope
        // 持久化到加密存储（仅作联网失败时的降级缓存）
        setEncryptedToken('myPermissions', JSON.stringify(res))
      } catch (error) {
        // 降级：权限置空，hasPermission 对非 superuser 全返回 false
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
    userRole, // RBAC 角色
    userDepartmentCode, // RBAC 部门编码
    permissions, // RBAC 权限码列表
    dataScope, // RBAC 数据范围

    // 操作方法
    login,
    logout, // 用户主动退出（调 API + 清本地）
    silentLogout, // 静默退出（仅清本地，供路由守卫等场景使用）
    initAuthState,
    updateAuthInfo,
    // [HR-04] 已移除 changePassword 导出，原因：后端端点已无效
    getAuthInfo,
    // [新增] 权限加载
    loadMyPermissions,
  }
})
