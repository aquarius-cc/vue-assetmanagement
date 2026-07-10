// guards.ts
// 路由守卫配置
import type { Router , RouteLocationNormalized} from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { getDecryptedToken } from '@/utils/tokenCrypto'
import { ElMessage } from 'element-plus'

// 不需要认证的页面白名单
const whiteList = ['/login']

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
const generateBreadcrumbs = (route: RouteLocationNormalized) => {  // 【修改】any → RouteLocationNormalized
  const breadcrumbs: Array<{ name: string; path: string }> = []     // 【新增】为 breadcrumbs 添加类型

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
      // 子路由...
      basicassetdetails: '基本信息',
      assetform: '资产录入',
      // 其他需要的...
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
