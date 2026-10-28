/**
 * @file 通用分页搜索编排层，桥接 Store 与 usePaginationSearchState
 * @module composables/usePaginationSearch
 * @exports
 *   - usePaginationSearch: 分页搜索 composable
 *   - PaginationData: 分页数据类型
 *   - PaginationSearchConfig: 分页搜索配置类型
 * @callers
 *   - composables/useAssetListConfig: 资产列表配置
 *   - components/commoncomponents/SmartListContainer.vue
 * @dependsOn
 *   - composables/usePaginationSearchState: 搜索状态管理
 *   - utils/reactiveAccess: 3-way 响应式读写工具
 *   - stores/createEntityStore: PaginationQuery 类型
 */
import { ref, computed, nextTick, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { ElMessage } from 'element-plus'
import { readReactive, writeReactive, readStoreValue } from '@/utils/reactiveAccess'
import { usePaginationSearchState, type SearchConfig } from './usePaginationSearchState'
import type { PaginationQuery } from '@/stores/createEntityStore'
import { logError } from '@/utils/logger'
import { notifyCallerError } from '@/utils/errorHandler'

// ======================== 类型定义 ========================

export interface PaginationData {
  page: number
  page_size: number
  total: number
  [key: string]: unknown
}

export interface PaginationSearchConfig<T> {
  store: {
    getList: (params: PaginationQuery) => Promise<
      | {
          count: number
          results: T[]
          total_pages?: number
          next?: string | null
          previous?: string | null
        }
      | undefined
    >
    pagination: PaginationRef
    list: ComputedRef<T[]> | T[] | (() => T[])
    loading: ComputedRef<boolean> | boolean | (() => boolean)
    refreshFlag?: boolean | Ref<boolean> | (() => boolean)
    setRefreshFlag?: (flag: boolean) => void
  }
  defaultPageSize?: number
  search?: SearchConfig<T>
  pageSizeOptions?: number[]
  messages?: Partial<{ loadFailed?: string; searchFailed?: string; invalidPage?: string }>
}

interface PaginationRef {
  page: Ref<number> | number | { get: () => number; set: (val: number) => void }
  page_size: Ref<number> | number | { get: () => number; set: (val: number) => void }
  total: Ref<number> | number | { get: () => number; set: (val: number) => void }
}

// ======================== 主 Composable ========================

export function usePaginationSearch<T>(config: PaginationSearchConfig<T>) {
  const { store, search: searchConfig, pageSizeOptions = [20, 50, 100, 200, 500] } = config
  const messages = {
    loadFailed: '加载数据失败',
    searchFailed: '搜索失败',
    invalidPage: '页码超出范围，已跳转至最后一页',
    ...config.messages,
  }

  // ===== 分页状态（3-way 类型访问） =====
  const currentPage = computed({
    get: () => readReactive<number>(store.pagination.page) || 1,
    set: (val: number) => writeReactive(store.pagination.page, val),
  })
  const pageSize = computed({
    get: () => readReactive<number>(store.pagination.page_size) || 20,
    set: (val: number) => writeReactive(store.pagination.page_size, val),
  })
  const total = computed(() => readReactive<number>(store.pagination.total) || 0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ===== 数据获取（必须在 usePaginationSearchState 之前声明） =====
  const updateTotal = (count: number) => writeReactive(store.pagination.total, count)

  const getStoreList = (): T[] => readStoreValue<T[]>(store.list) || []

  const loadList = async (page: number, page_size: number) => {
    try {
      loading.value = true
      error.value = null
      const response = await store.getList({ page, page_size })
      if (response && typeof response === 'object' && 'count' in response) {
        updateTotal(response.count)
      }
    } catch (err) {
      logError('composables/usePaginationSearch', '[usePaginationSearch] Load list failed:', err)
      // [M-RC-09] 单出口：AxiosError 由拦截器已提示，仅非 AxiosError 弹一次
      notifyCallerError(err, messages.loadFailed)
      ElMessage.error(messages.loadFailed)
      throw err
    } finally {
      loading.value = false
    }
  }

  // ===== 搜索状态（委托给 usePaginationSearchState） =====
  const {
    search,
    isSearching,
    searchResults,
    searchTotal,
    searchParams,
    performSearch,
    performSearchWithParams,
    clearSearch,
  } = usePaginationSearchState<T>({
    searchConfig,
    currentPage,
    pageSize,
    updateTotal,
    loadList,
    messages,
  })

  // ===== 搜索态路由（BF-083：参数态 / 关键词态 / 列表态唯一分流） =====
  // searchParams 与 search 互斥由入口保证：performSearch 清参、performSearchWithParams 全量覆写。
  const hasParamsSearch = () => Object.values(searchParams.value).some((v) => v && v.trim())

  const runActiveSearch = async () => {
    if (hasParamsSearch()) {
      await performSearchWithParams({ ...searchParams.value })
    } else if (search.value.trim() && searchConfig) {
      await performSearch(search.value)
    } else {
      await loadList(currentPage.value, pageSize.value)
    }
  }

  /**
   * [M-37] EP 事件入口吞错：loadList/performSearch 失败时已 logError + ElMessage 统一提示，
   * 此处兜底捕获仅为阻断 unhandled rejection——EP 事件处理器与 void 调用不消费 rejection。
   */
  const swallowEntryRejection = (action: () => Promise<unknown>): Promise<void> =>
    action().then(
      () => undefined,
      () => undefined, // 入口吞错（M-37）：用户提示已由内层统一发出
    )

  // ===== 表格数据 =====
  const tableData = computed(() => {
    const hasSearch =
      search.value.trim() || Object.values(searchParams.value).some((v) => v && v.trim())
    if (hasSearch && isSearching.value) return []
    if (hasSearch && !isSearching.value) return searchResults.value
    return getStoreList()
  })

  // ===== 分页操作 =====
  const handleSizeChange = (newSize: number) =>
    swallowEntryRejection(async () => {
      pageSize.value = newSize
      // [M-3] 统一语义：改每页条数回第 1 页（业界惯例，消解 EP size-change/current-change 双触发）
      currentPage.value = 1
      await nextTick()
      await runActiveSearch()
    })

  const handleCurrentChange = (newPage: number) =>
    swallowEntryRejection(async () => {
      currentPage.value = newPage
      await nextTick()
      const useSearchResults = hasParamsSearch() || (!!search.value.trim() && !!searchConfig)
      await runActiveSearch()
      const totalPages = Math.ceil(
        (useSearchResults ? searchTotal.value : total.value) / pageSize.value,
      )
      if (newPage > totalPages && totalPages > 0) {
        ElMessage.warning(`${messages.invalidPage}（${totalPages}）`)
        currentPage.value = totalPages
        await nextTick()
        await runActiveSearch()
      }
    })

  const resetToFirstPage = async () => {
    currentPage.value = 1
    clearSearch()
    // [I-2] 重置后必须真实加载第 1 页数据，否则表格停留在旧数据/空态
    await loadList(1, pageSize.value)
  }

  /**
   * [M-2] 搜索入口置 1 薄包装（用户触发的搜索必须从第 1 页开始）
   *
   * 仅置 1 + 委托 performSearchWithParams；翻页/刷新路径仍走 performSearchWithParams
   * 原型（不复位），避免破坏 BF-083 搜索态路由与 routing.spec 的翻页契约。
   */
  const searchWithReset = (params: Record<string, string>) => {
    currentPage.value = 1
    return swallowEntryRejection(() => performSearchWithParams(params))
  }

  const refreshCurrentPage = () => swallowEntryRejection(() => runActiveSearch())

  // ===== store loading =====
  const storeLoading = computed(() => readStoreValue<boolean>(store.loading) || false)

  // ===== refreshFlag 监听 =====
  if (store.refreshFlag !== undefined) {
    let isRefreshing = false
    watch(
      () => readStoreValue<boolean>(store.refreshFlag!),
      async (flag) => {
        if (!flag || isRefreshing) return
        isRefreshing = true
        try {
          await refreshCurrentPage()
        } catch (e) {
          logError('composables/usePaginationSearch', '[usePaginationSearch] refresh failed:', e)
        } finally {
          isRefreshing = false
          store.setRefreshFlag?.(false)
        }
      },
      { immediate: false },
    )
  }

  // ===== 返回 API（保持原有签名不变） =====
  return {
    currentPage,
    pageSize,
    search,
    searchParams,
    total,
    isSearching,
    tableData,
    searchResults,
    searchTotal,
    storeLoading,
    handleSizeChange,
    handleCurrentChange,
    performSearch,
    performSearchWithParams,
    searchWithReset,
    loadList,
    resetToFirstPage,
    refreshCurrentPage,
    pageSizeOptions,
  }
}
