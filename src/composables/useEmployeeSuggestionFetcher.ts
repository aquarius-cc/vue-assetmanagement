// src/composables/useEmployeeSuggestionFetcher.ts
/**
 * [HR-02] 员工建议获取器 Composable
 * @description 基于 createSuggestionFetcher 封装员工搜索建议，
 *   用于 el-autocomplete 下拉展示 部门/姓名/工号。
 * @usage
 *   const fetchEmployeeSuggestions = useEmployeeSuggestionFetcher()
 *   // 在 el-autocomplete 的 :fetch-suggestions 中使用
 */
import { createSuggestionFetcher } from '@/composables/useSuggestionFetcher'
import { userAPI } from '@/api/user'
import type { EmployeeExtended } from '@/utils/User'
import type { EmployeeAutocompleteItem } from '@/utils/OutAsset'

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
