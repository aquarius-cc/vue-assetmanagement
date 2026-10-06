/**
 * @file 资产分组展开表格列表状态 Composable
 * @module composables/useGroupedAssetList
 * @description
 *   F2 主入口：承载「汇总分页」并组合明细缓存与级联三态两个子职责。
 *   按 FR-6（Composable ≤200 逻辑行）拆为：
 *     - composables/useGroupChildrenCache  —— 展开态 + 组内明细分页缓存
 *     - composables/useGroupedAssetSelection —— 组级三态 ↔ 明细行选择
 *
 *   核心契约：
 *   - I-1 数量语义：`asset_count` ≡ `asset_codes.length` ≡ 组内明细条数，前端零计算
 *   - R-1 组键透传：`group_key` 原样回传，前端不解析、不重建、不补 null
 *   - 重置语义：筛选变更 / 汇总翻页 → 清空明细缓存 + 展开态；选中集按 asset_code 平铺留存
 *   - 单条组：`asset_count === 1` 自动展开（仅触发 F2，组件零特殊分支）
 *
 * @callers
 *   - components/assetmanagement/AssetGroupedExpandTable.vue（F3 表格组件，待落地）
 * @dependsOn
 *   - api/asset: getGroupedAssets / getGroupChildren（FR-3 API 收敛唯一入口）
 *   - composables/useGroupChildrenCache: 组内明细懒加载缓存
 *   - composables/useGroupedAssetSelection: 级联三态选择
 */
import { ref, type ComputedRef, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { assetAPI } from '@/api/asset'
import { logError } from '@/utils/logger'
import { useGroupChildrenCache } from './useGroupChildrenCache'
import { useGroupedAssetSelection } from './useGroupedAssetSelection'
import type { AssetDetail, AssetGroupQueryParams, AssetGroupSummary } from '@/types/asset'

/** 可配置的组尺寸（缺省值与后端分页默认值一致） */
export interface GroupedAssetListOptions {
  /** 汇总每页条数，默认 20 */
  pageSize?: number
  /** 组内每页条数，默认 20 */
  childPageSize?: number
}

/** Composable 返回值 */
export interface GroupedAssetListReturn {
  summaries: Ref<AssetGroupSummary[]>
  summaryTotal: Ref<number>
  summaryLoading: Ref<boolean>
  currentPage: Ref<number>
  pageSize: Ref<number>
  childPageSize: Ref<number>
  expandedKeys: Ref<string[]>
  selectedCodes: Ref<string[]>
  selectedGroupKeys: ComputedRef<string[]>
  search: (filters?: AssetGroupQueryParams) => Promise<void>
  changePage: (page: number) => Promise<void>
  isExpanded: (groupKey: string) => boolean
  setExpanded: (groupKey: string, expanded: boolean) => Promise<void>
  toggleExpand: (groupKey: string) => Promise<void>
  childrenOf: (groupKey: string) => AssetDetail[]
  childrenPage: (groupKey: string) => number
  isLoadingChildren: (groupKey: string) => boolean
  hasMoreChildren: (groupKey: string) => boolean
  loadMoreChildren: (groupKey: string) => Promise<void>
  isGroupChecked: (groupKey: string) => boolean
  isGroupIndeterminate: (groupKey: string) => boolean
  toggleGroupSelection: (groupKey: string) => void
  setGroupSelection: (groupKey: string, assetCodes: string[]) => void
  isRowSelected: (assetCode: string) => boolean
  toggleRowSelection: (assetCode: string) => void
  clearSelection: () => void
}

/**
 * 资产分组展开表格列表状态 Composable
 *
 * @example
 * ```ts
 * const {
 *   summaries,
 *   search,
 *   toggleExpand,
 *   toggleGroupSelection,
 * } = useGroupedAssetList({ pageSize: 20 })
 * ```
 */
export function useGroupedAssetList(options: GroupedAssetListOptions = {}): GroupedAssetListReturn {
  const summaries = ref<AssetGroupSummary[]>([])
  const summaryTotal = ref(0)
  const summaryLoading = ref(false)
  const currentPage = ref(1)
  const pageSize = ref(options.pageSize ?? 20)
  const childPageSize = ref(options.childPageSize ?? 20)

  /** 当前筛选条件（闭包持有，翻页时复用；不作为响应式暴露） */
  let lastFilters: AssetGroupQueryParams = {}

  const cache = useGroupChildrenCache({ childPageSize, getFilters: () => lastFilters })
  const selection = useGroupedAssetSelection(summaries)

  /** 单条组自动展开：`asset_count === 1`；多资产组保持折叠 */
  const autoExpandSingletons = async (): Promise<void> => {
    for (const row of summaries.value) {
      if (row.asset_count === 1 && !cache.isExpanded(row.group_key)) {
        await cache.setExpanded(row.group_key, true)
      }
    }
  }

  /** 拉取汇总分页 */
  const fetchSummaries = async (): Promise<void> => {
    summaryLoading.value = true
    try {
      const response = await assetAPI.getGroupedAssets({
        ...lastFilters,
        page: currentPage.value,
        page_size: pageSize.value,
      })
      summaries.value = response.results
      summaryTotal.value = response.count
      await autoExpandSingletons()
    } catch (error) {
      logError('composables/useGroupedAssetList', '[分组汇总]', error)
      ElMessage.error('加载资产分组汇总失败')
      summaries.value = []
      summaryTotal.value = 0
    } finally {
      summaryLoading.value = false
    }
  }

  /** 执行筛选查询（回到第 1 页 + 清空明细缓存与展开态） */
  const search = async (filters?: AssetGroupQueryParams): Promise<void> => {
    lastFilters = filters ?? {}
    currentPage.value = 1
    cache.reset()
    await fetchSummaries()
  }

  /** 切换汇总页码（清空明细缓存与展开态；选中集按 asset_code 平铺留存） */
  const changePage = async (page: number): Promise<void> => {
    if (page === currentPage.value) return
    currentPage.value = page
    cache.reset()
    await fetchSummaries()
  }

  return {
    summaries,
    summaryTotal,
    summaryLoading,
    currentPage,
    pageSize,
    childPageSize,
    expandedKeys: cache.expandedKeys,
    selectedCodes: selection.selectedCodes,
    selectedGroupKeys: selection.selectedGroupKeys,
    search,
    changePage,
    isExpanded: cache.isExpanded,
    setExpanded: cache.setExpanded,
    toggleExpand: cache.toggleExpand,
    childrenOf: cache.childrenOf,
    childrenPage: cache.childrenPage,
    isLoadingChildren: cache.isLoadingChildren,
    hasMoreChildren: cache.hasMoreChildren,
    loadMoreChildren: cache.loadMoreChildren,
    isGroupChecked: selection.isGroupChecked,
    isGroupIndeterminate: selection.isGroupIndeterminate,
    toggleGroupSelection: selection.toggleGroupSelection,
    setGroupSelection: selection.setGroupSelection,
    isRowSelected: selection.isRowSelected,
    toggleRowSelection: selection.toggleRowSelection,
    clearSelection: selection.clearSelection,
  }
}
