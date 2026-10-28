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
import { logError } from '@/utils/logger'
import { notifyCallerError } from '@/utils/errorHandler'

export function useExportableAssets() {
  const list = ref<AssetSimpleReturn[]>([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)

  let lastParams: Record<string, string | number> = {}

  // [AUD-48] 回滚锚：最近一次成功加载的页码；新搜索前重置为 1（失败回 1 而非旧页）
  let lastLoadedPage = 1

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
      lastLoadedPage = page // [AUD-48] 成功锚定
    } catch (error) {
      if (seq !== listRequestSeq) return // 过期响应：跳过错误清空
      logError('composables/useExportableAssets', '[useExportableAssets] 获取可出库资产失败', error)
      // [M-RC-09] 单出口：AxiosError 由拦截器已提示，仅非 AxiosError 弹一次
      notifyCallerError(error, '加载可出库资产列表失败')
      list.value = []
      total.value = 0
      // [AUD-48] 回滚乐观写的页码到最近成功页：失败页不被早退守卫锁死, 可重试
      currentPage.value = lastLoadedPage
    } finally {
      if (seq === listRequestSeq) loading.value = false
    }
  }

  const search = async (params?: Record<string, string | number>) => {
    if (params !== undefined) lastParams = params
    lastLoadedPage = 1 // [AUD-48] 新查询重置锚：搜索失败回第 1 页
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
