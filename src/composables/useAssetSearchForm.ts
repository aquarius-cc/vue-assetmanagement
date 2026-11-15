/**
 * [批次4 C4/M-14] 搜索表单唯一实现（DR-1 收敛）：reactive 表单 + 空值过滤 extraParams
 * + handleSearch（重置页码 → searched → search(extraParams)）。
 * 键名逐字保留自各组件原 SearchForm；模板 v-model 不变。
 */
import { reactive, ref } from 'vue'

interface UseAssetSearchFormOptions<T extends object> {
  /** 表单初值（键名逐字保留） */
  initial: T
  /** 数据层 search 入口（useXxxAssets().search） */
  search: (params: Record<string, string>) => Promise<unknown> | unknown
  /** 搜索前重置页码回调；不传则不重置（Exportable 链内部自重置） */
  resetPage?: () => void
}

export function useAssetSearchForm<T extends object>(options: UseAssetSearchFormOptions<T>) {
  // 初值拷贝：两次实例化不共享引用（避免组件间状态串扰）
  const searchForm = reactive<T>({ ...options.initial })
  // 标记是否已执行过搜索（用于显示无数据提示）
  const searched = ref(false)

  /**
   * 构建传给数据层的额外查询参数。
   * 过滤掉空字符串字段（含纯空格），避免后端收到无意义的参数。
   */
  const buildExtraParams = (): Record<string, string> => {
    const params: Record<string, string> = {}
    // T 约束为全 string 字段的表单类型（interface 无隐式 index signature，故此处收窄）
    Object.entries(searchForm as Record<string, string>).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        params[key] = value.trim()
      }
    })
    return params
  }

  /** 搜索处理：重置到第一页（可选），标记 searched，并以过滤后参数发起请求 */
  const handleSearch = async () => {
    if (options.resetPage) {
      options.resetPage()
    }
    searched.value = true
    const extraParams = buildExtraParams()
    await options.search(extraParams)
  }

  return { searchForm, searched, buildExtraParams, handleSearch }
}
