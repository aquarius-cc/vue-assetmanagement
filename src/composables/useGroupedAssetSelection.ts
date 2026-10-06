/**
 * @file 分组级联三态选择 Composable
 * @module composables/useGroupedAssetSelection
 * @description
 *   F2 子职责 2：从 useGroupedAssetList 按职责拆分而来（FR-6）。
 *   承载「组级三态 ↔ 明细行选择」的双向同步，选中集为 asset_code 平铺数组。
 *
 *   核心契约：
 *   - 级联方向：组勾选 → 该组 `asset_codes` 全入选中集；明细勾选 → 反推组三态
 *   - 数量语义：`asset_count` 为权威分母，`asset_codes` 为权威成员清单，
 *     前端零计算（I-1），故 `asset_count === 0` 的组恒为未选
 *   - 平铺留存：选中集按 asset_code 存储，跨汇总翻页 / 筛选条件保持不变
 *
 * @callers
 *   - composables/useGroupedAssetList: 分组展开表格列表状态（F2 主入口）
 */
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { AssetGroupSummary } from '@/types/asset'

/** 选择 Composable 返回值 */
export interface GroupedAssetSelectionReturn {
  selectedCodes: Ref<string[]>
  selectedGroupKeys: ComputedRef<string[]>
  isGroupChecked: (groupKey: string) => boolean
  isGroupIndeterminate: (groupKey: string) => boolean
  toggleGroupSelection: (groupKey: string) => void
  setGroupSelection: (groupKey: string, assetCodes: string[]) => void
  isRowSelected: (assetCode: string) => boolean
  toggleRowSelection: (assetCode: string) => void
  clearSelection: () => void
}

/**
 * 分组级联三态选择 Composable
 *
 * @param summaries 当前页汇总行（只读快照，键域与展开态一致）
 *
 * @example
 * ```ts
 * const { toggleGroupSelection, selectedCodes } = useGroupedAssetSelection(summaries)
 * ```
 */
export function useGroupedAssetSelection(
  summaries: Ref<AssetGroupSummary[]>,
): GroupedAssetSelectionReturn {
  const selectedCodes = ref<string[]>([])

  /** group_key -> 汇总行；重算型快照，仅覆盖当前页 */
  const summaryIndex = computed(() => new Map(summaries.value.map((row) => [row.group_key, row])))

  const isRowSelected = (assetCode: string): boolean => selectedCodes.value.includes(assetCode)

  /** 全选态：该组 asset_codes 全部在选中集内 */
  const isGroupChecked = (groupKey: string): boolean => {
    const row = summaryIndex.value.get(groupKey)
    if (!row || row.asset_count === 0) return false
    return row.asset_codes.every(isRowSelected)
  }

  /** 半选（indeterminate）：成员部分已选但非全选 */
  const isGroupIndeterminate = (groupKey: string): boolean => {
    const row = summaryIndex.value.get(groupKey)
    if (!row || row.asset_count === 0 || isGroupChecked(groupKey)) return false
    return row.asset_codes.some(isRowSelected)
  }

  /** 组级切换：半选 / 未选 → 全选该组 asset_codes；已全选 → 清空该组 */
  const toggleGroupSelection = (groupKey: string): void => {
    const row = summaryIndex.value.get(groupKey)
    if (!row) return
    if (isGroupChecked(groupKey)) {
      const codes = new Set(selectedCodes.value)
      row.asset_codes.forEach((code) => codes.delete(code))
      selectedCodes.value = [...codes]
      return
    }
    selectedCodes.value = [...new Set([...selectedCodes.value, ...row.asset_codes])]
  }

  /**
   * 以明细侧实际勾选为准，重建该组的选中态（明细 → 汇总 反向同步）
   *
   * 只改动本组成员在平铺集中的去留，**不触碰其他组**的选中态。
   */
  const setGroupSelection = (groupKey: string, assetCodes: string[]): void => {
    const row = summaryIndex.value.get(groupKey)
    if (!row) return
    const incoming = new Set(assetCodes)
    const next = new Set(selectedCodes.value)
    row.asset_codes.forEach((code) => {
      if (incoming.has(code)) {
        next.add(code)
      } else {
        next.delete(code)
      }
    })
    selectedCodes.value = [...next]
  }

  const toggleRowSelection = (assetCode: string): void => {
    selectedCodes.value = isRowSelected(assetCode)
      ? selectedCodes.value.filter((code) => code !== assetCode)
      : [...selectedCodes.value, assetCode]
  }

  const clearSelection = (): void => {
    selectedCodes.value = []
  }

  const selectedGroupKeys = computed(() =>
    summaries.value.filter((row) => isGroupChecked(row.group_key)).map((row) => row.group_key),
  )

  return {
    selectedCodes,
    selectedGroupKeys,
    isGroupChecked,
    isGroupIndeterminate,
    toggleGroupSelection,
    setGroupSelection,
    isRowSelected,
    toggleRowSelection,
    clearSelection,
  }
}
