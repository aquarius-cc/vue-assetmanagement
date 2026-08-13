/**
 * @file 自动完成字段通用处理（选中/变更/清除），消除重复的 selectedXxx 模式
 * @module composables/useAutocompleteField
 * @exports
 *   - useAutocompleteField: 创建自动完成字段 handler 集合
 * @callers
 *   - composables/useOutAssetForm: 出库表单申请人/保管人字段
 *   - components/componentsdetails/detils/OutAssetForm.vue
 * @dependsOn
 *   - vue: ref 响应式
 */
import { ref } from 'vue'

interface AutocompleteFieldOptions {
  /** 表单对象（reactive） */
  form: Record<string, unknown>
  /** 选中项在表单中的显示名字段 */
  nameField: string
  /** 选中项在表单中的编码字段 */
  codeField: string
  /** 建议项中取显示名的 key */
  itemKey?: string
  /** 建议项中取编码的 key */
  codeKey?: string
}

/**
 * 创建一个自动完成字段的通用 handler 集合
 *
 * @example
 * const assetField = useAutocompleteField({
 *   form: outAssetCreateExtendedForm,
 *   nameField: 'outasset_name',
 *   codeField: 'outasset_code',
 *   itemKey: 'asset_name',
 *   codeKey: 'asset_code',
 * })
 * // 模板中:
 * // @select="assetField.handleSelect"
 * // @change="assetField.handleChange"
 */
export function useAutocompleteField(options: AutocompleteFieldOptions) {
  const { form, nameField, codeField, itemKey = 'value', codeKey = 'code' } = options

  const selectedItem = ref<Record<string, unknown> | null>(null)

  const handleSelect = (item: Record<string, unknown>) => {
    selectedItem.value = item
    form[nameField] = item[itemKey] as string
    form[codeField] = item[codeKey] as string
  }

  const handleChange = (value: string) => {
    if (selectedItem.value?.[itemKey] !== value) {
      selectedItem.value = null
      form[codeField] = ''
    }
  }

  const clear = () => {
    selectedItem.value = null
    form[nameField] = ''
    form[codeField] = ''
  }

  return { selectedItem, handleSelect, handleChange, clear }
}
