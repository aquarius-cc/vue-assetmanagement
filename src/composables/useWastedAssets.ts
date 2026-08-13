/**
 * @file 已报废资产列表管理（状态为 scrapped）
 * @module composables/useWastedAssets
 * @exports
 *   - useWastedAssets: 已报废资产列表 composable
 *   - UseWastedAssetsReturn: 返回值类型
 * @callers
 *   - components/componentsdetails/detils/detilschildcomponents/WastedAssetsSearch.vue
 * @dependsOn
 *   - stores/assetStore: 资产搜索 API（searchAssets）
 *   - types/asset: 资产详情类型
 *   - stores/createEntityStore: 分页查询参数类型
 */
import { ref } from 'vue'
import { useAssetStore } from '@/stores/assetStore'
import type { AssetDetail } from '@/types/asset'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'

/**
 * 已报废资产列血Composable 返回值接号 */
export interface UseWastedAssetsReturn {
  /** 列表数据（响应式）*/
  list: import('vue').Ref<AssetDetail[]>
  /** 加载中状态*/
  loading: import('vue').Ref<boolean>
  /** 总记录数 */
  total: import('vue').Ref<number>
  /** 当前页码 */
  currentPage: import('vue').Ref<number>
  /** 每页条数 */
  pageSize: import('vue').Ref<number>
  /**
   * 执行搜索（自动缓存搜索条件，翻页时复用）
   * @param extraParams - 额外查询参数（如搜索条件），会与当前分页合并
   * @returns Promise<void>
   */
  search: (extraParams?: Omit<PaginationQuery, 'page' | 'page_size'>) => Promise<void>
  /**
   * 切换页码（自动使用上次的搜索条件重新请求）
   * @param page - 目标页码
   */
  changePage: (page: number) => Promise<void>
  /**
   * 重置所有状态（清空列表、重置分页、清空缓存的搜索条件）
   */
  reset: () => void
}

/**
 * 已报废资产列血Composable
 * 查询资产状态为 scrapped 的资人 */
export function useWastedAssets(): UseWastedAssetsReturn {
  // ---------- 响应式状态----------
  const list = ref<AssetDetail[]>([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)

  // 缓存上一次的搜索条件（不含分页参数），用于翻页时复用
  let lastExtraParams: Omit<PaginationQuery, 'page' | 'page_size'> | undefined

  // Store 实例
  const assetStore = useAssetStore()

  /**
   * 内部请求方法
   * @param params - 完整查询参数（包含分页和搜索条件）
   */
  const fetchList = async (params: PaginationQuery) => {
    loading.value = true
    try {
      // 构建查询参数，固定包吀asset_current_status 条件
      const searchParams: PaginationQuery & Record<string, string | number> = {
        ...params,
        asset_current_status: 'scrapped',
      }

      const response = await assetStore.searchAssets(searchParams)
      console.log('[useWastedAssets] 获取已报废资产成功', response)
      // 后端 search_assets 返回 AssetSimpleReturn[]，与 AssetDetail[] 结构兼容
      list.value = response.results as unknown as typeof list.value
      total.value = response.count
    } catch (error) {
      console.error('[useWastedAssets] 获取已报废资产失败', error)
      ElMessage.error('加载已报废资产列表失败')
      list.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  /**
   * 对外搜索方法
   * @param extraParams - 搜索条件（不包含 page / page_size），会缓存供翻页使用
   */
  const search = async (extraParams?: Omit<PaginationQuery, 'page' | 'page_size'>) => {
    // 缓存搜索条件（如果传入了新条件则覆盖，否则保留之前的）
    if (extraParams !== undefined) {
      lastExtraParams = extraParams
    }
    // 重置页码到第一页（新搜索应从第一页开始）
    currentPage.value = 1
    const params: PaginationQuery = {
      page: currentPage.value,
      page_size: pageSize.value,
      ...lastExtraParams,
    }
    await fetchList(params)
  }

  /**
   * 切换页码（自动使用缓存的搜索条件重新请求）
   * @param page - 目标页码
   */
  const changePage = async (page: number) => {
    if (page === currentPage.value) return
    currentPage.value = page
    const params: PaginationQuery = {
      page: currentPage.value,
      page_size: pageSize.value,
      ...lastExtraParams,
    }
    await fetchList(params)
  }

  /**
   * 重置所有状态
   */
  const reset = () => {
    currentPage.value = 1
    total.value = 0
    list.value = []
    lastExtraParams = undefined
  }

  return {
    list,
    loading,
    total,
    currentPage,
    pageSize,
    search,
    changePage,
    reset,
  }
}
