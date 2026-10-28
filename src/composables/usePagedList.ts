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
import { logError } from '@/utils/logger'
import { notifyCallerError } from '@/utils/errorHandler'

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

  // [M-14] 请求序号：仅最新请求的响应写入状态，丢弃慢响应防止覆盖新数据
  // 范式同 createEntityStore listRequestSeq / dashboard trendRequestId
  let listRequestSeq = 0

  // [AUD-48] 回滚锚：最近一次成功加载的页码；新搜索前重置为 1（失败回 1 而非旧页）
  let lastLoadedPage = 1

  /** 内部请求方法 */
  const fetchList = async (params: Record<string, unknown>) => {
    const seq = ++listRequestSeq
    loading.value = true
    try {
      const response = await fetcher({ ...params, ...fixedParams })
      if (seq !== listRequestSeq) return // 过期响应：被更新请求取代，跳过状态写回
      list.value = response.results
      total.value = response.count
      lastLoadedPage = params.page as number // [AUD-48] 成功锚定
    } catch (error) {
      if (seq !== listRequestSeq) return // 过期响应：同样跳过错误清空
      logError('composables/usePagedList', `[${tag}]`, error)
      // [M-RC-09] 单出口：AxiosError 由拦截器已提示，仅非 AxiosError 弹一次
      notifyCallerError(error, errorMessage)
      list.value = []
      total.value = 0
      // [AUD-48] 回滚乐观写的页码到最近成功页：失败页不被早退守卫锁死, 可重试
      currentPage.value = lastLoadedPage
    } finally {
      if (seq === listRequestSeq) loading.value = false
    }
  }

  /** 执行搜索（缓存搜索条件，翻页时复用） */
  const search = async (extraParams?: Record<string, unknown>) => {
    if (extraParams !== undefined) {
      lastExtraParams = extraParams
    }
    currentPage.value = 1
    lastLoadedPage = 1 // [AUD-48] 新查询重置锚：搜索失败回第 1 页
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
