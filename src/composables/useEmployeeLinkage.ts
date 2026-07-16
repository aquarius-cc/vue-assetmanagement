// composables/useEmployeeLinkage.ts
// 姓名/工号联动通用逻辑（从 useAssetFormHelpers 拆分）
import { ref } from 'vue'
import type { UserSuggestion } from './useAssetFormHelpers'

/** 用户基本数据结构（用于联动回调） */
interface EmployeeData {
  employee_name: string
  employee_jobcode: string
  employee_department_name?: string | null
}

export function useEmployeeLinkage(
  getUserByName: (name: string) => Promise<EmployeeData[]>,
  getUserByCode: (code: string) => Promise<EmployeeData | null>,
  onUpdate: (name: string, code: string) => void,
) {
  const selectFlag = ref(true)

  /** 自动完成建议 */
  const fetchSuggestions = async (queryString: string, cb: (results: UserSuggestion[]) => void) => {
    if (!queryString) {
      cb([])
      return
    }
    try {
      const users = await getUserByName(queryString)
      const suggestions: UserSuggestion[] = users.map((u) => ({
        value: u.employee_name,
        user_name: u.employee_name,
        user_jobcode: u.employee_jobcode,
        department_name: u.employee_department_name ?? '',
      }))
      cb(suggestions)
    } catch {
      cb([])
    }
  }

  /** 选中建议 */
  const handleSelect = (item: UserSuggestion) => {
    selectFlag.value = false
    onUpdate(item.user_name, item.user_jobcode)
  }

  /** 姓名输入变更 */
  const handleNameChange = async (name: string) => {
    if (!selectFlag.value) {
      selectFlag.value = true
      return
    }
    if (!name.trim()) {
      onUpdate('', '')
      return
    }
    try {
      const users = await getUserByName(name)
      if (users.length > 1) {
        const codes = users.map((u) => u.employee_jobcode).join(', ')
        onUpdate(name, `${codes} (请选择一个正确工号`)
      } else if (users.length === 1) {
        onUpdate(users[0].employee_name, users[0].employee_jobcode)
      } else {
        onUpdate(name, '姓名错误，无对应工号')
      }
    } catch {
      onUpdate(name, '查询失败，无法验证工号')
    }
  }

  /** 工号变更 */
  const handleCodeChange = async (code: string) => {
    if (!code) {
      onUpdate('', '')
      return
    }
    try {
      const user = await getUserByCode(code)
      if (user) {
        onUpdate(user.employee_name ?? '', user.employee_jobcode)
      } else {
        onUpdate('工号错误，无对应姓名', code)
      }
    } catch {
      onUpdate('查询失败', code)
    }
  }

  return { fetchSuggestions, handleSelect, handleNameChange, handleCodeChange }
}
