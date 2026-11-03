/**
 * useGroupedAssetSelection 单元 spec（OP-07，FR-6 榜单 77 行件）
 *
 * 锚定面（消费方 useGroupedAssetList 组内组合，此处锚单元契约）：
 *   1. 组勾选 → 该组 asset_codes 全入选中集；已全选 → 仅清该组（不碰他组）
 *   2. asset_count===0 的组恒为未选（I-1：分母权威，平铺零计算）
 *   3. 半选态 = 部分成员在集但非全选
 *   4. setGroupSelection 明细反推：只动本组成员，他组留存
 *   5. toggleRowSelection / clearSelection 行级语义
 *   6. selectedGroupKeys 只列当前页全选组
 *   7. 平铺留存：summaries 整页替换后跨页选中不丢
 */
import { ref } from 'vue'
import { describe, it, expect } from 'vitest'

import { useGroupedAssetSelection } from '@/composables/useGroupedAssetSelection'
import type { AssetGroupSummary } from '@/types/asset'

function row(group_key: string, asset_count: number, asset_codes: string[]): AssetGroupSummary {
  return { group_key, asset_count, asset_codes } as AssetGroupSummary
}

describe('useGroupedAssetSelection', () => {
  it('组勾选 → 全组入选；已全选再勾 → 仅清该组', () => {
    const sel = useGroupedAssetSelection(ref([row('g1', 2, ['A1', 'A2']), row('g2', 1, ['B1'])]))
    sel.toggleGroupSelection('g1')
    expect(sel.selectedCodes.value).toEqual(['A1', 'A2'])
    expect(sel.isGroupChecked('g1')).toBe(true)
    sel.toggleRowSelection('B1')
    sel.toggleGroupSelection('g1')
    expect(sel.selectedCodes.value).toEqual(['B1'])
    expect(sel.isGroupChecked('g2')).toBe(true)
  })

  it('asset_count===0 恒未选；未知组 toggle 无操作', () => {
    const sel = useGroupedAssetSelection(ref([row('g0', 0, [])]))
    sel.toggleGroupSelection('g0')
    expect(sel.isGroupChecked('g0')).toBe(false)
    expect(sel.isGroupIndeterminate('g0')).toBe(false)
    sel.toggleGroupSelection('no-such')
    expect(sel.selectedCodes.value).toEqual([])
  })

  it('半选态：部分成员在集但非全选', () => {
    const summaries = ref([row('g1', 2, ['A1', 'A2'])])
    const sel = useGroupedAssetSelection(summaries)
    expect(sel.isGroupIndeterminate('g1')).toBe(false)
    sel.toggleRowSelection('A1')
    expect(sel.isGroupIndeterminate('g1')).toBe(true)
    expect(sel.isGroupChecked('g1')).toBe(false)
    sel.toggleRowSelection('A2')
    expect(sel.isGroupChecked('g1')).toBe(true)
    expect(sel.isGroupIndeterminate('g1')).toBe(false)
  })

  it('setGroupSelection 明细反推：只动本组，他组留存', () => {
    const summaries = ref([row('g1', 2, ['A1', 'A2']), row('g2', 1, ['B1'])])
    const sel = useGroupedAssetSelection(summaries)
    sel.toggleGroupSelection('g2')
    sel.setGroupSelection('g1', ['A2'])
    expect(sel.selectedCodes.value.sort()).toEqual(['A2', 'B1'])
    expect(sel.isGroupChecked('g2')).toBe(true)
    expect(sel.isGroupIndeterminate('g1')).toBe(true)
  })

  it('行级 toggle 与 clearSelection', () => {
    const sel = useGroupedAssetSelection(ref([row('g1', 1, ['A1'])]))
    sel.toggleRowSelection('A1')
    expect(sel.isRowSelected('A1')).toBe(true)
    sel.toggleRowSelection('A1')
    expect(sel.isRowSelected('A1')).toBe(false)
    sel.toggleRowSelection('X1')
    expect(sel.isRowSelected('X1')).toBe(true)
    sel.clearSelection()
    expect(sel.selectedCodes.value).toEqual([])
  })

  it('selectedGroupKeys 只列当前页全选组', () => {
    const summaries = ref([row('g1', 1, ['A1']), row('g2', 1, ['B1'])])
    const sel = useGroupedAssetSelection(summaries)
    sel.toggleGroupSelection('g1')
    expect(sel.selectedGroupKeys.value).toEqual(['g1'])
  })

  it('平铺留存：整页 summaries 替换后跨页选中不丢', () => {
    const summaries = ref([row('g1', 1, ['A1'])])
    const sel = useGroupedAssetSelection(summaries)
    sel.toggleGroupSelection('g1')
    summaries.value = [row('g9', 1, ['Z9'])]
    expect(sel.isRowSelected('A1')).toBe(true)
    expect(sel.selectedGroupKeys.value).toEqual([])
  })
})
