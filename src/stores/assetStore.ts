/**
 * 资产管理 Store
 * 基于 createEntityStore 工厂创建，支持缓存、防重、分页 * 扩展自定义搜索方泀searchAssets（用于复杂条件搜索）
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { assetAPI } from '@/api/asset'
import type { AssetDetail, AssetCreateForm, AssetUpdateForm, AssetListResponse } from '@/types/asset'
import { ElMessage } from 'element-plus'
import type { PaginationQuery, EntityStore } from '@/stores/createEntityStore'

type StrictQueryParams = {
  page: number
  page_size: number
  [key: string]: string | number
}

/**
 * 资产 Store 接口（包含自定义方法 searchAssets 咀combineSearch＀ */
interface AssetStore extends EntityStore<AssetDetail, PaginationQuery> {
  /**
   * 自定义资产搜索（支持多字段模糊查询）
   * 使用后端 search_assets action
   * @param params 查询参数
   * @returns 资产列表响应（包吀count 咀results＀   */
  searchAssets: (params: PaginationQuery & Record<string, string | number>) => Promise<AssetListResponse>

  /**
   * 联合搜索资产（多条件组合搜索＀   * 使用后端 combine_search action
   * @param params 搜索参数（支持模糊匹配和精确匹配＀   * @returns 资产列表响应（包吀count 咀results＀   */
  combineSearch: (params: Record<string, string | number>) => Promise<AssetListResponse>
}

const baseAssetStoreDef = createEntityStore<AssetDetail, PaginationQuery>('asset', {
  idKey: 'asset_code',
  nameField: 'asset_name',
  displayName: '资产',
  api: {
    getList: async (params?: PaginationQuery) => {
      const safeParams: PaginationQuery = params || {
        page: 1,
        page_size: 10,
      }
      const response = await assetAPI.getAssets(safeParams as unknown as StrictQueryParams)
      return {
        count: response.count,
        results: response.results as AssetDetail[],
      }
    },
    getById: (code) => assetAPI.getAssetByCode(code),
    getByName: async (name: string): Promise<AssetDetail[]> => {
      const response = await assetAPI.getAssetByName(name)
      if (!response || !response.results) {
        return []
      }
      return response.results
    },
    create: (data) => assetAPI.createAsset(data as unknown as AssetCreateForm),
    update: (data) => assetAPI.updateAsset(data as unknown as AssetUpdateForm),
    delete: (code) => assetAPI.deleteAsset(code),
    batchDelete: (codes) => assetAPI.batchDeleteAssets(codes),
  },
  message: ElMessage,
  enablePagination: true,
  defaultPageSize: 20,
  enableCache: false,
  autoSync: true,
})

/**
 * 使用资产管理 Store（带扩展方法＀ * @returns AssetStore 实例
 */
export const useAssetStore = (): AssetStore => {
  const store = baseAssetStoreDef()

  if (!('searchAssets' in store)) {
    const extendedStore = store as unknown as AssetStore
    /**
     * 自定义资产搜索方泀     * 使用后端 search_assets action，支持多条件组合搜索
     * 毀getList({ search }) 更安全：
     * - 使用专用选择噀AssetSelector.search_assets()
     * - 显式过滤 is_deleted=False
     * - 预加载关联信息     * - 参数白名单验诀     */
    extendedStore.searchAssets = async (
      params: PaginationQuery & Record<string, string | number>,
    ) => {
      // 尀search 参数映射一keyword（后竀search action 使用 keyword 参数名）
      const searchParams: Record<string, string | number> = { ...params }
      if (searchParams.search) {
        searchParams.keyword = searchParams.search
        delete searchParams.search
      }
      const response = await assetAPI.searchAssets(searchParams as Parameters<typeof assetAPI.searchAssets>[0])
      return response
    }

    /**
     * 联合搜索资产方法
     * 使用后端 combine_search action，支持多条件组合搜索
     * - asset_name: 模糊匹配
     * - asset_specification: 模糊匹配
     * - asset_brand: 模糊匹配
     * - asset_current_status: 精确匹配
     * - asset_type: 精确匹配
     * - asset_type_category: 精确匹配
     * - asset_storage: 精确匹配
     * - asset_contract: 精确匹配
     *
     * 输出使用 AssetDetailSerializer，包含完整的嵌套关联数据
     */
    extendedStore.combineSearch = async (
      params: Record<string, string | number>,
    ) => {
      // 过滤空值参数，只传递有值的字段
      const cleanParams: Record<string, string | number> = {}
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          cleanParams[key] = value
        }
      })
      const response = await assetAPI.combineSearch(cleanParams as Parameters<typeof assetAPI.combineSearch>[0])
      return response
    }

    return extendedStore
  }

  return store as unknown as AssetStore
}
