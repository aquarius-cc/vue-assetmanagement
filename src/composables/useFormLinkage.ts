/**
 * @file 表单字段联动通用 Composable（el-autocomplete 名称→编码联动）
 * @module composables/useFormLinkage
 * @description
 *   封装「建议获取 → 选择回填 → 失焦兜底匹配」的通用模式，
 *   消除各 Form 组件中 createSuggestionFetcher + handleSelect + handleXxxChange + handleXxxBlur 的重复代码（DR-1）。
 *
 * @callers
 *   - components/componentsdetails/detils/DamagedAssetForm.vue（资产/合同/仓库 3 组联动）
 *   - （预留）UnregisteredAssetForm.vue 等同构表单
 * @dependsOn
 *   - composables/useSuggestionFetcher: createSuggestionFetcher 工厂
 */
import { ElMessage } from 'element-plus'
import { createSuggestionFetcher } from '@/composables/useSuggestionFetcher'

/** 配置项 */
export interface FormLinkageOptions<T> {
  /** 响应式 formData 对象（reactive） */
  formData: Record<string, unknown>
  /** 显示字段名（如 'asset_name_display'） */
  displayField: string
  /** 编码字段名（如 'damaged_asset_code'） */
  codeField: string
  /**
   * 数据获取函数：接收查询关键词，返回原始数据数组
   * 与 createSuggestionFetcher 的 fetchData 对齐
   */
  fetcher: (query: string) => Promise<T[]>
  /** 从建议项中提取显示值（用于 handleSelect + handleBlur） */
  getDisplayValue: (item: Record<string, unknown>) => string
  /** 从建议项中提取编码值（用于 handleSelect + handleBlur） */
  getCodeValue: (item: Record<string, unknown>) => string
}

/** 返回值 */
export interface FormLinkageReturn {
  /** el-autocomplete 的 :fetch-suggestions 绑定 */
  fetchSuggestions: (
    queryString: string,
    cb: (results: { value: string }[]) => void,
  ) => Promise<void>
  /** el-autocomplete 的 @select 绑定 */
  handleSelect: (item: Record<string, unknown>) => void
  /** el-autocomplete 的 @change 绑定 */
  handleNameChange: (value: string) => void
  /** el-autocomplete 的 @blur 绑定 */
  handleNameBlur: (event: FocusEvent) => Promise<void>
}

/**
 * 表单字段联动 Composable
 *
 * @example
 * ```ts
 * const assetLinkage = useFormLinkage<AssetDetail>({
 *   formData,
 *   displayField: 'asset_name_display',
 *   codeField: 'damaged_asset_code',
 *   fetcher: (q) => assetStore.getByName(q),
 *   getDisplayValue: (a) => a.asset_name,
 *   getCodeValue: (a) => a.recordcode,
 * })
 * // 模板绑定
 * // :fetch-suggestions="assetLinkage.fetchSuggestions"
 * // @select="assetLinkage.handleSelect"
 * // @change="assetLinkage.handleNameChange"
 * // @blur="assetLinkage.handleNameBlur"
 * ```
 */
export function useFormLinkage<T extends Record<string, unknown>>(
  options: FormLinkageOptions<T>,
): FormLinkageReturn {
  const { formData, displayField, codeField, fetcher, getDisplayValue, getCodeValue } = options

  /** 建议获取（适配 createSuggestionFetcher 签名） */
  const fetchSuggestions = createSuggestionFetcher<T, { value: string }>({
    fetchData: fetcher,
    transform: (item: T) => ({ value: getDisplayValue(item) }),
  })

  /** 选择建议项：回填显示值 + 编码值 */
  const handleSelect = (item: Record<string, unknown>) => {
    formData[displayField] = getDisplayValue(item)
    formData[codeField] = getCodeValue(item)
  }

  /** 输入值变化：空值时清空编码字段 */
  const handleNameChange = (value: string) => {
    if (!value.trim()) {
      formData[codeField] = ''
    }
  }

  /** 失焦兜底：若编码未匹配，按名称重新查询取第一条 */
  const handleNameBlur = async (event: FocusEvent) => {
    const currentValue = (event.target as HTMLInputElement).value
    if (!currentValue.trim()) {
      formData[codeField] = ''
      return
    }
    if (formData[codeField]) return
    try {
      const items = await fetcher(currentValue.trim())
      if (items && items.length > 0) {
        const first = items[0] as unknown as Record<string, unknown>
        formData[displayField] = getDisplayValue(first)
        formData[codeField] = getCodeValue(first)
      } else {
        formData[codeField] = ''
        ElMessage.warning('未找到匹配的记录')
      }
    } catch {
      formData[codeField] = ''
    }
  }

  return { fetchSuggestions, handleSelect, handleNameChange, handleNameBlur }
}
