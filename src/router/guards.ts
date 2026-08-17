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
import { ElMessage } from 'element-plus'
import { ROLE_CODES, ROLE_HIERARCHY } from '@/constants/roles'

// 不需要认证的页面白名单
const whiteList = ['/login']

// RBAC 路由-角色白名单
// key: 路由路径前缀, value: 允许访问的角色列表
// 未列出的路由默认所有已认证角色可访问
// 注意：静态路由的权限由 roleWhitelist 前缀匹配 + meta.requiredMinRole 双重保护
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
}

/**
 * 检查用户角色是否允许访问目标路由
 * 超级管理员短路放行（authStore.isSuperuser，cookie 通道来自 profile、bearer 来自 JWT）
 *
 * 优先读取 to.meta.requiredMinRole（静态声明），fallback 到 roleWhitelist 前缀匹配
 */
function checkRoleAccess(
  targetPath: string,
  userRole: string,
  isSuperuser: boolean,
  requiredMinRole?: string,
): boolean {
  // 超级管理员拥有所有路由的访问权限
  if (isSuperuser) return true

  // 优先使用 meta 声明（适用于含 :code 动态段的路由）
  if (requiredMinRole) {
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0
    const requiredLevel = ROLE_HIERARCHY[requiredMinRole] ?? 0
    return userLevel >= requiredLevel
  }

  // fallback: 静态路径前缀匹配（适用于系统配置等无动态段的路由）
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
      // 初始化用户状态（通道感知）：
      //   bearer 通道从加密 localStorage 恢复
      //   cookie 通道经 refresh 端点验证会话并获取 access，再拉 profile
      if (!authStore.authInitialized) {
        await authStore.initAuthState()
      }

      // 检查是否需要认证
      // 已登录用户访问 /login 时重定向到主页（必须在白名单检查之前）
      if (authStore.isLoggedIn && to.path === '/login') {
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

      // 检查是否已登录（cookie 通道 access_token 仅内存，isLoggedIn 为唯一判定依据）
      if (authStore.isLoggedIn && authStore.access_token) {
        // 已登录，检查token是否有效
        try {
          // 如果没有用户信息，尝试获取
          if (!authStore.authInfo) {
            await authStore.getAuthInfo()
          }

          // [N1] 权限未加载完成时必须联网拉取。
          // 用 permissionsLoaded 而非 permissions.length，区分"已加载但为空"
          // （如 regular_user 无角色，后端返回 []）与"未加载"（刷新后/登录后），
          // 避免空权限用户每次导航都重复请求
          if (!authStore.permissionsLoaded) {
            await authStore.loadMyPermissions()
          }

          // RBAC: 检查角色是否有权访问目标路由（isSuperuser 来自 authStore）
          if (
            !checkRoleAccess(
              to.path,
              authStore.userRole,
              authStore.isSuperuser,
              to.meta.requiredMinRole as string,
            )
          ) {
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
