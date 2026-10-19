/**
 * @file dashboardStatusGroups 状态分组漂移守卫（BF-110 / AUD-09 ③）
 * @description 三条不变量，防止分组定义与状态机单一来源（ASSET_STATUS_MAP / STATUS_COLOR_MAP）脱钩：
 *   1. STATUS_GROUPS.items 并集 ≡ ASSET_STATUS_MAP 键集（8 态，无缺漏/无多余）
 *   2. CHART_ORDER ≡ 同键集（图表渲染顺序覆盖全部状态）
 *   3. 三组色 ≡ STATUS_COLOR_MAP 对应键（禁止游离 hex——若有人改映射表而漏改分组即红）
 */
import { describe, it, expect } from 'vitest'
import { STATUS_GROUPS, CHART_ORDER } from '../dashboardStatusGroups'
import { ASSET_STATUS_MAP, STATUS_COLOR_MAP } from '@/utils/statusMapping'

describe('dashboardStatusGroups 漂移守卫（BF-110 ③）', () => {
  it('items 并集 ≡ ASSET_STATUS_MAP 键集（8/8）', () => {
    const items = Object.values(STATUS_GROUPS).flatMap((g) => [...g.items])
    expect([...items].sort()).toEqual(Object.keys(ASSET_STATUS_MAP).sort())
    expect(items).toHaveLength(8)
  })

  it('CHART_ORDER 与状态机键集同集合（8 态排序口径一致）', () => {
    expect([...CHART_ORDER].sort()).toEqual(Object.keys(ASSET_STATUS_MAP).sort())
  })

  it('三组色 ≡ STATUS_COLOR_MAP 对应键（单一来源，防颜色漂移）', () => {
    expect(STATUS_GROUPS.normal.color).toBe(STATUS_COLOR_MAP.success)
    expect(STATUS_GROUPS.abnormal.color).toBe(STATUS_COLOR_MAP.warning)
    expect(STATUS_GROUPS.scrap.color).toBe(STATUS_COLOR_MAP.info)
  })
})
