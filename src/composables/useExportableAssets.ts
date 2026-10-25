/**
 * @file 可出库资产搜索列表管理（状态为 in_store 的资产）
 * @module composables/useExportableAssets
 * @exports
 *   - useExportableAssets: 可出库资产列表 composable
 * @callers
 *   - components/componentsdetails/detils/detilschildcomponents/ExportableAssetsSearch.vue
 * @dependsOn
 *   - api/asset: searchAvailableAssets 接口
 *   - types/asset: 资产简化返回类型
 */
import { ref } from 'vue'
import { assetAPI } from '@/api/asset'
import type { AssetSimpleReturn, AssetListSimpleResponse } from '@/types/asset'
import { ElMessage } from 'element-plus'
import { logError } from '@/utils/logger'

export function useExportableAssets() {
  const list = ref<AssetSimpleReturn[]>([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)

  let lastParams: Record<string, string | number> = {}

  // [M-39] 请求序号：仅最新请求的响应写入状态，丢弃慢响应防止覆盖新数据
  // 范式同 usePagedList [M-14] / useGroupedAssetList [M-22]
  let listRequestSeq = 0

  const fetchList = async (page: number, extraParams: Record<string, string | number>) => {
    const seq = ++listRequestSeq
    loading.value = true
    // [M-39] 请求前写页码：防慢响应到达后才回写导致 currentPage 回退/竞态覆盖
    currentPage.value = page
    try {
      const params = { page, page_size: pageSize.value, ...extraParams }
      const response: AssetListSimpleResponse = await assetAPI.searchAvailableAssets(params)
      if (seq !== listRequestSeq) return // 过期响应：被更新请求取代，跳过状态写回
      list.value = response.results
      total.value = response.count
    } catch (error) {
      if (seq !== listRequestSeq) return // 过期响应：跳过错误清空
      logError('composables/useExportableAssets', '[useExportableAssets] 获取可出库资产失败', error)
      ElMessage.error('加载可出库资产列表失败')
      list.value = []
      total.value = 0
    } finally {
      if (seq === listRequestSeq) loading.value = false
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
