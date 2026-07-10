/**
 * 可出库资产搜�?Composable
 * 后端接口�?assets/assets/search_available/（仅返回 asset_current_status = 'in_store' 的资产）
 */
import { ref } from 'vue'
import { assetAPI } from '@/api/asset'
import type { AssetSimpleReturn, AssetListSimpleResponse } from '@/types/asset'
import { ElMessage } from 'element-plus'

export function useExportableAssets() {
  const list = ref<AssetSimpleReturn[]>([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)

  let lastParams: Record<string, string | number> = {}

  const fetchList = async (page: number, extraParams: Record<string, string | number>) => {
    loading.value = true
    try {
      const params = { page, page_size: pageSize.value, ...extraParams }
      const response: AssetListSimpleResponse = await assetAPI.searchAvailableAssets(params)
      list.value = response.results
      total.value = response.count
      currentPage.value = page
    } catch (error) {
      console.error('[useExportableAssets] 获取可出库资产失�?', error)
      ElMessage.error('加载可出库资产列表失�?)
      list.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  const search = async (params?: Record<string, string | number>) => {
    if (params !== undefined) lastParams = params
    await fetchList(1, lastParams)
  }

  const changePage = async (page: number) => {
    if (page === currentPage.value) return
    await fetchList(page, lastParams)
  }

  const reset = () => {
    currentPage.value = 1
    total.value = 0
    list.value = []
    lastParams = {}
  }

  return { list, loading, total, currentPage, pageSize, search, changePage, reset }
}
