/**
 * @file useChartTheme 单元测试 — 从 CSS 变量读取设计令牌、适配亮/暗模式
 * @note 依据 CT-1：核心业务逻辑必须有测试覆盖。本 test 收口审查报告 #46 范围
 *       （useChartTheme 是 10 个具名 composable 中唯一缺专属 spec 的一个；
 *       useEmployeeLinkage 已由 useAssetFormHelpers.spec.ts:212 覆盖）。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useChartTheme } from '../useChartTheme'
import { useDarkMode } from '../useDarkMode'

/** 可控 CSS 变量池：测试内充当 `variables.css` 亮色令牌 */
let cssVars: Record<string, string>

/** 可控 getComputedStyle：返回真实 documentElement 样式快照的替身 */
const mockGetComputedStyle = () => ({
  getPropertyValue: (prop: string) => cssVars[prop] ?? '',
})

describe('useChartTheme', () => {
  beforeEach(() => {
    cssVars = {
      '--color-primary': '#2b5fd7',
      '--color-success': '#52c41a',
      '--color-warning': '#faad14',
      '--color-danger': '#ff4d4f',
      '--text-primary': '#303133',
      '--text-secondary': '#909399',
      '--border-color': '#e8e8e8',
      '--border-color-light': '#e4e7ed',
    }
    // happy-dom 的 getComputedStyle 对自定义属性返回空串，需手工置桩才能读到令牌
    vi.stubGlobal('getComputedStyle', mockGetComputedStyle)
    useDarkMode().setDark(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    useDarkMode().setDark(false)
  })

  it('读亮色令牌映射到各主题字段', () => {
    const { theme } = useChartTheme()
    expect(theme.value.textColor).toBe('#303133')
    expect(theme.value.axisText).toBe('#909399')
    expect(theme.value.borderColor).toBe('#e8e8e8')
    expect(theme.value.gridLine).toBe('#e4e7ed')
    expect(theme.value.lineColor).toBe('#2b5fd7')
    expect(theme.value.centerText).toBe('#303133')
  })

  it('pieColors 由功能色令牌组成并闭合扩展色', () => {
    const { theme } = useChartTheme()
    expect(theme.value.pieColors[0]).toBe('#2b5fd7')
    expect(theme.value.pieColors[1]).toBe('#52c41a')
    expect(theme.value.pieColors[2]).toBe('#faad14')
    expect(theme.value.pieColors[3]).toBe('#ff4d4f')
    expect(theme.value.pieColors).toHaveLength(6)
  })

  it('亮模式下 tooltip/分割线/面积图使用亮色系', () => {
    const { theme } = useChartTheme()
    expect(theme.value.tooltipBg).toBe('rgba(255,255,255,0.95)')
    expect(theme.value.dividerColor).toBe('#ffffff')
    expect(theme.value.lineAreaTop).toBe('rgba(59,130,246,0.25)')
    expect(theme.value.lineAreaBottom).toBe('rgba(59,130,246,0.02)')
  })

  it('切换暗色后 computed 重算，tooltip/分割线/面积图切换暗色系', () => {
    const { theme, isDark } = useChartTheme()
    useDarkMode().setDark(true)
    expect(isDark.value).toBe(true)
    expect(theme.value.tooltipBg).toBe('rgba(29,30,31,0.95)')
    expect(theme.value.dividerColor).toBe('#1d1e1f')
    expect(theme.value.lineAreaTop).toBe('rgba(74,144,226,0.25)')
    expect(theme.value.lineAreaBottom).toBe('rgba(74,144,226,0.02)')
  })

  it('CSS 变量缺失时回退到 FALLBACK 常量', () => {
    cssVars = {}
    const { theme } = useChartTheme()
    expect(theme.value.textColor).toBe('#303133')
    expect(theme.value.lineColor).toBe('#2B5FD7')
    expect(theme.value.pieColors[0]).toBe('#2B5FD7')
    expect(theme.value.pieColors[1]).toBe('#52C41A')
  })
})
