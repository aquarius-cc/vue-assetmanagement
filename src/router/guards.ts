/**
 * @file 路由守卫配置，包含认证检查、RBAC 角色权限校验与面包屑导航生成
 * @module src/router/guards
 * @exports
 *   - setupAuthGuard: 注册路由全局前置守卫与后置钩子
 * @callers
 *   - @/router/index
 * @dependsOn
 *   - vue-router (Router, RouteLocationNormalized)
 *   - @/stores/auth, @/stores/app
 *   - @/utils/tokenCrypto (getDecryptedToken)
 *   - element-plus (ElMessage)
 */

import type { Router, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { getDecryptedToken } from '@/utils/tokenCrypto'
import { decodeJWTPayload } from '@/utils/decodeJwt'
import { ElMessage } from 'element-plus'
import { ROLE_CODES } from '@/constants/roles'

// 不需要认证的页面白名单
const whiteList = ['/login']

// RBAC 路由-角色白名单
// key: 路由路径前缀, value: 允许访问的角色列表
// 未列出的路由默认所有已认证角色可访问
const roleWhitelist: Record<string, string[]> = {
  // 系统配置：仅系统管理员
  '/main/assettypedetails': [ROLE_CODES.SYSTEM_ADMIN],
  '/main/storagedetails': [ROLE_CODES.SYSTEM_ADMIN],
  '/main/contractdetails': [ROLE_CODES.SYSTEM_ADMIN],
  '/main/userdetails': [ROLE_CODES.SYSTEM_ADMIN],
  '/main/departmentdetails': [ROLE_CODES.SYSTEM_ADMIN],
  '/main/system': [ROLE_CODES.SYSTEM_ADMIN],
  // 报废审批：部门经理及以上
  '/main/damagedassetdetails': [ROLE_CODES.SYSTEM_ADMIN, ROLE_CODES.DEPT_MANAGER],
  '/main/damagedassetbasicdetails': [ROLE_CODES.SYSTEM_ADMIN, ROLE_CODES.DEPT_MANAGER],
  // 未登记资产：部门经理及以上
  '/main/unregisteredassetdetails': [ROLE_CODES.SYSTEM_ADMIN, ROLE_CODES.DEPT_MANAGER],
  '/main/unregisteredassetbasicdetails': [ROLE_CODES.SYSTEM_ADMIN, ROLE_CODES.DEPT_MANAGER],
  // 审计日志：审计员或管理员
  '/main/auditlogdetails': [ROLE_CODES.SYSTEM_ADMIN, ROLE_CODES.AUDITOR],
  // ====== 资产操作路由（资产管理员及以上） ======
  '/assets/recycle': [ROLE_CODES.SYSTEM_ADMIN, ROLE_CODES.DEPT_MANAGER, ROLE_CODES.ASSET_ADMIN],
  '/assets/repair': [ROLE_CODES.SYSTEM_ADMIN, ROLE_CODES.DEPT_MANAGER, ROLE_CODES.ASSET_ADMIN],
  '/assets/scrap': [ROLE_CODES.SYSTEM_ADMIN, ROLE_CODES.DEPT_MANAGER, ROLE_CODES.ASSET_ADMIN],
  '/assets/lost': [ROLE_CODES.SYSTEM_ADMIN, ROLE_CODES.DEPT_MANAGER, ROLE_CODES.ASSET_ADMIN],
  '/assets/found': [ROLE_CODES.SYSTEM_ADMIN, ROLE_CODES.DEPT_MANAGER, ROLE_CODES.ASSET_ADMIN],
  '/assets/repair-done': [ROLE_CODES.SYSTEM_ADMIN, ROLE_CODES.DEPT_MANAGER, ROLE_CODES.ASSET_ADMIN],
  '/assets/repair-failed': [
    ROLE_CODES.SYSTEM_ADMIN,
    ROLE_CODES.DEPT_MANAGER,
    ROLE_CODES.ASSET_ADMIN,
  ],
  '/assets/mark-broken': [ROLE_CODES.SYSTEM_ADMIN, ROLE_CODES.DEPT_MANAGER, ROLE_CODES.ASSET_ADMIN],
}

/**
 * 从 JWT access_token 中解析是否超级管理员
 * 后端 Phase 7 清理后 JWT 不再包含 role 字段，超级管理员仅标记 is_superuser
 */
function isSuperuserFromToken(token: string | null): boolean {
  return decodeJWTPayload(token)?.is_superuser === true
}

/**
 * 检查用户角色是否允许访问目标路由
 * 超级管理员短路放行（JWT is_superuser=true）
 */
function checkRoleAccess(targetPath: string, userRole: string, isSuperuser: boolean): boolean {
  // 超级管理员拥有所有路由的访问权限
  if (isSuperuser) return true

  // 精确匹配：从最长前缀开始
  const sortedPrefixes = Object.keys(roleWhitelist).sort((a, b) => b.length - a.length)
  for (const prefix of sortedPrefixes) {
    if (targetPath.startsWith(prefix)) {
      return roleWhitelist[prefix].includes(userRole)
    }
  }
  return true // 未列出的路由默认放行
}

// 应用状态初始化标志（仅在首次路由守卫执行时初始化一次）
let appInitialized = false

// 设置路由守卫
export const setupAuthGuard = (router: Router) => {
  // 全局前置守卫
  router.beforeEach(async (to, _from) => {
    const authStore = useAuthStore()
    const appStore = useAppStore()

    // 仅首次执行时初始化应用状态（从 localStorage 恢复侧边栏、主题等设置）
    if (!appInitialized) {
      appStore.initAppState()
      appInitialized = true
    }

    // 设置页面加载状态
    appStore.setLoading(true)

    try {
      // 初始化用户状态（从本地存储恢复）
      // 注意：localStorage 中的 token 使用了 XOR 加密存储，
      // 直接读取 localStorage.getItem('access_token') 得到的是加密后的值，
      // 无法判断 token 是否有效。改用 getDecryptedToken 解密后判断。
      if (!authStore.authInfo && getDecryptedToken('access_token')) {
        authStore.initAuthState()
      }

      // 检查是否需要认证
      // 已登录用户访问 /login 时重定向到主页（必须在白名单检查之前）
      if (authStore.isLoggedIn && authStore.access_token && to.path === '/login') {
        return '/main'
      }

      // 不需要认证的页面直接放行（如扫码页 requiresAuth: false）
      if (to.meta.requiresAuth === false) {
        return true
      }

      if (whiteList.includes(to.path)) {
        // 在白名单中，直接放行
        return true
      }

      // 检查是否已登录
      if (authStore.isLoggedIn && authStore.access_token) {
        // 已登录，检查token是否有效
        try {
          // 如果没有用户信息，尝试获取
          if (!authStore.authInfo) {
            await authStore.getAuthInfo()
          }

          // [新增] 兜底加载权限：刷新页面走 initAuthState，权限可能未联网加载
          // permissions 为空且非管理员时，必须联网拉取，否则 hasPermission 全 false
          if (authStore.permissions.length === 0) {
            await authStore.loadMyPermissions()
          }

          // RBAC: 检查角色是否有权访问目标路由
          const isSuperuser = isSuperuserFromToken(authStore.access_token)
          if (!checkRoleAccess(to.path, authStore.userRole, isSuperuser)) {
            ElMessage.error('您没有权限访问该页面')
            return '/main' // 无权限则回首页
          }

          return true
        } catch (error) {
          // token无效，清除登录状态并重定向到登录页
          console.error('Token验证失败:', error)
          authStore.silentLogout()
          ElMessage.error('登录已过期，请重新登录')
          return '/login'
        }
      } else {
        // 未登录，重定向到登录页
        if (to.path !== '/login') {
          ElMessage.warning('请先登录')
          return '/login'
        }
        return true
      }
    } catch (error) {
      console.error('路由守卫错误:', error)
      return '/login'
    }
  })

  // 全局后置钩子
  router.afterEach((to) => {
    const appStore = useAppStore()

    // 设置页面标题
    if (to.meta?.title) {
      appStore.setPageTitle(to.meta.title as string)
    }

    // 设置面包屑导航
    const breadcrumbs = generateBreadcrumbs(to)
    appStore.setBreadcrumbs(breadcrumbs)

    // 关闭页面加载状态
    appStore.setLoading(false)
  })
}

// 生成面包屑导航
/**
 * 根据当前路由生成面包屑导航
 * @param route - 当前路由对象（标准化后的路由位置）
 * @returns 面包屑数组，每个元素包含名称和路径
 */
const generateBreadcrumbs = (route: RouteLocationNormalized) => {
  // 【修改】any → RouteLocationNormalized
  const breadcrumbs: Array<{ name: string; path: string }> = [] // 【新增】为 breadcrumbs 添加类型

  // 首页面包屑
  breadcrumbs.push({ name: '首页', path: '/main' })

  // 根据路由生成面包屑
  if (route.path !== '/main') {
    const pathSegments = route.path.split('/').filter(Boolean)

    const routeMap: Record<string, string> = {
      main: '首页',
      assetdetails: '资产管理',
      assettypedetails: '资产类型',
      storagedetails: '仓库管理',
      outassetdetails: '资产发放',
      recycleassetdetails: '资产回收',
      damagedassetdetails: '待报废资产',
      wasteassetdetails: '已报废资产',
      departmentdetails: '部门管理',
      userdetails: '用户管理',
      contractdetails: '合同管理',
      brokenassetdetails: '损坏资产',
      lostassetdetails: '遗失资产',
      foundassetdetails: '找回资产',
      repairassetdetails: '维修资产',
      unregisteredassetdetails: '未登记资产',
      operationlogdetails: '操作日志',
      auditlogdetails: '审计日志',
      harddisksndetails: '硬盘序列号',
      basicassetdetails: '基本信息',
      assetform: '资产录入',
      outassetbasicdetails: '出库详情',
      recycleassetbasicdetails: '回收详情',
      damagedassetbasicdetails: '报废详情',
      wasteassetbasicdetails: '已报废详情',
      unregisteredassetbasicdetails: '未登记详情',
      contractofdetails: '合同详情',
      harddisksnbasicdetails: '硬盘信息',
    }

    for (let i = 1; i < pathSegments.length; i++) {
      const segment = pathSegments[i]
      if (routeMap[segment]) {
        breadcrumbs.push({
          name: routeMap[segment],
          path: '/' + pathSegments.slice(0, i + 1).join('/'),
        })
      }
    }
  }

  return breadcrumbs
}
