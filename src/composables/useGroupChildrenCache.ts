/**
 * @file 组内明细懒加载缓存 Composable
 * @module composables/useGroupChildrenCache
 * @description
 *   F2 子职责 1：从 useGroupedAssetList 按职责拆分而来（FR-6）。
 *   承载「展开态 + 组内明细分页缓存」，与汇总分页、选择集解耦。
 *
 *   核心契约：
 *   - 缓存语义：组内翻页 **append** 不 replace；同一 group_key 缓存命中时零请求
 *   - R-1 组键透传：`group_key` 原样回传，前端不解析、不重建、不补 null
 *   - 筛选白名单：仅 `GROUPED_PASS_THROUGH_KEYS`（9 键，≡ 后端
 *     `PASS_THROUGH_FILTER_PATHS`）的筛选可透传；`contract_code` / `no_contract`
 *     已在 group_key 内表达，剔除以免与组键取交集得空集
 *
 * @callers
 *   - composables/useGroupedAssetList: 分组展开表格列表状态（F2 主入口）
 * @dependsOn
 *   - api/asset: getGroupChildren（FR-3 API 收敛唯一入口）
 *   - constants/assetGroupedFilters: 透传白名单单一来源
 *   - utils/logger: logError
 */
import { ref, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { assetAPI } from '@/api/asset'
import { logError } from '@/utils/logger'
import { GROUPED_PASS_THROUGH_KEYS } from '@/constants/assetGroupedFilters'
import type { AssetDetail, AssetGroupChildQueryParams, AssetGroupQueryParams } from '@/types/asset'

/** 组内明细缓存条目 */
export interface GroupChildrenCacheEntry {
  /** 已加载到的页码 */
  page: number
  /** 组内总条数 */
  count: number
  /** 已加载的明细（跨页 append 累积） */
  items: AssetDetail[]
}

/** 组内可透传的非组键筛选白名单（SC-4 白名单；单一来源见 constants/assetGroupedFilters） */
const PASS_THROUGH_KEYS = GROUPED_PASS_THROUGH_KEYS

/** 缓存 Composable 配置项 */
export interface GroupChildrenCacheOptions {
  /** 组内每页条数 */
  childPageSize: Ref<number>
  /** 取当前汇总筛选条件（供白名单抽取透传筛选） */
  getFilters: () => AssetGroupQueryParams
}

/** 缓存 Composable 返回值 */
export interface GroupChildrenCacheReturn {
  expandedKeys: Ref<string[]>
  childrenOf: (groupKey: string) => AssetDetail[]
  isExpanded: (groupKey: string) => boolean
  childrenPage: (groupKey: string) => number
  isLoadingChildren: (groupKey: string) => boolean
  hasMoreChildren: (groupKey: string) => boolean
  ensureChildren: (groupKey: string) => Promise<void>
  setExpanded: (groupKey: string, expanded: boolean) => Promise<void>
  toggleExpand: (groupKey: string) => Promise<void>
  loadMoreChildren: (groupKey: string) => Promise<void>
  goToChildPage: (groupKey: string, page: number) => Promise<void>
  reset: () => void
}

/**
 * 按白名单抽取组内可透传筛选（零拼装：不解析 group_key、不补默认值）
 */
function pickPassThroughFilters(
  filters: AssetGroupQueryParams,
): Partial<AssetGroupChildQueryParams> {
  const picked: Record<string, string> = {}
  for (const key of PASS_THROUGH_KEYS) {
    const value = filters[key]
    if (value !== undefined && value !== '') {
      picked[key] = value
    }
  }
  return picked
}

/**
 * 组内明细懒加载缓存 Composable
 *
 * @example
 * ```ts
 * const { toggleExpand, loadMoreChildren } = useGroupChildrenCache({
 *   childPageSize,
 *   getFilters: () => filters,
 * })
 * ```
 */
export function useGroupChildrenCache(
  options: GroupChildrenCacheOptions,
): GroupChildrenCacheReturn {
  const { childPageSize, getFilters } = options

  const expandedKeys = ref<string[]>([])
  const childrenMap = ref(new Map<string, GroupChildrenCacheEntry>())
  const loadingKeys = ref<string[]>([])

  const childrenOf = (groupKey: string): AssetDetail[] =>
    childrenMap.value.get(groupKey)?.items ?? []

  const isExpanded = (groupKey: string): boolean => expandedKeys.value.includes(groupKey)

  const isLoadingChildren = (groupKey: string): boolean => loadingKeys.value.includes(groupKey)

  /** 当前展示页码（覆盖式分页下表示当前展示页；append 模式下表示已加载到的最大页）
   * @note 覆盖式分页（append=false）启用后，语义为「当前展示页（current display page）」。
   */
  const childrenPage = (groupKey: string): number => childrenMap.value.get(groupKey)?.page ?? 1

  /** 是否还有下一页：已加载页数 * 每页 < 组内总数 */
  const hasMoreChildren = (groupKey: string): boolean => {
    const entry = childrenMap.value.get(groupKey)
    if (!entry) return true
    return entry.page * childPageSize.value < entry.count
  }

  /** 清空缓存 + 展开态 + 加载态（筛选变更 / 汇总翻页时调用） */
  const reset = (): void => {
    childrenMap.value = new Map()
    expandedKeys.value = []
    loadingKeys.value = []
  }

  /**
   * 拉取组内明细
   * @param append true=翻页追加（append 而非 replace），false=覆盖式写入
   */
  const fetchChildren = async (groupKey: string, page: number, append: boolean): Promise<void> => {
    if (loadingKeys.value.includes(groupKey)) return
    loadingKeys.value = [...loadingKeys.value, groupKey]
    try {
      const response = await assetAPI.getGroupChildren({
        group_key: groupKey,
        page,
        page_size: childPageSize.value,
        ...pickPassThroughFilters(getFilters()),
      })
      const previous = childrenMap.value.get(groupKey)
      const items = append && previous ? [...previous.items, ...response.results] : response.results
      const next = new Map(childrenMap.value)
      next.set(groupKey, { page, count: response.count, items })
      childrenMap.value = next
    } catch (error) {
      logError('composables/useGroupChildrenCache', '[组内明细]', error)
      ElMessage.error('加载组内资产明细失败')
    } finally {
      loadingKeys.value = loadingKeys.value.filter((key) => key !== groupKey)
    }
  }

  /** 确保缓存存在（缓存命中零请求，供展开与自动展开共用） */
  const ensureChildren = async (groupKey: string): Promise<void> => {
    if (childrenMap.value.has(groupKey)) return
    await fetchChildren(groupKey, 1, false)
  }

  /**
   * 显式设置展开态（不翻转）
   *
   * F3 的 `el-table` 以 `:expand-row-keys="expandedKeys"` 受控展开：用户点 EP 的箭头会先
   * 由 EP 变更自身 treeData 并 emit `expand-change`，故此处必须是「置位」而非「翻转」，
   * 否则与 EP 的 `:expand-row-keys` 互相打架（同一次点击被计两次）。
   *
   * @param expanded true=展开（缓存未命中则发请求），false=折叠（保留缓存）
   */
  const setExpanded = async (groupKey: string, expanded: boolean): Promise<void> => {
    if (!expanded) {
      expandedKeys.value = expandedKeys.value.filter((key) => key !== groupKey)
      return
    }
    if (!expandedKeys.value.includes(groupKey)) {
      expandedKeys.value = [...expandedKeys.value, groupKey]
    }
    await ensureChildren(groupKey)
  }

  /** 展开 / 折叠（切换语义，供无外部受控展开态的调用方使用） */
  const toggleExpand = async (groupKey: string): Promise<void> => {
    await setExpanded(groupKey, !isExpanded(groupKey))
  }

  /** 组内加载下一页（append） */
  const loadMoreChildren = async (groupKey: string): Promise<void> => {
    const entry = childrenMap.value.get(groupKey)
    await fetchChildren(groupKey, entry ? entry.page + 1 : 1, true)
  }

  /**
   * 跳转到指定子明细页（覆盖式分页）
   * @description 使用 append=false 覆盖写入，确保每页仅渲染当前页数据（解决“加载更多”append 拼接导致的多页一起渲染问题）。
   * @note childrenPage 在覆盖式写入后表示「当前展示页（current display page）」，不再严格等同于「已加载最大页（max loaded page）」。
   *       该语义变更仅适用于分组子表真分页场景。
   */
  async function goToChildPage(groupKey: string, page: number): Promise<void> {
    if (!groupKey) return
    await fetchChildren(groupKey, page, false)
  }

  return {
    expandedKeys,
    childrenOf,
    isExpanded,
    childrenPage,
    isLoadingChildren,
    hasMoreChildren,
    ensureChildren,
    setExpanded,
    toggleExpand,
    loadMoreChildren,
    goToChildPage,
    reset,
  }
}
