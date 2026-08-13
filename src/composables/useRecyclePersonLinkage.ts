/**
 * @file 回收人姓名-工号联动（自动完成建议、选中、名称反查）
 * @module composables/useRecyclePersonLinkage
 * @exports
 *   - useRecyclePersonLinkage: 回收人联动 composable
 * @callers
 *   - components/componentsdetails/detils/RecycleAssetForm.vue
 * @dependsOn
 *   - types/user: EmployeeExtended 类型
 *   - composables/useSuggestionFetcher: 通用建议获取器
 */
import { ref, watch } from 'vue'
import type { EmployeeExtended } from '@/types/user'
import { createSuggestionFetcher } from '@/composables/useSuggestionFetcher'

export function useRecyclePersonLinkage(
  getByName: (name: string) => Promise<EmployeeExtended[]>,
  getById: (code: string) => Promise<EmployeeExtended | null>,
  onJobcodeChange: (code: string) => void,
) {
  const name = ref('')

  const getCodeByName = async (n: string): Promise<string | null> => {
    const employees = await getByName(n)
    return employees?.length ? employees[0].employee_jobcode : null
  }

  const getNameByCode = async (code: string): Promise<string | null> => {
    const employee = await getById(code)
    return employee?.employee_name ?? null
  }

  const userSuggestions = createSuggestionFetcher<
    EmployeeExtended,
    EmployeeExtended & { value: string }
  >({
    fetchData: async (query: string) => (await getByName(query)) || [],
    filter: () => true,
    transform: (item) => ({ ...item, value: item.employee_jobcode }),
    keywordMatch: (item, keyword) => item.employee_name.includes(keyword),
  })

  const handleSelect = (suggestion: EmployeeExtended & { value: string }) => {
    name.value = suggestion.employee_name || ''
    onJobcodeChange(suggestion.employee_jobcode)
  }

  const setName = (n: string) => {
    name.value = n
  }

  watch(name, async (n) => {
    if (!n) {
      onJobcodeChange('')
      return
    }
    const code = await getCodeByName(n)
    if (code) onJobcodeChange(code)
  })

  return { name, userSuggestions, handleSelect, setName, getNameByCode }
}
