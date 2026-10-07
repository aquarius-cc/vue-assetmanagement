/**
 * F4 composable 侧用例：src/composables/__tests__/useGroupedAssetColumns.spec.ts
 *
 * 以单元级断言隔离 F4 的纯函数与汇总列集：
 *   - shouldShowChildPagination：阈值边界（决策 6 / F5 用例 12）
 *   - displayContractCode：无合同哨兵组 null → "—"（决策 2 / Q-3 / F5 用例 6）
 *   - summaryColumns：汇总列语义标签回归（资产数量 / 单价区间）
 *
 * 组件侧（GroupedAssetTable.spec.ts）只断言整体文本渲染，无法隔离纯函数边界；
 * 本篇钉住 `>` 边界与 `??` 空值分支，防止相关变异在渲染断言下幸存。
 */
import { describe, it, expect } from 'vitest'
import {
  useGroupedAssetColumns,
  shouldShowChildPagination,
  displayContractCode,
  CHILD_PAGINATION_THRESHOLD,
  NULL_DISPLAY,
} from '../useGroupedAssetColumns'
import type { AssetGroupSummary } from '@/types/asset'

function makeSummary(overrides: Partial<AssetGroupSummary> = {}): AssetGroupSummary {
  return {
    group_key: '["HT2024-001","笔记本","ThinkPad X1","Lenovo"]',
    contract_code: 'HT2024-001',
    asset_name: '笔记本',
    asset_specification: 'ThinkPad X1',
    asset_brand: 'Lenovo',
    asset_count: 3,
    price_display: '¥12,000.00',
    asset_codes: ['ZC001', 'ZC002', 'ZC003'],
    ...overrides,
  }
}

describe('useGroupedAssetColumns · F4 composable', () => {
  describe('shouldShowChildPagination：阈值边界（决策 6）', () => {
    it('恰好等于阈值 100 时不显示（严格大于，非大于等于）', () => {
      expect(CHILD_PAGINATION_THRESHOLD).toBe(100)
      expect(shouldShowChildPagination(makeSummary({ asset_count: 100 }))).toBe(false)
    })

    it('阈值 +1（101）时显示', () => {
      expect(shouldShowChildPagination(makeSummary({ asset_count: 101 }))).toBe(true)
    })

    it('阈值 -1（99）与 0 时不显示', () => {
      expect(shouldShowChildPagination(makeSummary({ asset_count: 99 }))).toBe(false)
      expect(shouldShowChildPagination(makeSummary({ asset_count: 0 }))).toBe(false)
    })
  })

  describe('displayContractCode：无合同哨兵组（决策 2 / Q-3）', () => {
    it('null 映射为占位符 "—"，不返回裸 null', () => {
      expect(NULL_DISPLAY).toBe('—')
      expect(displayContractCode(null)).toBe('—')
    })

    it('非空合同号原样透传', () => {
      expect(displayContractCode('HT2024-001')).toBe('HT2024-001')
    })
  })

  describe('summaryColumns：汇总列语义标签回归', () => {
    it('数量列标注「资产数量」、金额列标注「单价区间」', () => {
      const { summaryColumns } = useGroupedAssetColumns()
      const labelByProp = Object.fromEntries(summaryColumns.map((col) => [col.prop, col.label]))
      expect(labelByProp.asset_count).toBe('资产数量')
      expect(labelByProp.price_display).toBe('单价区间')
    })
  })
})
