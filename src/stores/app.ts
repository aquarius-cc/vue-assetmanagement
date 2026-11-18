/**
 * @file 应用全局状态管理，包含主题、侧边栏、面包屑、系统设置等
 * @module stores/app
 * @exports
 *   - useAppStore: 应用全局状态 Store
 * @callers
 *   - views/MainView.vue
 *   - views/LogIn.vue
 *   - router/guards.ts
 *   - components/AsideMenu.vue
 * @dependsOn
 *   - 无外部依赖
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { logError } from '@/utils/logger'
import { DEFAULT_PAGE_SIZE } from '@/utils/pagination'

export const useAppStore = defineStore('app', () => {
  // 应用状态
  const loading = ref(false)
  const sidebarCollapsed = ref(false)
  const breadcrumbs = ref<Array<{ name: string; path?: string }>>([])
  const pageTitle = ref('资产管理系统')

  // 主题设置
  // [M-07/D4=B] 品牌主色为唯一主色常量（取消任意换肤，CSS 是主色唯一真源，TS 侧仅保留状态镜像）
  const BRAND_PRIMARY = '#2B5FD7'
  const theme = ref<'light' | 'dark'>('light')
  const primaryColor = ref(BRAND_PRIMARY)

  // 系统设置
  const settings = ref({
    showBreadcrumbs: true,
    autoSave: true,
    pageSize: DEFAULT_PAGE_SIZE,
    language: 'zh-CN',
  })

  // 操作方法
  const setLoading = (status: boolean) => {
    loading.value = status
  }

  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
    // 保存到本地存储
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed.value))
  }

  const setSidebarCollapsed = (collapsed: boolean) => {
    sidebarCollapsed.value = collapsed
    localStorage.setItem('sidebarCollapsed', String(collapsed))
  }

  const setBreadcrumbs = (crumbs: Array<{ name: string; path?: string }>) => {
    breadcrumbs.value = crumbs
  }

  const setPageTitle = (title: string) => {
    pageTitle.value = title
    // 更新浏览器标题
    document.title = `${title} - 资产管理系统`
  }

  const setTheme = (newTheme: 'light' | 'dark') => {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)

    // 统一使用 classList 方式，与 variables.css 和 dark.css 中的 html.dark 选择器一致
    const isDark = newTheme === 'dark'
    document.documentElement.classList.toggle('dark', isDark)
  }

  // [M-07/D4=B] 无参、单源：CSS 是主色唯一真源，TS 侧仅保留状态镜像；
  // 清理旧版用户遗留（内联样式优先级高于 CSS，不清会盖住 M-07 新色阶）
  const setPrimaryColor = () => {
    primaryColor.value = BRAND_PRIMARY
    document.documentElement.style.removeProperty('--el-color-primary')
    localStorage.removeItem('primaryColor')
  }

  const updateSettings = (newSettings: Partial<typeof settings.value>) => {
    settings.value = { ...settings.value, ...newSettings }
    localStorage.setItem('appSettings', JSON.stringify(settings.value))
  }

  // 初始化应用状态
  const initAppState = () => {
    // 恢复侧边栏状态
    const savedSidebarState = localStorage.getItem('sidebarCollapsed')
    if (savedSidebarState !== null) {
      sidebarCollapsed.value = savedSidebarState === 'true'
    }

    // 恢复主题设置
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark'
    if (savedTheme) {
      setTheme(savedTheme)
    }

    // 恢复主色调（[M-07/D4=B] 取消任意换肤：无条件收敛品牌色，setPrimaryColor 顺带清旧键与内联变量）
    setPrimaryColor()

    // 恢复应用设置
    const savedSettings = localStorage.getItem('appSettings')
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings)
        settings.value = { ...settings.value, ...parsedSettings }
      } catch (error) {
        logError('stores/app', '恢复应用设置失败', error)
      }
    }
  }

  // 重置应用状态（C7/M-08：状态复位收敛走 setter 单源——setTheme 撤除 html.dark class、
  // setPrimaryColor（M-07/D4=B 无参形态）清理旧内联 --el-color-primary 与旧键；title 直接
  // 赋值，不走 setPageTitle 防回环拼接）
  const resetAppState = () => {
    setLoading(false)
    setSidebarCollapsed(false)
    breadcrumbs.value = []
    pageTitle.value = '资产管理系统'
    setTheme('light')
    setPrimaryColor()
    settings.value = {
      showBreadcrumbs: true,
      autoSave: true,
      pageSize: DEFAULT_PAGE_SIZE,
      language: 'zh-CN',
    }

    // 清除本地存储
    localStorage.removeItem('sidebarCollapsed')
    localStorage.removeItem('theme')
    localStorage.removeItem('primaryColor')
    localStorage.removeItem('appSettings')
  }

  return {
    // 状态
    loading,
    sidebarCollapsed,
    breadcrumbs,
    pageTitle,
    theme,
    primaryColor,
    settings,

    // 操作方法
    setLoading,
    toggleSidebar,
    setSidebarCollapsed,
    setBreadcrumbs,
    setPageTitle,
    setTheme,
    setPrimaryColor,
    updateSettings,
    initAppState,
    resetAppState,
  }
})
