/**
 * F4 composable 侧用例：src/composables/__tests__/useGroupedAssetColumns.spec.ts
 *
 * 以单元级断言隔离 F4 的纯函数与汇总列集：
 *   - shouldShowChildPagination：页长边界（决策 6 / F5 用例 12，BF-073 修正后口径）
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
  describe('shouldShowChildPagination：页长边界（决策 6 / BF-073）', () => {
    it('恰好等于页长时不显示（严格大于，非大于等于）', () => {
      expect(shouldShowChildPagination(makeSummary({ asset_count: 20 }), 20)).toBe(false)
      expect(shouldShowChildPagination(makeSummary({ asset_count: 100 }), 100)).toBe(false)
    })

    it('页长 +1 时显示（默认页长 20 → 21 条组是缺口下界）', () => {
      expect(shouldShowChildPagination(makeSummary({ asset_count: 21 }), 20)).toBe(true)
      expect(shouldShowChildPagination(makeSummary({ asset_count: 101 }), 100)).toBe(true)
    })

    it('旧阈值档位 99 在默认页长 20 下显示（21~100 缺口修复的直接断言）', () => {
      expect(shouldShowChildPagination(makeSummary({ asset_count: 99 }), 20)).toBe(true)
      expect(shouldShowChildPagination(makeSummary({ asset_count: 50 }), 20)).toBe(true)
    })

    it('0 条组任何页长下都不显示', () => {
      expect(shouldShowChildPagination(makeSummary({ asset_count: 0 }), 20)).toBe(false)
      expect(shouldShowChildPagination(makeSummary({ asset_count: 0 }), 100)).toBe(false)
    })

    it('大页长吞掉中等组：页长 100 时 50 条组不显示（全量已在首屏）', () => {
      expect(shouldShowChildPagination(makeSummary({ asset_count: 50 }), 100)).toBe(false)
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
