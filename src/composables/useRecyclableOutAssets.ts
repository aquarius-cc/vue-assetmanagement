/**
 * @file 可回收出库资产列表管理（专用接口 /assets/out-assets/recyclable/）
 * @module composables/useRecyclableOutAssets
 * @callers
 *   - components/componentsdetails/detils/detilschildcomponents/RecyclableOutAssetsSearch.vue
 * @dependsOn
 *   - composables/usePagedList: 通用分页逻辑
 *   - api/outAsset: getRecyclableOutAssets 接口
 *   - types/outasset: 出库资产查询与响应类型
 */
import { outAssetAPI } from '@/api/outAsset'
import type { OutAssetQueryParams, RecyclableOutAssetResponse } from '@/types/outasset'
import { usePagedList, type PagedListReturn } from './usePagedList'

type RecyclableOutAssetItem = RecyclableOutAssetResponse['results'][number]

/** 保留类型别名以兼容外部引用 */
export type UseRecyclableOutAssetsReturn = PagedListReturn<RecyclableOutAssetItem>

/**
 * 可回收出库资产列表 Composable
 */
export function useRecyclableOutAssets(): UseRecyclableOutAssetsReturn {
  return usePagedList<RecyclableOutAssetItem>({
    tag: 'useRecyclableOutAssets',
    errorMessage: '加载可回收资产列表失败',
    fixedParams: {},
    fetcher: (params) => outAssetAPI.getRecyclableOutAssets(params as OutAssetQueryParams),
  })
}
