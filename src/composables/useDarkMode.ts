/**
 * @file 暗色模式切换（单例），通过 CSS 变量驱动，持久化到 localStorage
 * @module composables/useDarkMode
 * @exports
 *   - useDarkMode: 暗色模式 composable（isDark / toggleDark / setDark）
 * @callers
 *   - components/DarkModeToggle.vue
 * @dependsOn
 *   - vue: ref / watch
 */
import { ref, watch } from 'vue'

// ===== 模块级单例 — 只执行一次 =====

const isDark = ref(false)

// 应用暗色模式到 HTML 元素
const applyDarkMode = () => {
  if (typeof window === 'undefined') return

  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// 初始化：检查系统偏好或本地存储
const initDarkMode = () => {
  if (typeof window === 'undefined') return

  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
  if (savedTheme) {
    isDark.value = savedTheme === 'dark'
  } else {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  applyDarkMode()
}

// 监听 isDark 变化（替代 toggleDark/setDark 中的显式 applyDarkMode 调用）
watch(isDark, applyDarkMode)

// 监听系统偏好变化（全局只注册一次）
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleChange = (e: MediaQueryListEvent) => {
    if (!localStorage.getItem('theme')) {
      isDark.value = e.matches
    }
  }
  mediaQuery.addEventListener('change', handleChange)
}

// 初始化
initDarkMode()

// ===== 公开 API =====

// 切换暗色模式
const toggleDark = () => {
  isDark.value = !isDark.value
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  }
}

// 设置暗色模式
const setDark = (value: boolean) => {
  isDark.value = value
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('theme', value ? 'dark' : 'light')
  }
}

/**
 * 暗色模式 composable
 * @returns { isDark, toggleDark, setDark }
 */
export function useDarkMode() {
  return {
    isDark,
    toggleDark,
    setDark,
  }
}
