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

// ======================== 类型定义 ========================

export interface PaginationData {
  page: number
  page_size: number
  total: number
  [key: string]: unknown
}

export interface PaginationSearchConfig<T> {
  store: {
    getList: (params: PaginationQuery) => Promise<{
      count: number
      results: T[]
      total_pages?: number
      next?: string | null
      previous?: string | null
    }>
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
      console.error('[usePaginationSearch] Load list failed:', err)
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

  // ===== 表格数据 =====
  const tableData = computed(() => {
    const hasSearch =
      search.value.trim() || Object.values(searchParams.value).some((v) => v && v.trim())
    if (hasSearch && isSearching.value) return []
    if (hasSearch && !isSearching.value) return searchResults.value
    return getStoreList()
  })

  // ===== 分页操作 =====
  const handleSizeChange = async (newSize: number) => {
    pageSize.value = newSize
    const totalPages = Math.ceil(total.value / newSize)
    if (currentPage.value > totalPages && totalPages > 0) {
      currentPage.value = totalPages
    }
    await nextTick()
    if (search.value.trim() && searchConfig) {
      await performSearch(search.value)
    } else {
      currentPage.value = 1
      await loadList(currentPage.value, pageSize.value)
    }
  }

  const handleCurrentChange = async (newPage: number) => {
    currentPage.value = newPage
    await nextTick()
    const searchQuery = search.value.trim()

    if (searchQuery && searchConfig) {
      await performSearch(searchQuery)
      const totalPages = Math.ceil(searchTotal.value / pageSize.value)
      if (newPage > totalPages && totalPages > 0) {
        ElMessage.warning(`${messages.invalidPage}（${totalPages}）`)
        currentPage.value = totalPages
        await nextTick()
        await performSearch(searchQuery)
      }
    } else {
      await loadList(newPage, pageSize.value)
      const totalPages = Math.ceil(total.value / pageSize.value)
      if (newPage > totalPages && totalPages > 0) {
        ElMessage.warning(`${messages.invalidPage}（${totalPages}）`)
        currentPage.value = totalPages
        await nextTick()
        await loadList(totalPages, pageSize.value)
      }
    }
  }

  const resetToFirstPage = () => {
    currentPage.value = 1
    clearSearch()
  }

  const refreshCurrentPage = async () => {
    if (search.value.trim() && searchConfig) {
      await performSearch(search.value)
    } else {
      await loadList(currentPage.value, pageSize.value)
    }
  }

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
    loadList,
    resetToFirstPage,
    refreshCurrentPage,
    pageSizeOptions,
  }
}
