/**
 * @file ECharts 图表主题 Composable — 从设计令牌（CSS 变量）读取颜色，适配亮/暗模式
 * @module composables/useChartTheme
 * @description
 *   纯读取层：通过 getComputedStyle 读取 variables.css 中定义的设计令牌，
 *   输出 ECharts option 所需的主题色对象。
 *   【关键】computed 体内必须消费 isDark.value（即使不使用其值），
 *   否则 getComputedStyle 非响应式调用会导致 computed 首次求值后永久缓存，
 *   暗色切换时图表颜色不会更新。
 * @callers
 *   - composables/useDashboardCharts.ts
 *   - composables/useDashboardPage.ts
 * @dependsOn
 *   - composables/useDarkMode.ts: 暗色模式单例
 */
import { computed } from 'vue'
import { useDarkMode } from '@/composables/useDarkMode'

export interface ChartTheme {
  textColor: string
  secondaryText: string
  axisText: string
  borderColor: string
  gridLine: string
  tooltipBg: string
  tooltipBorder: string
  dividerColor: string
  lineColor: string
  lineAreaTop: string
  lineAreaBottom: string
  pieColors: string[]
  centerText: string
  subText: string
}

const FALLBACK = {
  textPrimary: '#303133',
  textSecondary: '#909399',
  borderColor: '#e5e7eb',
  borderColorLight: '#e4e7ed',
  primary: '#2B5FD7',
  success: '#52C41A',
  warning: '#FAAD14',
  danger: '#FF4D4F',
}

const PIE_EXTRA = ['#8B5CF6', '#6B7280']

export function useChartTheme() {
  const { isDark } = useDarkMode()

  const theme = computed<ChartTheme>(() => {
    // 建立响应式依赖：isDark 变化时强制重算 getComputedStyle
    void isDark.value

    const s = getComputedStyle(document.documentElement)
    const get = (prop: string) => s.getPropertyValue(prop).trim()

    const primary = get('--color-primary') || FALLBACK.primary
    const success = get('--color-success') || FALLBACK.success
    const warning = get('--color-warning') || FALLBACK.warning
    const danger = get('--color-danger') || FALLBACK.danger

    return {
      textColor: get('--text-primary') || FALLBACK.textPrimary,
      secondaryText: get('--text-secondary') || FALLBACK.textSecondary,
      axisText: get('--text-secondary') || FALLBACK.textSecondary,
      borderColor: get('--border-color') || FALLBACK.borderColor,
      gridLine: get('--border-color-light') || FALLBACK.borderColorLight,
      tooltipBg: isDark.value ? 'rgba(29,30,31,0.95)' : 'rgba(255,255,255,0.95)',
      tooltipBorder: get('--border-color') || FALLBACK.borderColor,
      dividerColor: isDark.value ? '#1d1e1f' : '#ffffff',
      lineColor: primary,
      lineAreaTop: isDark.value ? 'rgba(74,144,226,0.25)' : 'rgba(59,130,246,0.25)',
      lineAreaBottom: isDark.value ? 'rgba(74,144,226,0.02)' : 'rgba(59,130,246,0.02)',
      pieColors: [primary, success, warning, danger, ...PIE_EXTRA],
      centerText: get('--text-primary') || FALLBACK.textPrimary,
      subText: get('--text-secondary') || FALLBACK.textSecondary,
    }
  })

  return { theme, isDark }
}
