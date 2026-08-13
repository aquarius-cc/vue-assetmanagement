/**
 * @file 通用列表页 PaginationSearchConfig 工厂，消除 Details 页面的 storeConfig 重复
 * @module composables/useSmartListConfig
 * @exports
 *   - useSmartListConfig: 列表页配置工厂 composable
 * @callers
 *   - components/commoncomponents/SmartListContainer.vue
 *   - components/componentsdetails/*Details.vue（各实体列表页）
 * @dependsOn
 *   - composables/usePaginationSearch: PaginationSearchConfig 类型
 *   - stores/createEntityStore: PaginationQuery 类型
 */
import { computed } from 'vue'
import type { PaginationSearchConfig } from './usePaginationSearch'
import type { PaginationQuery } from '@/stores/createEntityStore'

/**
 * createEntityStore 的最小接口（仅声明 useSmartListConfig 所需的字段）
 * 避免引入完整 Store 类型导致循环依赖
 */
interface SmartStore<T> {
  getList: (params: PaginationQuery) => Promise<T[]>
  pagination: { page: number; page_size: number; total: number }
  list: T[]
  loading: boolean
  refreshFlag: boolean
  setRefreshFlag: (flag: boolean) => void
}

interface SmartListConfigOptions<T> {
  /** createEntityStore 实例 */
  store: SmartStore<T>
  /** 实体中文名，用于默认消息（如 "硬盘序列号"） */
  entityName: string
  /** 可选：自定义 getList 逻辑（如 OperationLog 需合并筛选参数） */
  customGetList?: (params: PaginationQuery) => Promise<{ count: number; results: T[] }>
  /** 可选：默认每页条数 */
  defaultPageSize?: number
  /** 可选：自定义消息覆盖 */
  messages?: Partial<{ loadFailed: string; searchFailed: string; invalidPage: string }>
  /** 可选：搜索时附加的额外参数 */
  searchExtraParams?: Record<string, string>
}

/**
 * 生成 PaginationSearchConfig，消除 7 个列表页的 storeConfig 锅炉plate
 *
 * @example
 * const storeConfig = useSmartListConfig({
 *   store: harddiskSnStore,
 *   entityName: '硬盘序列号',
 * })
 * // 传给 SmartListContainer: <SmartListContainer :store-config="storeConfig" />
 */
export function useSmartListConfig<T>(options: SmartListConfigOptions<T>) {
  const {
    store,
    entityName,
    customGetList,
    defaultPageSize = 20,
    messages: msgOverrides,
    searchExtraParams,
  } = options

  const messages = {
    loadFailed: `加载${entityName}列表失败`,
    searchFailed: `搜索${entityName}失败`,
    invalidPage: '页码超出范围，已跳转至最后一页',
    ...msgOverrides,
  }

  const config: PaginationSearchConfig<T> = {
    store: {
      getList: customGetList
        ? async (params) => {
            const resp = await customGetList(params as PaginationQuery)
            return { count: resp.count, results: resp.results, next: null, previous: null }
          }
        : async (params) => {
            const results = await store.getList(params)
            return {
              count: store.pagination.total,
              results,
              next: null,
              previous: null,
            }
          },
      pagination: {
        page: {
          get: () => store.pagination.page,
          set: (val: number) => {
            store.pagination.page = val
          },
        },
        page_size: {
          get: () => store.pagination.page_size,
          set: (val: number) => {
            store.pagination.page_size = val
          },
        },
        total: {
          get: () => store.pagination.total,
          set: (val: number) => {
            store.pagination.total = val
          },
        },
      },
      list: computed(() => store.list),
      loading: computed(() => store.loading),
      refreshFlag: computed(() => store.refreshFlag),
      setRefreshFlag: (flag: boolean) => store.setRefreshFlag(flag),
    },
    search: {
      performSearch: async (keyword: string, page: number, page_size: number) => {
        const params: PaginationQuery = { search: keyword, page, page_size, ...searchExtraParams }
        if (customGetList) {
          const resp = await customGetList(params)
          return { count: resp.count, results: resp.results }
        }
        const results = await store.getList(params)
        return { count: store.pagination.total, results }
      },
    },
    defaultPageSize,
    messages,
  }

  return config
}
