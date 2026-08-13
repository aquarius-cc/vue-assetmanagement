/**
 * @file 员工搜索建议获取器，封装 fuzzy search 为 el-autocomplete 的 fetch-suggestions
 * @module composables/useEmployeeSuggestionFetcher
 * @exports
 *   - useEmployeeSuggestionFetcher: 创建员工建议获取函数
 * @callers
 *   - composables/useOutAssetForm: 出库表单员工字段
 *   - composables/useRecyclePersonLinkage: 回收人建议获取
 * @dependsOn
 *   - composables/useSuggestionFetcher: 通用建议获取器工厂
 *   - api/user: 员工模糊搜索 API
 *   - types/user: EmployeeExtended 类型
 *   - types/outasset: EmployeeAutocompleteItem 类型
 */
import { createSuggestionFetcher } from '@/composables/useSuggestionFetcher'
import { userAPI } from '@/api/user'
import type { EmployeeExtended } from '@/types/user'
import type { EmployeeAutocompleteItem } from '@/types/outasset'

/**
 * 创建员工建议获取函数
 * @returns 符合 el-autocomplete fetch-suggestions 签名的函数
 */
export function useEmployeeSuggestionFetcher() {
  return createSuggestionFetcher<EmployeeExtended, EmployeeAutocompleteItem>({
    fetchData: async (query: string) => {
      const response = await userAPI.getFuzzySearch({ keyword: query, page_size: 20 })
      return response.results
    },
    filter: (employee: EmployeeExtended) => employee.employee_status === 'active',
    transform: (employee: EmployeeExtended): EmployeeAutocompleteItem => ({
      value: employee.employee_name,
      employee_name: employee.employee_name,
      employee_jobcode: employee.employee_jobcode,
      employee_department_name: employee.employee_department_name ?? '',
    }),
  })
}
