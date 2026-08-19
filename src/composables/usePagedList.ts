/**
 * @file 通用分页列表 Composable
 * @module composables/usePagedList
 * @description
 *   抽取「分页状态 + 搜索缓存 + 翻页 + 重置」的公共逻辑，
 *   消除 useScrapableAssets / useWastedAssets / useRecyclableOutAssets 之间的代码重复（DR-1）。
 *
 * @callers
 *   - composables/useScrapableAssets（薄包装）
 *   - composables/useWastedAssets（薄包装）
 *   - composables/useRecyclableOutAssets（薄包装）
 */
import { type Ref, ref } from 'vue'
import { ElMessage } from 'element-plus'

/** 分页列表 Composable 的配置项 */
export interface PagedListOptions<TItem> {
  /** 固定查询参数（如状态过滤），运行时与分页/搜索参数合并，优先级最高 */
  fixedParams: Record<string, unknown>
  /**
   * 实际请求函数
   * 入参为 { ...searchParams, ...fixedParams } 合并后的完整参数对象
   */
  fetcher: (params: Record<string, unknown>) => Promise<{ results: TItem[]; count: number }>
  /** 请求失败时的提示文案 */
  errorMessage: string
  /** 日志标签 */
  tag: string
}

/** 分页列表 Composable 的统一返回值 */
export interface PagedListReturn<TItem> {
  list: Ref<TItem[]>
  loading: Ref<boolean>
  total: Ref<number>
  currentPage: Ref<number>
  pageSize: Ref<number>
  search: (extraParams?: Record<string, unknown>) => Promise<void>
  changePage: (page: number) => Promise<void>
  reset: () => void
}

/**
 * 通用分页列表 Composable
 *
 * @example
 * ```ts
 * const { list, loading, search, changePage } = usePagedList({
 *   tag: 'myList',
 *   errorMessage: '加载失败',
 *   fixedParams: { status: 'active' },
 *   fetcher: (params) => myAPI.getList(params as MyQuery),
 * })
 * ```
 */
export function usePagedList<TItem>(options: PagedListOptions<TItem>): PagedListReturn<TItem> {
  const { fixedParams, fetcher, errorMessage, tag } = options

  const list = ref([]) as unknown as Ref<TItem[]>
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)

  let lastExtraParams: Record<string, unknown> | undefined

  /** 内部请求方法 */
  const fetchList = async (params: Record<string, unknown>) => {
    loading.value = true
    try {
      const response = await fetcher({ ...params, ...fixedParams })
      list.value = response.results
      total.value = response.count
    } catch (error) {
      console.error(`[${tag}]`, error)
      ElMessage.error(errorMessage)
      list.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  /** 执行搜索（缓存搜索条件，翻页时复用） */
  const search = async (extraParams?: Record<string, unknown>) => {
    if (extraParams !== undefined) {
      lastExtraParams = extraParams
    }
    currentPage.value = 1
    await fetchList({ page: currentPage.value, page_size: pageSize.value, ...lastExtraParams })
  }

  /** 切换页码 */
  const changePage = async (page: number) => {
    if (page === currentPage.value) return
    currentPage.value = page
    await fetchList({ page: currentPage.value, page_size: pageSize.value, ...lastExtraParams })
  }

  /** 重置所有状态 */
  const reset = () => {
    currentPage.value = 1
    total.value = 0
    list.value = []
    lastExtraParams = undefined
  }

  return { list, loading, total, currentPage, pageSize, search, changePage, reset }
}
