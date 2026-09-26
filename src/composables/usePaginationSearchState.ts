/**
 * @file 分页搜索状态管理（单关键词搜索 + 多参数搜索 + 结果状态）
 * @module composables/usePaginationSearchState
 * @exports
 *   - usePaginationSearchState: 搜索状态 composable
 *   - SearchConfig: 搜索配置接口
 * @callers
 *   - composables/usePaginationSearch: 作为搜索子模块调用
 * @dependsOn
 *   - utils/reactiveAccess: 3-way 响应式读写工具
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { readReactive } from '@/utils/reactiveAccess'
import { logError, logWarn } from '@/utils/logger'

export interface SearchConfig<T> {
  performSearch: (
    keyword: string,
    page: number,
    page_size: number,
  ) => Promise<{ count: number; results: T[] }>
  performSearchWithParams?: (
    params: Record<string, string>,
    page: number,
    page_size: number,
  ) => Promise<{ count: number; results: T[] }>
  /**
   * 搜索态变更回调（可选，DRY：当前搜索词的单一事实来源）
   *
   * 在 search.value 的每一次真实变更后调用（含 performSearch / performSearchWithParams /
   * clearSearch），参数为变更后的搜索词（空串表示已回到普通列表态）。
   *
   * 【为什么需要】页面若要感知"当前搜索词"（如 BF-047 让导出对齐搜索态），
   * 只能在 performSearch 里写一次赋值——但 performSearch 收不到空串（内部提前
   * 走 loadList 分支），clearSearch 更是完全不经过它，导致清空后搜索词残留。
   * 由本模块统一派发可避免各页面各写一份 watch 镜像（DR-1/DR-2）。
   */
  onSearchStateChange?: (keyword: string) => void
}

interface SearchStateOptions<T> {
  searchConfig: SearchConfig<T> | undefined
  currentPage: { value: number } | { get(): number; set(v: number): void }
  pageSize: { value: number } | { get(): number; set(v: number): void }
  updateTotal: (count: number) => void
  loadList: (page: number, size: number) => Promise<void>
  messages: { searchFailed: string }
}

export function usePaginationSearchState<T>(options: SearchStateOptions<T>) {
  const { searchConfig, currentPage, pageSize, updateTotal, loadList, messages } = options

  const search = ref('')
  const isSearching = ref(false)
  const searchResults = ref<T[]>([])
  const searchTotal = ref(0)
  const searchParams = ref<Record<string, string>>({})

  /** 获取当前页码的读写代理 */
  const getPage = () => readReactive<number>(currentPage)
  const getSize = () => readReactive<number>(pageSize)

  /** 派发搜索态变更（DRY：唯一出口，保证各出口的搜索词一致） */
  const notifySearchState = (keyword: string) => {
    searchConfig?.onSearchStateChange?.(keyword)
  }

  /** 单关键词搜索 */
  const performSearch = async (keyword: string = search.value) => {
    if (!searchConfig) {
      logWarn(
        'composables/usePaginationSearchState',
        '[usePaginationSearch] Search function not configured',
      )
      return
    }
    search.value = keyword
    notifySearchState(keyword)

    if (!keyword.trim()) {
      searchResults.value = []
      searchTotal.value = 0
      return loadList(1, getSize())
    }

    try {
      isSearching.value = true
      const response = await searchConfig.performSearch(keyword.trim(), getPage(), getSize())
      searchResults.value = response.results || []
      searchTotal.value = response.count ?? 0
      updateTotal(response.count)
    } catch (error) {
      logError(
        'composables/usePaginationSearchState',
        '[usePaginationSearch] Search failed:',
        error,
      )
      ElMessage.error(messages.searchFailed)
      searchResults.value = []
      searchTotal.value = 0
      throw error
    } finally {
      isSearching.value = false
    }
  }

  /** 多参数搜索 */
  const performSearchWithParams = async (params: Record<string, string>) => {
    if (!searchConfig) {
      logWarn(
        'composables/usePaginationSearchState',
        '[usePaginationSearch] Search function not configured',
      )
      return
    }

    searchParams.value = { ...params }
    search.value = params.keyword || ''
    notifySearchState(search.value)

    const hasParams = Object.values(params).some((v) => v && v.trim())
    if (!hasParams) {
      searchResults.value = []
      searchTotal.value = 0
      searchParams.value = {}
      return loadList(1, getSize())
    }

    if (searchConfig.performSearchWithParams) {
      try {
        isSearching.value = true
        const response = await searchConfig.performSearchWithParams(params, getPage(), getSize())
        searchResults.value = response.results || []
        searchTotal.value = response.count ?? 0
        updateTotal(response.count)
      } catch (error) {
        logError(
          'composables/usePaginationSearchState',
          '[usePaginationSearch] Search failed:',
          error,
        )
        ElMessage.error(messages.searchFailed)
        searchResults.value = []
        searchTotal.value = 0
        throw error
      } finally {
        isSearching.value = false
      }
    } else {
      const keyword = params.keyword || Object.values(params).find((v) => v && v.trim()) || ''
      await performSearch(keyword)
    }
  }

  /** 清空搜索状态 */
  const clearSearch = () => {
    search.value = ''
    searchResults.value = []
    searchTotal.value = 0
    searchParams.value = {}
    notifySearchState('')
  }

  return {
    search,
    isSearching,
    searchResults,
    searchTotal,
    searchParams,
    performSearch,
    performSearchWithParams,
    clearSearch,
  }
}
