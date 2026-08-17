// === employeeStore.ts ===
// 使用 Pinia Setup Store（符合前端设计令牌 FR-3，状态管理必须使用 Pinia）
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { EMPLOYEE_STATUS_MAP } from '@/utils/statusMapping'

// 使用后端枚举定义的类型（通过定义响应式 store，确保TypeScript类型安全）
export type EmployeeStatus = 'active' | 'left' | 'retirement'

export const useEmployeeStore = defineStore('employee', () => {
  // 响应式状态
  const employees = ref<Employee[]>([])
  const currentEmployee = ref<Employee | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性 - 员工状态过滤
  const activeEmployees = computed(() => 
    employees.value.filter(emp => emp.status === 'active')
  )
  
  const employeesByStatus = computed(() => {
    const grouped: Record<EmployeeStatus, Employee[]> = {
      active: [],
      left: [],
      retirement: []
    }
    
    employees.value.forEach(emp => {
      if (grouped[emp.status as EmployeeStatus]) {
        grouped[emp.status as EmployeeStatus].push(emp)
      }
    })
    
    return grouped
  })

  // 计算属性 - 状态标签显示
  const getEmployeeStatusLabel = (status: EmployeeStatus): string => {
    return EMPLOYEE_STATUS_MAP[status]?.label || status
  }

  const getEmployeeStatusTagType = (status: EmployeeStatus): 'success' | 'warning' | 'danger' | 'info' | 'primary' => {
    return EMPLOYEE_STATUS_MAP[status]?.type || 'info'
  }

  // API 方法
  async function fetchEmployees() {
    loading.value = true
    error.value = null
    
    try {
      // TODO: 实际API调用
      // const response = await api.get<Employee[]>('/employees')
      // employees.value = response.data
      console.log('API集成待完成')
    } catch (err) {
      error.value = '获取员工列表失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createEmployee(employeeData: Partial<Employee>) {
    loading.value = true
    error.value = null
    
    try {
      // TODO: 实际API调用
      // const response = await api.post<Employee>('/employees', employeeData)
      // employees.value.push(response.data)
      console.log('创建员工API集成待完成')
    } catch (err) {
      error.value = '创建员工失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateEmployeeStatus(employeeId: string, status: EmployeeStatus) {
    loading.value = true
    error.value = null
    
    try {
      // TODO: 实际API调用
      // const response = await api.patch<Employee>(`/employees/${employeeId}/status`, { status })
      const index = employees.value.findIndex(emp => emp.id === employeeId)
      if (index !== -1) {
        employees.value[index].status = status
      }
      console.log('更新员工状态API集成待完成')
    } catch (err) {
      error.value = '更新员工状态失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 工具方法
  const validateEmployeeStatus = (status: string): status is EmployeeStatus => {
    return ['active', 'left', 'retirement'].includes(status)
  }

  const getEmployeesByStatus = (status: EmployeeStatus): Employee[] => {
    return employees.value.filter(emp => emp.status === status)
  }

  // 重置状态
  function $reset() {
    employees.value = []
    currentEmployee.value = null
    error.value = null
  }

  return {
    // 状态
    employees,
    currentEmployee,
    loading,
    error,
    
    // 计算属性
    activeEmployees,
    employeesByStatus,
    
    // 方法
    fetchEmployees,
    createEmployee,
    updateEmployeeStatus,
    getEmployeeStatusLabel,
    getEmployeeStatusTagType,
    validateEmployeeStatus,
    getEmployeesByStatus,
    $reset,
  }
})

// 类型定义
interface Employee {
  id: string
  name: string
  employeeId: string
  department: string
  position: string
  status: EmployeeStatus
  hireDate: string
  phone: string
  email: string
  remark?: string
}