// app.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // 应用状态
  const loading = ref(false)
  const sidebarCollapsed = ref(false)
  const breadcrumbs = ref<Array<{ name: string; path?: string }>>([])
  const pageTitle = ref('资产管理系统')

  // 主题设置
  const theme = ref<'light' | 'dark'>('light')
  const primaryColor = ref('#409EFF')

  // 系统设置
  const settings = ref({
    showBreadcrumbs: true,
    autoSave: true,
    pageSize: 20,
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

  const setPrimaryColor = (color: string) => {
    primaryColor.value = color
    localStorage.setItem('primaryColor', color)

    // 动态设置CSS变量
    document.documentElement.style.setProperty('--el-color-primary', color)
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

    // 恢复主色调
    const savedColor = localStorage.getItem('primaryColor')
    if (savedColor) {
      setPrimaryColor(savedColor)
    }

    // 恢复应用设置
    const savedSettings = localStorage.getItem('appSettings')
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings)
        settings.value = { ...settings.value, ...parsedSettings }
      } catch (error) {
        console.error('恢复应用设置失败:', error)
      }
    }
  }

  // 重置应用状态
  const resetAppState = () => {
    loading.value = false
    sidebarCollapsed.value = false
    breadcrumbs.value = []
    pageTitle.value = '资产管理系统'
    theme.value = 'light'
    primaryColor.value = '#409EFF'
    settings.value = {
      showBreadcrumbs: true,
      autoSave: true,
      pageSize: 20,
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
