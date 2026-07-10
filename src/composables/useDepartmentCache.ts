/**
 * useDepartmentCache
 * 部门信息缓存，按工号预取部门名称
 */
import { reactive } from 'vue'
import type { DepartmentBrief } from '@/utils/Department'
import { userAPI } from '@/api/user'

export function useDepartmentCache() {
  const cache = reactive<Record<string, DepartmentBrief>>({})

  const prefetch = async (jobcodes: string[]) => {
    const missing = [...new Set(jobcodes.filter((jc) => jc && !(jc in cache)))]
    if (missing.length === 0) return
    const results = await Promise.allSettled(missing.map((jc) => userAPI.getEmployeeDepartment(jc)))
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') cache[missing[i]] = result.value
    })
  }

  const getDeptName = (jobcode: string | undefined): string => {
    return jobcode ? (cache[jobcode]?.department_name ?? '') : ''
  }

  return { cache, prefetch, getDeptName }
}
