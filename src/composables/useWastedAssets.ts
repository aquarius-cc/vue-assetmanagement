/**
 * @file 已报废资产列表管理（状态为 scrapped）
 * @module composables/useWastedAssets
 * @callers
 *   - components/componentsdetails/detils/detilschildcomponents/WastedAssetsSearch.vue
 * @dependsOn
 *   - composables/usePagedList: 通用分页逻辑
 *   - stores/assetStore: searchAssets API
 */
import { useAssetStore } from '@/stores/assetStore'
import type { AssetDetail } from '@/types/asset'
import type { PaginationQuery } from '@/stores/createEntityStore'
import { usePagedList, type PagedListReturn } from './usePagedList'

/** 保留类型别名以兼容外部引用 */
export type UseWastedAssetsReturn = PagedListReturn<AssetDetail>

/**
 * 已报废资产列表 Composable
 * 查询资产状态为 scrapped 的资产
 */
export function useWastedAssets(): UseWastedAssetsReturn {
  const assetStore = useAssetStore()

  return usePagedList<AssetDetail>({
    tag: 'useWastedAssets',
    errorMessage: '加载已报废资产列表失败',
    fixedParams: { asset_current_status: 'scrapped' },
    fetcher: (params) => assetStore.searchAssets(params as PaginationQuery),
  })
}
