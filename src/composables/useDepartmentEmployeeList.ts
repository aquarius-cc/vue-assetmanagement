/**
 * @file 部门人员列表管理（加载、排序、筛选、批量删除）
 * @module composables/useDepartmentEmployeeList
 * @exports
 *   - useDepartmentEmployeeList: 部门人员列表 composable
 * @callers
 *   - components/componentsdetails/components/DepartmentEmployeeList.vue
 * @dependsOn
 *   - stores/departmentStore: 部门员工获取
 *   - stores/userStore: 用户删除/批量删除
 *   - api/user: 排序保存 API
 *   - utils/errorHandler: 错误处理
 *   - types/user: EmployeeExtended 类型
 *   - types/department: 部门树节点类型
 */
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getDepartmentEmployees } from '@/stores/departmentStore'
import { userAPI } from '@/api/user'
import { showErrorMessage } from '@/utils/errorHandler'
import { useUserStore } from '@/stores/userStore'
import type { EmployeeExtended, EmployeeStatus } from '@/types/user'
import type { DepartmentTreeNode, DepartmentEmployeeListQueryParams } from '@/types/department'

interface Props {
  departmentCode: string
  departmentName: string
  isRoot?: boolean
  departmentTree?: DepartmentTreeNode[]
}

export function useDepartmentEmployeeList(props: Props) {
  const router = useRouter()
  const userStore = useUserStore()

  const employeeList = ref<EmployeeExtended[]>([])
  const originalList = ref<EmployeeExtended[]>([])
  const isLoading = ref(false)
  const isSortMode = ref(false)
  const isSavingSort = ref(false)
  const isBatchDeleting = ref(false)
  const selectedRows = ref<EmployeeExtended[]>([])
  const currentPage = ref(1)
  const pageSize = ref(10)
  const filterStatus = ref<'' | EmployeeStatus>('')
  const tableRef = ref<InstanceType<(typeof import('element-plus'))['ElTable']> | null>(null)

  const statusOptions = [
    { label: '全部', value: '' },
    { label: '在职', value: 'active' as EmployeeStatus },
    { label: '离职', value: 'left' as EmployeeStatus },
    { label: '退休', value: 'retirement' as EmployeeStatus },
  ]

  const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return employeeList.value.slice(start, start + pageSize.value)
  })

  const extractAllDepartmentCodes = (nodes: DepartmentTreeNode[]): string[] => {
    const codes: string[] = []
    for (const node of nodes) {
      codes.push(node.department_code)
      if (node.children?.length) codes.push(...extractAllDepartmentCodes(node.children))
    }
    return codes
  }

  const loadEmployeeList = async () => {
    try {
      isLoading.value = true
      const queryParams: DepartmentEmployeeListQueryParams = {}
      if (filterStatus.value) queryParams.status = filterStatus.value
      if (props.isRoot && props.departmentTree && props.departmentTree.length > 0) {
        const allCodes = extractAllDepartmentCodes(props.departmentTree)
        const allEmployees = await Promise.all(
          allCodes.map((code) => getDepartmentEmployees(code, queryParams)),
        )
        const employeeMap = new Map<string, EmployeeExtended>()
        allEmployees.flat().forEach((emp) => employeeMap.set(emp.employee_jobcode, emp))
        employeeList.value = Array.from(employeeMap.values())
      } else {
        employeeList.value = await getDepartmentEmployees(props.departmentCode, queryParams)
      }
    } catch (error) {
      showErrorMessage(error, '加载人员列表失败')
    } finally {
      isLoading.value = false
    }
  }

  const resetFilters = () => {
    filterStatus.value = ''
    currentPage.value = 1
    tableRef.value?.clearSelection()
    selectedRows.value = []
  }

  const handleStatusFilterChange = () => {
    currentPage.value = 1
    loadEmployeeList()
  }
  const handleSelectionChange = (rows: EmployeeExtended[]) => {
    selectedRows.value = rows
  }

  const toggleSortMode = () => {
    if (!isSortMode.value) {
      originalList.value = [...employeeList.value]
      tableRef.value?.clearSelection()
      selectedRows.value = []
    }
    isSortMode.value = !isSortMode.value
  }

  const cancelSortMode = () => {
    employeeList.value = [...originalList.value]
    isSortMode.value = false
  }

  const moveEmployee = (index: number, direction: number) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= employeeList.value.length) return
    const temp = employeeList.value[index]
    employeeList.value[index] = employeeList.value[newIndex]
    employeeList.value[newIndex] = temp
    employeeList.value.forEach((item, idx) => {
      item.sort_order = idx
    })
  }

  const saveSortOrder = async () => {
    try {
      isSavingSort.value = true
      const sortData = employeeList.value.map((item, index) => ({
        employee_jobcode: item.employee_jobcode,
        sort_order: index,
      }))
      await userAPI.batchUpdateSort(sortData)
      ElMessage.success('排序保存成功')
      isSortMode.value = false
      await loadEmployeeList()
    } catch (error) {
      showErrorMessage(error, '保存排序失败')
    } finally {
      isSavingSort.value = false
    }
  }

  const handleAddEmployee = () => {
    router.push({ name: 'DeptUserForm', query: { department_code: props.departmentCode } })
  }
  const handleEditEmployee = (row: EmployeeExtended) => {
    router.push({ name: 'DeptUserForm', query: { jobcode: row.employee_jobcode } })
  }
  const handleRowClick = (row: EmployeeExtended) => {
    if (!isSortMode.value) handleEditEmployee(row)
  }
  const handleBatchImport = () => {
    router.push({ name: 'DeptUserBatchImport', query: { department_code: props.departmentCode } })
  }

  const handleDeleteEmployee = async (row: EmployeeExtended) => {
    try {
      await userStore.remove(row.employee_jobcode)
      ElMessage.success('删除成功')
      await loadEmployeeList()
    } catch (error) {
      showErrorMessage(error, '删除人员失败')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRows.value.length === 0) {
      ElMessage.warning('请先选择要删除的数据')
      return
    }
    const jobcodes = selectedRows.value
      .map((row) => row.employee_jobcode)
      .filter((code): code is string => !!code)
    if (jobcodes.length === 0) {
      ElMessage.error('无法删除：选中的数据缺少唯一标识')
      return
    }
    try {
      await ElMessageBox.confirm(
        `确定要删除选中的 ${jobcodes.length} 条数据吗？删除后数据不可恢复！`,
        '批量删除确认',
        { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' },
      )
      isBatchDeleting.value = true
      const result = await userStore.removeBatch(jobcodes)
      if (result && 'fail_count' in result && result.fail_count > 0)
        ElMessage.warning(`成功删除 ${result.success_count} 条，失败 ${result.fail_count} 条`)
      else ElMessage.success(`成功删除 ${jobcodes.length} 条数据`)
      tableRef.value?.clearSelection()
      selectedRows.value = []
      await loadEmployeeList()
    } catch (error) {
      if (error === 'cancel') return
      showErrorMessage(error, '批量删除失败')
    } finally {
      isBatchDeleting.value = false
    }
  }

  watch(
    [() => props.departmentCode, () => props.isRoot, () => props.departmentTree],
    () => {
      resetFilters()
      const treeNotEmpty = props.departmentTree && props.departmentTree.length > 0
      if (props.isRoot && treeNotEmpty) loadEmployeeList()
      else if (!props.isRoot) loadEmployeeList()
    },
    { immediate: true },
  )

  return {
    employeeList,
    isLoading,
    isSortMode,
    isSavingSort,
    isBatchDeleting,
    tableRef,
    selectedRows,
    currentPage,
    pageSize,
    filterStatus,
    statusOptions,
    paginatedData,
    loadEmployeeList,
    resetFilters,
    handleStatusFilterChange,
    handleSelectionChange,
    toggleSortMode,
    cancelSortMode,
    moveEmployee,
    saveSortOrder,
    handleAddEmployee,
    handleEditEmployee,
    handleRowClick,
    handleBatchImport,
    handleDeleteEmployee,
    handleBatchDelete,
  }
}
