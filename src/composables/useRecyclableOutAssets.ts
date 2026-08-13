/**
 * @file 可回收出库资产列表管理（专用接口 /assets/out-assets/recyclable/）
 * @module composables/useRecyclableOutAssets
 * @exports
 *   - useRecyclableOutAssets: 可回收出库资产列表 composable
 *   - UseRecyclableOutAssetsReturn: 返回值类型
 * @callers
 *   - components/componentsdetails/detils/detilschildcomponents/RecyclableOutAssetsSearch.vue
 * @dependsOn
 *   - api/outAsset: getRecyclableOutAssets 接口
 *   - types/outasset: 出库资产查询与响应类型
 */
import { ref } from 'vue'
import { outAssetAPI } from '@/api/outAsset'
import type { OutAssetQueryParams, RecyclableOutAssetResponse } from '@/types/outasset'
import { ElMessage } from 'element-plus'

/**
 * 可回收出库资产列表 Composable 返回值接口
 */
export interface UseRecyclableOutAssetsReturn {
  /** 列表数据（响应式） */
  list: import('vue').Ref<RecyclableOutAssetResponse['results']>
  /** 加载中状态 */
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
  search: (extraParams?: Omit<OutAssetQueryParams, 'page' | 'page_size'>) => Promise<void>
  /**
   * 切换页码（自动使用上次的搜索条件重新请求）
   * @param page - 目标页码
   */
  changePage: (page: number) => void
  /**
   * 重置所有状态（清空列表、重置分页、清空缓存的搜索条件）
   */
  reset: () => void
}

/**
 * 可回收出库资产列表 Composable
 */
export function useRecyclableOutAssets(): UseRecyclableOutAssetsReturn {
  // ---------- 响应式状态 ----------
  const list = ref<RecyclableOutAssetResponse['results']>([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)

  // 缓存上一次的搜索条件（不含分页参数），用于翻页时复用
  let lastExtraParams: Omit<OutAssetQueryParams, 'page' | 'page_size'> | undefined

  /**
   * 内部请求方法
   * @param params - 完整查询参数（包含分页和搜索条件）
   */
  const fetchList = async (params: OutAssetQueryParams) => {
    loading.value = true
    try {
      const response = await outAssetAPI.getRecyclableOutAssets(params)
      list.value = response.results
      total.value = response.count
      // 同步当前页码（请求的页码即为期望的页码）
      currentPage.value = params.page ?? 1
    } catch (error) {
      console.error('[useRecyclableOutAssets] 获取可回收资产失败:', error)
      ElMessage.error('加载可回收资产列表失败')
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
  const search = async (extraParams?: Omit<OutAssetQueryParams, 'page' | 'page_size'>) => {
    // 缓存搜索条件（如果传入了新条件则覆盖，否则保留之前的）
    if (extraParams !== undefined) {
      lastExtraParams = extraParams
    }
    // 重置页码到第一页（新搜索应从第一页开始）
    currentPage.value = 1
    const params: OutAssetQueryParams = {
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
    const params: OutAssetQueryParams = {
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
