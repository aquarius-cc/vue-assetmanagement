/**
 * B 批 · 分组筛选键白名单单一来源断言
 *
 * 本用例是后端 `test_pass_through_filters_match_summary_endpoint`（键集等值）的
 * 前端孪生：后端扩/减 `PASS_THROUGH_FILTER_PATHS` 时，前端白名单若不同步，
 * 后果是「筛选对组内明细失效」→ 明细数与汇总 `asset_count` 漂移（AC-67f），
 * 或「多传键被 DRF 静默丢弃」→ 筛选无声失效。两侧各有断言才能夹住漂移。
 */
import { describe, expect, it } from 'vitest'

import {
  GROUPED_FIELD_DROP_KEYS,
  GROUPED_FILTER_KEY_MAP,
  GROUPED_PASS_THROUGH_KEYS,
  fromGroupedFilters,
  isGroupedFieldDropped,
  toGroupedFilters,
} from '../assetGroupedFilters'

/** 与后端 AssetGroupedSelector.PASS_THROUGH_FILTER_PATHS 逐字相等（9 键） */
const BACKEND_PASS_THROUGH_KEYS = [
  'asset_current_status',
  'asset_type_recordcode',
  'asset_storage_recordcode',
  'asset_type_category',
  'asset_code',
  'asset_name',
  'asset_brand',
  'asset_specification',
  'asset_contract_name',
]

describe('assetGroupedFilters', () => {
  it('透传白名单与后端 PASS_THROUGH_FILTER_PATHS 键集逐字相等（9 键）', () => {
    expect([...GROUPED_PASS_THROUGH_KEYS].sort()).toEqual([...BACKEND_PASS_THROUGH_KEYS].sort())
  })

  it('白名单不含 contract_code / no_contract（R-1：二者已由 group_key 表达）', () => {
    expect(GROUPED_PASS_THROUGH_KEYS).not.toContain('contract_code')
    expect(GROUPED_PASS_THROUGH_KEYS).not.toContain('no_contract')
    expect(GROUPED_PASS_THROUGH_KEYS).toHaveLength(9)
  })

  it('键映射 = 9 键同名透传 + 唯一改名键 asset_contract → contract_code', () => {
    expect(GROUPED_FILTER_KEY_MAP.asset_contract).toBe('contract_code')
    GROUPED_PASS_THROUGH_KEYS.forEach((key) => {
      expect(GROUPED_FILTER_KEY_MAP[key]).toBe(key)
    })
    expect(Object.keys(GROUPED_FILTER_KEY_MAP)).toHaveLength(10)
  })

  it('映射表不含 no_contract：汇总哨兵筛选无 SearchBar 键（AC-67h 冲突路径 UI 不可达）', () => {
    expect(Object.keys(GROUPED_FILTER_KEY_MAP)).not.toContain('no_contract')
  })

  it('分组 UI 剔除 asset_type_category（与 recordcode 同表近义，避免矛盾组合得空集）', () => {
    expect([...GROUPED_FIELD_DROP_KEYS]).toEqual(['asset_type_category'])
    expect(isGroupedFieldDropped('asset_type_category')).toBe(true)
    expect(isGroupedFieldDropped('asset_type_recordcode')).toBe(false)
    expect(isGroupedFieldDropped('asset_code')).toBe(false)
  })

  // ===== AC-67j 补强：双向映射（SearchBar 回填）=====
  it('反向映射：contract_code → asset_contract，同名键透传', () => {
    expect(fromGroupedFilters({ contract_code: 'HT1', asset_name: '显示器' })).toEqual({
      asset_contract: 'HT1',
      asset_name: '显示器',
    })
  })

  it('非 UI 键忽略：page / page_size / no_contract / 未知键 / asset_type_category', () => {
    const result = fromGroupedFilters({
      page: 2,
      page_size: 20,
      no_contract: true,
      asset_type_category: 'AT_W2',
      unknown_key: 'x',
      asset_code: 'ZC001',
    })
    expect(result).toEqual({ asset_code: 'ZC001' })
  })

  it('往返一致（限 UI 可见键子集）', () => {
    const ui = { asset_name: '显示器', asset_contract: 'HT1', asset_code: 'ZC001' }
    expect(fromGroupedFilters(toGroupedFilters(ui))).toEqual(ui)
  })
})
