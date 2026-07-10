// src/composables/usePaginationSearch.ts 通用分页和搜索 Composable工厂函数
import { ref, computed, nextTick, isRef, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { ElMessage } from 'element-plus'
import type {
  PaginationQuery,
} from '@/stores/createEntityStore'

// // ✅ 新增：分页参数的基础类型（与 createEntityStore 的 Page 保持一致）
// export interface BasePaginationParams {
//   page: number
//   page_size: number
//   total?: number // ✅ 可选，用于存储总记录数
//   [key: string]: string | number | boolean | null | undefined
// }

// ✅ 新增：内部使用的分页数据类型（仅在函数内部使用）
export interface PaginationData {
  page: number
  page_size: number
  total: number
  [key: string]: unknown
}

// 修改 PaginationRef 接口以支持三种类型
interface PaginationRef {
  page: Ref<number> | number | { get: () => number; set: (val: number) => void }
  page_size: Ref<number> | number | { get: () => number; set: (val: number) => void }
  total: Ref<number> | number | { get: () => number; set: (val: number) => void }
  // [x: string]: string | number | boolean | null | undefined
}

// export type PaginationRef = Ref<PaginationData>
/**
 * 通用分页和搜索配置
 */
// ✅ 修改：添加泛型参数 P，与 createEntityStore 的 P 对齐
export interface PaginationSearchConfig<T> {
  // Store 相关
  store: {
    // 修复：返回类型改为包含 count 和 results 的对象
    getList: (params: PaginationQuery) => Promise<{
      count: number
      results: T[]
      next?: string | null
      previous?: string | null
    }>
    // getList: (params: Q) => Promise<ListResponse<T>>
    // ✅ 关键修复：使用 unknown + 类型守卫，避免索引签名冲突
    // ✅ 关键修复：直接使用 Ref（不访问 .value）
    pagination: PaginationRef // 接受任意扩展属性 // ✅ 修复2：类型改为 Ref<P>
    // pagination:
    //   | PaginationRef
    //   | {
    //       page: number
    //       page_size: number
    //       total: number
    //       [x: string]: string | number | boolean | null | undefined
    //     } // 接受任意扩展属性 // ✅ 修复2：类型改为 Ref<P>
    // ✅ Pinia setup store 会自动解包 computed/ref，
    // 所以 list 可能是 T[]（已解包）或 ComputedRef<T[]>（未解包）
    // 或者是 getter 函数（用于保持响应式）
    list: ComputedRef<T[]> | T[] | (() => T[])
    // ✅ loading 同理
    loading: ComputedRef<boolean> | boolean | (() => boolean)
    // ✅ 新增：refreshFlag 用于子页面通知列表刷新（如批量导入成功后）
    refreshFlag?: boolean | Ref<boolean> | (() => boolean)
    // ✅ 新增：setRefreshFlag 用于重置刷新标志
    setRefreshFlag?: (flag: boolean) => void
  }
  // store: EntityStore<T, Q>

  // 搜索相关（可选）
  search?: {
    /** 单关键词搜索（保持向后兼容） */
    performSearch: (
      keyword: string,
      page: number,
      page_size: number,
    ) => Promise<{
      count: number
      results: T[]
    }>
    /** 多参数搜索（支持联合搜索） */
    performSearchWithParams?: (
      params: Record<string, string>,
      page: number,
      page_size: number,
    ) => Promise<{
      count: number
      results: T[]
    }>
  }

  // 分页配置
  pageSizeOptions?: number[]
  defaultPageSize?: number

  // 消息提示（可选）
  messages?: Partial<{
    loadFailed?: string
    searchFailed?: string
    invalidPage?: string
  }>
}

/**
 * 分页和搜索状态
 */
export interface PaginationSearchState {
  currentPage: Ref<number>
  pageSize: Ref<number>
  search: Ref<string>
  total: Ref<number>
  isSearching: Ref<boolean>
}

/**
 * 通用分页和搜索 Composable
 *
 * @example
 * // 在组件中使用
 * const { currentPage, pageSize, search, total, handleSizeChange, handleCurrentChange } =
 *   usePaginationSearch({
 *     store: userStore,
 *     search: {
 *       performSearch: (keyword, page, size) => userAPI.getFuzzySearch({ keyword, page, size })
 *     }
 *   })
 */

export function usePaginationSearch<T>(config: PaginationSearchConfig<T>) {
  const {
    store, // 从 config 中提取 store 属性
    search: searchConfig, // 从 config 中解构提取 search 属性，并重命名为 searchConfig
    pageSizeOptions = [20, 50, 100, 200, 500],
    // defaultPageSize = 20,
    messages = {
      loadFailed: '加载数据失败',
      searchFailed: '搜索失败',
      invalidPage: '页码超出范围，已跳转至最后一页',
    },
  } = config //结构config，重新赋值
  /*相当于以下写法
  const store = config.store
  const searchConfig = config.search
  const pageSizeOptions = config.pageSizeOptions || [20, 50, 100, 200, 500]
  const defaultPageSize = config.defaultPageSize || 20
  const messages = config.messages || {
  loadFailed: '加载数据失败',
  searchFailed: '搜索失败',
  invalidPage: '页码超出范围，已跳转至最后一页',
  */

  // 添加调试日志
  // console.log('[usePaginationSearch] Store received:', store)
  // console.log('[usePaginationSearch] Store pagination:', store.pagination)
  // console.log('[usePaginationSearch] Is pagination ref?', isRef(store.pagination))

  // 创建内部状态
  // 【修复】移除 searchKeyword，统一使用 search ref
  // 原问题：searchKeyword 和 search 是两个独立的 ref，导致 performSearch 使用空字符串
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ===== 状态管理 =====
  // 让 usePaginationSearch 直接使用 store.pagination 作为唯一数据源
  // 替换原来的 ref,移除本地 currentPage / pageSize，
  // 不再使用独立 ref，而是 computed 绑定到 store.pagination
  // 改用 computed 包装 store.pagination

  // if (!store.pagination.value) {
  //   store.pagination.value = {
  //     page: 1,
  //     page_size: defaultPageSize,
  //     total: 0,
  //   }
  // }
  // ✅ 使用 store.pagination 作为唯一数据源
  // 安全访问 pagination，兼容 ref 和非 ref 格式
  const currentPage = computed({
    get: () => {
      // console.log('[usePaginationSearch] Accessing currentPage')
      // console.log('[usePaginationSearch] Raw pagination:', store.pagination)

      if (!store.pagination) {
        // console.error('[usePaginationSearch] store.pagination is undefined!')
        return 1 // 返回默认值
      }

      const pageValue = store.pagination.page
      // console.log('[usePaginationSearch] Raw page value:', pageValue)
      // console.log('[usePaginationSearch] Is page ref?', isRef(pageValue))
      // 处理三种类型的 page 值
      if (isRef(pageValue)) {
        return pageValue.value
      } else if (typeof pageValue === 'object' && pageValue !== null && 'get' in pageValue) {
        return pageValue.get()
      } else {
        return pageValue
      }
    },
    set: (val: number) => {
      const pageValue = store.pagination.page
      // 处理三种类型的 page 值
      if (isRef(pageValue)) {
        pageValue.value = val
      } else if (typeof pageValue === 'object' && pageValue !== null && 'set' in pageValue) {
        pageValue.set(val)
      } else {
        store.pagination.page = val
      }
    },
  })

  const pageSize = computed({
    get: () => {
      const pageSizeValue = store.pagination.page_size
      // 处理三种类型的 page_size 值
      if (isRef(pageSizeValue)) {
        return pageSizeValue.value
      } else if (
        typeof pageSizeValue === 'object' &&
        pageSizeValue !== null &&
        'get' in pageSizeValue
      ) {
        return pageSizeValue.get()
      } else {
        return pageSizeValue
      }
    },
    set: (val: number) => {
      const pageSizeValue = store.pagination.page_size
      // 处理三种类型的 page_size 值
      if (isRef(pageSizeValue)) {
        pageSizeValue.value = val
      } else if (
        typeof pageSizeValue === 'object' &&
        pageSizeValue !== null &&
        'set' in pageSizeValue
      ) {
        pageSizeValue.set(val)
      } else {
        store.pagination.page_size = val
      }
    },
  })
  const search = ref('')
  const isSearching = ref(false)

  // 搜索相关状态（仅当配置了搜索功能时使用）
  const searchTotal = ref(0)
  const searchResults = ref<T[]>([])
  /** 多参数搜索时的完整参数对象 */
  const searchParams = ref<Record<string, string>>({})

  // ===== 计算属性 =====
  /**
   * 总记录数（根据是否有搜索词返回不同值）✅ 修复：使用安全访问函数
   */
  // ✅ total 直接来自 store.pagination（无搜索时）
  const total = computed(() => {
    // 检查 pagination 是否存在
    if (!store.pagination) {
      // console.warn('[usePaginationSearch] store.pagination is undefined')
      return 0
    }
    const totalValue = store.pagination.total
    // 处理三种情况：Ref、普通数字、带有 get/set 方法的对象
    if (isRef(totalValue)) {
      // console.log(`[usePaginationSearch] total computed (isRef): ${totalValue.value}`)
      return totalValue.value
    } else if (typeof totalValue === 'object' && totalValue !== null && 'get' in totalValue) {
      const value = totalValue.get()
      // console.log(`[usePaginationSearch] total computed (get/set): ${value}`)
      return value
    } else {
      // const value = typeof totalValue === 'number' ? totalValue : 0
      // console.log(`[usePaginationSearch] total computed (number): ${value}`)
      return totalValue as number
    }
  })
  // 添加 watch 监听 total 变化
  watch(
    total,
    (newTotal, oldTotal) => {
      if (newTotal !== oldTotal) {
        console.log(`[usePaginationSearch] total changed: ${oldTotal} -> ${newTotal}`)
      }
    },
    { immediate: true },
  )

  /**
   * 安全获取 store.list 的值（兼容 Pinia 自动解包、未解包、getter 函数三种情况）
   */
  const getStoreList = (): T[] => {
    const raw = config.store.list
    // 支持 getter 函数
    if (typeof raw === 'function') return raw()
    // 支持数组（Pinia 解包后）
    if (Array.isArray(raw)) return raw
    // 支持 ComputedRef/Ref
    if (raw && typeof raw === 'object' && 'value' in raw) return (raw as ComputedRef<T[]>).value
    return []
  }

  /**
   * 表格数据（根据是否有搜索词决定来源）
   * 【修复】同时检查 search.value 和 searchParams.value，支持多参数搜索
   * 【修复】搜索结果为空时显示空状态，而非回退到全部数据
   */
  const tableData = computed(() => {
    // 检查是否有搜索词（单关键词或多参数）
    const searchQuery = search.value.trim()
    const hasSearchParams = Object.values(searchParams.value).some((v) => v && v.trim())
    const isSearchActive = searchQuery || hasSearchParams

    // 搜索进行中：显示加载状态（由 loading 控制）
    if (isSearchActive && isSearching.value) {
      return []
    }

    // 搜索已完成且有结果：显示搜索结果
    if (isSearchActive && !isSearching.value && searchResults.value.length > 0) {
      return searchResults.value
    }

    // 搜索已完成但无结果：显示空状态（不回退到全部数据）
    if (isSearchActive && !isSearching.value && searchResults.value.length === 0) {
      return []
    }

    // 无搜索：显示全部数据
    return getStoreList()
  })

  // ✅ 安全访问 pagination.total（内部类型守卫）
  const getPaginationTotal = (): number => {
    try {
      // 安全访问：先检查是否为对象，再访问 total
      const paginationValue = config.store.pagination
      if (typeof paginationValue === 'object' && paginationValue !== null) {
        const total = (paginationValue as PaginationData).total
        return typeof total === 'number' ? total : 0
      }
      return 0
    } catch {
      return 0
    }
  }

  // ===== 核心方法 =====
  /**
   * 从后端加载数据（带分页）
   */
  const loadList = async (page: number, page_size: number) => {
    // const loadList = async () => {
    try {
      // ✅ 构建查询参数（不包含 total）
      // const params: Partial<Q> = { page, page_size }
      loading.value = true
      error.value = null
      const params = {
        page: page ?? currentPage.value,
        page_size: page_size ?? pageSize.value,
      }
      const response = await store.getList(params)
      // console.log(`info of response : ${response}`)
      // 更新 store 中的分页信息
      // 检查 response 的类型
      // 如果 response 是数组，我们需要从其他地方获取 count
      // 通常，store.getList 方法会更新 store.pagination.total
      // 所以我们不需要在这里手动更新 total

      // 如果 response 是对象，包含 count 和 results
      if (response && typeof response === 'object' && 'count' in response) {
        const totalValue = store.pagination.total
        if (isRef(totalValue)) {
          totalValue.value = response.count
        } else if (typeof totalValue === 'object' && totalValue !== null && 'set' in totalValue) {
          totalValue.set(response.count)
        } else {
          store.pagination.total = response.count
        }
        // console.log(`[usePaginationSearch] Updated total to: ${response.count}`)
      }
    } catch (error) {
      console.error('[usePaginationSearch] Load list failed:', error)
      ElMessage.error(messages.loadFailed)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 执行模糊搜索（仅当配置了搜索功能时）
   * 【修复】使用 search.value 替代 searchKeyword.value，确保使用输入框的值
   * 【修复】将搜索关键词同步到 search.value，确保 tableData 计算属性能正确判断搜索状态
   */
  const performSearch = async (keyword: string = search.value) => {
    if (!searchConfig) {
      console.warn('[usePaginationSearch] Search function not configured')
      return
    }

    // 【关键修复】将搜索关键词同步到 search.value
    // 这样 tableData 计算属性才能正确判断是否有搜索词，从而决定显示搜索结果还是全部数据
    search.value = keyword

    if (!keyword.trim()) {
      searchResults.value = []
      searchTotal.value = 0
      return loadList(1, pageSize.value)
    }

    try {
      loading.value = true
      error.value = null
      isSearching.value = true

      const response = await searchConfig.performSearch(
        keyword.trim(),
        currentPage.value,
        pageSize.value,
      )

      searchResults.value = response.results || []
      searchTotal.value = response.count ?? 0

      // 更新 store 中的数据和分页信息
      const totalValue = store.pagination.total
      if (totalValue !== response.count) {
        if (isRef(totalValue)) {
          totalValue.value = response.count
        } else if (typeof totalValue === 'object' && totalValue !== null && 'set' in totalValue) {
          totalValue.set(response.count)
        } else {
          store.pagination.total = response.count
        }
      }

      // 如果 store 有更新列表的方法，这里应该调用
      // 但通常由 search 方法内部处理
    } catch (error) {
      console.error('[usePaginationSearch] Search failed:', error)
      ElMessage.error(messages.searchFailed)
      searchResults.value = []
      searchTotal.value = 0
      throw error
    } finally {
      isSearching.value = false
      loading.value = false
    }
  }

  /**
   * 执行多参数搜索（支持联合搜索）
   * 用于 SearchBar 组件传递多个搜索条件
   *
   * @param params 搜索参数对象，如 { keyword: '电脑', status: 'in_stock' }
   */
  const performSearchWithParams = async (params: Record<string, string>) => {
    if (!searchConfig) {
      console.warn('[usePaginationSearch] Search function not configured')
      return
    }

    // 保存搜索参数
    searchParams.value = { ...params }

    // 同步 keyword 到 search.value（保持向后兼容）
    search.value = params.keyword || ''

    // 检查是否有任何非空参数
    const hasParams = Object.values(params).some((v) => v && v.trim())
    if (!hasParams) {
      searchResults.value = []
      searchTotal.value = 0
      searchParams.value = {}
      return loadList(1, pageSize.value)
    }

    // 如果配置了多参数搜索方法，使用它
    if (searchConfig.performSearchWithParams) {
      try {
        loading.value = true
        error.value = null
        isSearching.value = true

        const response = await searchConfig.performSearchWithParams(
          params,
          currentPage.value,
          pageSize.value,
        )

        searchResults.value = response.results || []
        searchTotal.value = response.count ?? 0

        // 更新 store 中的分页信息
        const totalValue = store.pagination.total
        if (totalValue !== response.count) {
          if (isRef(totalValue)) {
            totalValue.value = response.count
          } else if (typeof totalValue === 'object' && totalValue !== null && 'set' in totalValue) {
            totalValue.set(response.count)
          } else {
            store.pagination.total = response.count
          }
        }
      } catch (error) {
        console.error('[usePaginationSearch] Search failed:', error)
        ElMessage.error(messages.searchFailed)
        searchResults.value = []
        searchTotal.value = 0
        throw error
      } finally {
        isSearching.value = false
        loading.value = false
      }
    } else {
      // 降级：使用单关键词搜索（取 keyword 字段或第一个非空值）
      const keyword = params.keyword || Object.values(params).find((v) => v && v.trim()) || ''
      await performSearch(keyword)
    }
  }

  /**
   * 每页大小改变
   */
  const handleSizeChange = async (newSize: number) => {
    // const oldSize = pageSize.value
    pageSize.value = newSize

    const searchQuery = search.value.trim()

    // 只有在新的页面大小导致当前页超过最大页数时才重置到第一页
    // const totalPagesBeforeChange = Math.ceil(total.value / oldSize)
    const totalPagesAfterChange = Math.ceil(total.value / newSize)

    // 如果当前页在新页面大小下仍然有效，则保持当前页，否则跳转到最后一页
    if (currentPage.value > totalPagesAfterChange && totalPagesAfterChange > 0) {
      currentPage.value = totalPagesAfterChange
    }
    await nextTick()
    // 仅在无搜索或未配置搜索时重置页码
    if (!searchQuery || !searchConfig) {
      currentPage.value = 1
    }

    if (searchQuery && searchConfig) {
      // 有搜索时，重新搜索
      await performSearch(searchQuery)
    } else {
      // 无搜索时，重新加载
      await loadList(currentPage.value, pageSize.value)
    }
  }

  /**
   * 页码改变 ✅ 修复：验证页码时也使用安全访问
   */
  const handleCurrentChange = async (newPage: number) => {
    currentPage.value = newPage
    await nextTick()

    const searchQuery = search.value.trim()

    if (searchQuery && searchConfig) {
      // 有搜索时，重新搜索
      await performSearch(searchQuery)

      // 验证搜索结果页码
      const totalPages = Math.ceil(searchTotal.value / pageSize.value)
      if (newPage > totalPages && totalPages > 0) {
        ElMessage.warning(`${messages.invalidPage}（${totalPages}）`)
        currentPage.value = totalPages
        await nextTick()
        await performSearch(searchQuery)
      }
    } else {
      // 无搜索时，加载指定页
      await loadList(newPage, pageSize.value)

      // 验证页码 ✅ 使用安全访问
      const totalPages = Math.ceil(getPaginationTotal() / pageSize.value)
      if (newPage > totalPages && totalPages > 0) {
        ElMessage.warning(`${messages.invalidPage}（${totalPages}）`)
        currentPage.value = totalPages
        await nextTick()
        await loadList(totalPages, pageSize.value)
      }
    }
  }

  /**
   * 重置到第一页
   */
  const resetToFirstPage = () => {
    currentPage.value = 1
    search.value = ''
    searchResults.value = []
    searchTotal.value = 0
  }

  /**
   * 刷新当前页
   */
  const refreshCurrentPage = async () => {
    const searchQuery = search.value.trim()

    if (searchQuery && searchConfig) {
      await performSearch(searchQuery)
    } else {
      await loadList(currentPage.value, pageSize.value)
    }
  }

  // ✅ 暴露 store 的 loading 状态（兼容 Pinia 自动解包、getter 函数）
  const storeLoading = computed(() => {
    const raw = config.store.loading
    // 支持 getter 函数
    if (typeof raw === 'function') return raw()
    // 支持布尔值（Pinia 解包后）
    if (typeof raw === 'boolean') return raw
    // 支持 ComputedRef/Ref
    if (raw && typeof raw === 'object' && 'value' in raw) return (raw as ComputedRef<boolean>).value
    return false
  })

  // ✅ 新增：统一监听 store.refreshFlag，实现子页面操作后自动刷新列表
  // 当子页面（如批量导入、表单编辑）完成操作并设置 refreshFlag = true 时，
  // 自动触发当前列表刷新，无需每个页面单独写监听逻辑
  // 仅在 store 配置了 refreshFlag 时才创建监听，避免无意义的 watcher
  if (config.store.refreshFlag !== undefined) {
    /**
     * 安全获取 refreshFlag 的值
     * 兼容三种类型：Ref<boolean>（Pinia 解包前）、boolean（Pinia 解包后）、getter 函数
     */
    const getRefreshFlagValue = (): boolean => {
      const raw = config.store.refreshFlag
      if (raw === undefined) return false
      // 优先判断 Ref（对象类型），与项目中其他代码风格保持一致
      if (raw && typeof raw === 'object' && 'value' in raw) return (raw as Ref<boolean>).value
      if (typeof raw === 'function') return raw()
      if (typeof raw === 'boolean') return raw
      return false
    }

    // 竞态保护锁：防止刷新过程中重复触发
    let isRefreshing = false

    watch(
      () => getRefreshFlagValue(),
      async (flag) => {
        if (!flag || isRefreshing) return

        isRefreshing = true
        try {
          console.log('[usePaginationSearch] refreshFlag triggered, refreshing current page')
          await refreshCurrentPage()
        } catch (error) {
          console.error('[usePaginationSearch] refreshFlag triggered refresh failed:', error)
        } finally {
          // 无论刷新成功或失败，都重置 flag 并释放锁
          isRefreshing = false
          config.store.setRefreshFlag?.(false)
        }
      },
      { immediate: false },
    )
  }

  // ===== 暴露的 API =====
  return {
    // 状态
    currentPage,
    pageSize,
    search,
    searchParams,
    total,
    isSearching,
    tableData,
    searchResults,
    searchTotal,
    storeLoading, // ✅ 新增：暴露 store 的 loading 状态

    // 方法
    handleSizeChange,
    handleCurrentChange,
    performSearch,
    performSearchWithParams,
    loadList,
    resetToFirstPage,
    refreshCurrentPage,

    // 配置
    pageSizeOptions,
  }
}
