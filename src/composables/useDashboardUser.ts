/**
 * @file Dashboard 用户会话信息（用户信息映射、退出登录）
 * @module composables/useDashboardUser
 * @exports
 *   - useDashboardUser: Dashboard 用户会话 composable
 *   - LOGIN_START_TIME_KEY: 登录时长起始时间键（退出登录时清理）
 * @callers
 *   - composables/useDashboardPage: Dashboard 聚合 composable
 * @dependsOn
 *   - stores/auth: 认证状态 store
 *   - types/authuser: 认证信息类型
 */
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { AuthInfo } from '@/types/authuser'
import { logError } from '@/utils/logger'

export const LOGIN_START_TIME_KEY = 'loginStartTime'

export function useDashboardUser() {
  const authStore = useAuthStore()

  const authInfo = computed(() => {
    const info = authStore.authInfo as AuthInfo | undefined
    if (!info) {
      return { real_name: '暂无用户', auth_name: '暂无管理员用户名' }
    }
    return {
      real_name: info.auth_username || '暂无用户',
      auth_name: info.auth_username || '暂无管理员用户名',
      isactive: info.isactive || false,
    }
  })

  const isLoggingOut = ref(false)
  const logout = async () => {
    if (isLoggingOut.value) return
    isLoggingOut.value = true
    try {
      sessionStorage.removeItem(LOGIN_START_TIME_KEY)
      await authStore.logout()
      location.reload()
    } catch (error) {
      logError('composables/useDashboardUser', '退出登录失败:', error)
      location.reload()
    } finally {
      isLoggingOut.value = false
    }
  }

  return { authInfo, logout }
}
