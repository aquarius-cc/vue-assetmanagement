import { logError } from '@/utils/logger'

/**
 * @file 通用建议获取器工厂，适配 el-autocomplete 的 fetch-suggestions 签名
 * @module composables/useSuggestionFetcher
 * @exports
 *   - createSuggestionFetcher: 创建建议获取函数
 *   - SuggestionFetcherOptions: 配置选项类型
 * @callers
 *   - composables/useEmployeeSuggestionFetcher
 *   - composables/useRecyclePersonLinkage
 *   - components/componentsdetails/detils/*Form.vue（各表单组件）
 * @dependsOn
 *   - （无外部依赖，纯函数式工厂）
 */
export interface SuggestionFetcherOptions<T, R> {
  /** 获取原始数据的异步函数，参数为查询关键词 */
  fetchData: (query: string) => Promise<T[]>
  /** 可选：过滤函数（前端过滤） */
  filter?: (item: T) => boolean
  /** 可选：排序比较函数 */
  sort?: (a: R, b: R) => number
  /** 将原始数据转换为建议项 */
  transform: (item: T) => R
  /** 可选：关键词匹配函数（前端二次过滤），若不提供则不过滤 */
  keywordMatch?: (item: R, keyword: string) => boolean
}

/**
 * 创建建议获取函数
 * @example
 * const fetchAssetSuggestions = createSuggestionFetcher({
 *   fetchData: (q) => assetStore.getByName(q),
 *   filter: (asset) => asset.asset_current_status === 'in_store',
 *   transform: (asset) => ({ value: asset.asset_name, ... })
 * })
 */
export function createSuggestionFetcher<T, R>(options: SuggestionFetcherOptions<T, R>) {
  const { fetchData, filter, sort, transform, keywordMatch } = options
  // [BF-095/M-9] 乱序守卫：连续触发时仅最后一次调用的响应可回填 cb，
  // 过期响应（网络抖动下旧请求后到）直接丢弃，防建议列表被旧数据覆盖。
  let fetchSeq = 0

  return async (queryString: string, cb: (results: R[]) => void) => {
    if (!queryString || queryString.trim() === '') {
      fetchSeq++ // 清空输入同样使在途请求过期
      cb([])
      return
    }

    const seq = ++fetchSeq

    try {
      // 1. 获取原始数据
      let items = await fetchData(queryString.trim())
      if (seq !== fetchSeq) return // 过期响应丢弃，不覆盖新结果

      // 2. 前端过滤
      if (filter) {
        items = items.filter(filter)
      }

      // 3. 转换为建议项
      let suggestions = items.map(transform)

      // 4. 关键词二次过滤（可选）
      if (keywordMatch) {
        suggestions = suggestions.filter((item) => keywordMatch(item, queryString))
      }

      // 5. 排序
      if (sort) {
        suggestions.sort(sort)
      }

      cb(suggestions)
    } catch (error) {
      logError('composables/useSuggestionFetcher', '获取建议失败:', error)
      if (seq === fetchSeq) cb([])
    }
  }
}
