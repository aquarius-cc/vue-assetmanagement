import { ref, watch } from 'vue'

/**
 * 暗色模式切换 composable
 * 使用 CSS 变量驱动暗色模式，符合 F13 规范
 */
export function useDarkMode() {
  const isDark = ref(false)

  // 初始化：检查系统偏好或本地存储
  const initDarkMode = () => {
    if (typeof window === 'undefined') return

    // 检查本地存储
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      isDark.value = savedTheme === 'dark'
    } else {
      // 检查系统偏好
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    applyDarkMode()
  }

  // 应用暗色模式到 HTML 元素
  const applyDarkMode = () => {
    if (typeof document === 'undefined') return

    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // 切换暗色模式
  const toggleDark = () => {
    isDark.value = !isDark.value
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
    }
    applyDarkMode()
  }

  // 设置暗色模式
  const setDark = (value: boolean) => {
    isDark.value = value
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', value ? 'dark' : 'light')
    }
    applyDarkMode()
  }

  // 监听变化
  watch(isDark, applyDarkMode)

  // 监听系统偏好变化
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        isDark.value = e.matches
        applyDarkMode()
      }
    }
    mediaQuery.addEventListener('change', handleChange)
  }

  // 初始化
  initDarkMode()

  return {
    isDark,
    toggleDark,
    setDark,
  }
}
