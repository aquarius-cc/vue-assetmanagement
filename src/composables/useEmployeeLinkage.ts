// src/composables/useEmployeeLinkage.ts
/**
 * 员工姓名与工号联动 Composable
 * @description 处理员工姓名和工号之间的双向自动填充和校验
 * @param getCodeByName - 根据姓名获取工号的异步函数（返回工号字符串或 null）
 * @param getNameByCode - 根据工号获取姓名的异步函数（返回姓名字符串或 null）
 * @param onUpdate - 当姓名和工号更新时的回调函数
 */
import { ref } from 'vue'

export function useEmployeeLinkage(
  getCodeByName: (name: string) => Promise<string | null>,
  getNameByCode: (code: string) => Promise<string | null>,
  onUpdate: (name: string, code: string) => void,
) {
  const name = ref('')
  const code = ref('')
  let isUpdating = false

  const normalizeString = (value: unknown): string => {
    if (value == null) return ''
    return String(value)
  }

  const handleNameChange = async (newName: string) => {
    if (isUpdating) return
    isUpdating = true
    try {
      const trimmedName = normalizeString(newName).trim()
      if (!trimmedName) {
        code.value = ''
        onUpdate('', '')
        return
      }
      const fetchedCode = await getCodeByName(trimmedName)
      code.value = normalizeString(fetchedCode)
      onUpdate(trimmedName, code.value)
    } finally {
      isUpdating = false
    }
  }

  const handleCodeChange = async (newCode: string) => {
    if (isUpdating) return
    isUpdating = true
    try {
      const trimmedCode = normalizeString(newCode).trim()
      if (!trimmedCode) {
        name.value = ''
        onUpdate('', '')
        return
      }
      const fetchedName = await getNameByCode(trimmedCode)
      name.value = normalizeString(fetchedName)
      onUpdate(name.value, trimmedCode)
    } finally {
      isUpdating = false
    }
  }

  const setName = (newName: string) => {
    const strName = normalizeString(newName)
    name.value = strName
    handleNameChange(strName)
  }

  const setCode = (newCode: string) => {
    const strCode = normalizeString(newCode)
    code.value = strCode
    handleCodeChange(strCode)
  }

  return {
    name,        // Ref<string>
    code,        // Ref<string>
    handleNameChange,
    handleCodeChange,
    setName,
    setCode,
  }
}
