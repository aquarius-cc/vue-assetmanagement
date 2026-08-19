/**
 * @file 可报废资产列表管理（状态为 in_use/recycled_pending/broken/lost）
 * @module composables/useScrapableAssets
 * @callers
 *   - components/componentsdetails/detils/detilschildcomponents/ScrapableAssetsSearch.vue
 * @dependsOn
 *   - composables/usePagedList: 通用分页逻辑
 *   - stores/assetStore: combineSearch API
 */
import { useAssetStore } from '@/stores/assetStore'
import type { AssetDetail } from '@/types/asset'
import type { PaginationQuery } from '@/stores/createEntityStore'
import { usePagedList, type PagedListReturn } from './usePagedList'

/** 保留类型别名以兼容外部引用 */
export type UseScrapableAssetsReturn = PagedListReturn<AssetDetail>

/**
 * 可报废资产列表 Composable
 * 查询资产状态为 in_use / recycled_pending / broken / lost 的资产
 */
export function useScrapableAssets(): UseScrapableAssetsReturn {
  const assetStore = useAssetStore()

  return usePagedList<AssetDetail>({
    tag: 'useScrapableAssets',
    errorMessage: '加载可报废资产列表失败',
    fixedParams: { asset_current_status__in: 'in_use,recycled_pending,broken,lost' },
    fetcher: (params) => assetStore.combineSearch(params as PaginationQuery),
  })
}
