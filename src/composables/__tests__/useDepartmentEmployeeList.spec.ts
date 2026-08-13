import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { EmployeeExtended } from '@/types/user'

const {
  mockGetDepartmentEmployees,
  mockBatchUpdateSort,
  mockRemove,
  mockRemoveBatch,
  mockShowError,
  mockPush,
  mockConfirm,
} = vi.hoisted(() => ({
  mockGetDepartmentEmployees: vi.fn(async () => [] as EmployeeExtended[]),
  mockBatchUpdateSort: vi.fn(async () => {}),
  mockRemove: vi.fn(async () => {}),
  mockRemoveBatch: vi.fn(async () => ({ success_count: 0, fail_count: 0 })),
  mockShowError: vi.fn(),
  mockPush: vi.fn(),
  mockConfirm: vi.fn(async () => 'confirm'),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: mockConfirm },
}))

vi.mock('@/stores/departmentStore', () => ({
  getDepartmentEmployees: mockGetDepartmentEmployees,
}))

vi.mock('@/api/user', () => ({
  userAPI: { batchUpdateSort: mockBatchUpdateSort },
}))

vi.mock('@/utils/errorHandler', () => ({
  showErrorMessage: mockShowError,
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: () => ({ remove: mockRemove, removeBatch: mockRemoveBatch }),
}))

import { useDepartmentEmployeeList } from '../useDepartmentEmployeeList'
import { ElMessage } from 'element-plus'

const mockElMessageSuccess = vi.mocked(ElMessage.success)
const mockElMessageWarning = vi.mocked(ElMessage.warning)
const mockElMessageError = vi.mocked(ElMessage.error)

function makeEmployee(jobcode: string, extra: Partial<EmployeeExtended> = {}): EmployeeExtended {
  return { employee_jobcode: jobcode, sort_order: 0, ...extra } as EmployeeExtended
}

const baseProps = {
  departmentCode: 'D001',
  departmentName: '研发部',
}

describe('useDepartmentEmployeeList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDepartmentEmployees.mockResolvedValue([])
    mockBatchUpdateSort.mockResolvedValue()
    mockRemove.mockResolvedValue()
    mockRemoveBatch.mockResolvedValue({ success_count: 0, fail_count: 0 })
    mockConfirm.mockResolvedValue('confirm')
  })

  describe('初始加载', () => {
    it('watch immediate 触发按部门加载', async () => {
      useDepartmentEmployeeList(baseProps)

      expect(mockGetDepartmentEmployees).toHaveBeenCalledWith('D001', {})
    })

    it('非根部门加载并写入列表', async () => {
      mockGetDepartmentEmployees.mockResolvedValue([makeEmployee('E001')])
      const { employeeList, isLoading } = useDepartmentEmployeeList(baseProps)
      await flushPromises()

      expect(employeeList.value).toEqual([makeEmployee('E001')])
      expect(isLoading.value).toBe(false)
    })

    it('根部门时递归提取所有子部门代码并去重', async () => {
      const tree = [
        {
          department_code: 'D001',
          department_name: '研发部',
          children: [{ department_code: 'D00101', department_name: '后端组', children: [] }],
        },
      ]
      mockGetDepartmentEmployees.mockImplementation(async (code: string) => [
        makeEmployee(code === 'D001' ? 'E001' : 'E002'),
      ])
      const { employeeList } = useDepartmentEmployeeList({
        ...baseProps,
        isRoot: true,
        departmentTree: tree,
      })
      await flushPromises()

      expect(mockGetDepartmentEmployees).toHaveBeenCalledWith('D00101', {})
      expect(employeeList.value.map((e) => e.employee_jobcode)).toEqual(['E001', 'E002'])
    })

    it('携带 status 过滤参数', async () => {
      const { handleStatusFilterChange, filterStatus } = useDepartmentEmployeeList(baseProps)
      await flushPromises()
      filterStatus.value = 'active'
      handleStatusFilterChange()
      await flushPromises()

      expect(mockGetDepartmentEmployees).toHaveBeenLastCalledWith('D001', { status: 'active' })
    })

    it('加载失败时提示错误', async () => {
      mockGetDepartmentEmployees.mockRejectedValue(new Error('boom'))
      useDepartmentEmployeeList(baseProps)
      await flushPromises()

      expect(mockShowError).toHaveBeenCalledWith(expect.any(Error), '加载人员列表失败')
    })
  })

  describe('分页与筛选', () => {
    it('paginatedData 按页切片', async () => {
      mockGetDepartmentEmployees.mockResolvedValue([
        makeEmployee('E1'),
        makeEmployee('E2'),
        makeEmployee('E3'),
      ])
      const { employeeList, paginatedData, currentPage } = useDepartmentEmployeeList(baseProps)
      await flushPromises()

      expect(paginatedData.value).toEqual(employeeList.value.slice(0, 10))

      currentPage.value = 2
      expect(paginatedData.value).toEqual(employeeList.value.slice(10, 20))
    })

    it('resetFilters 清空筛选、选中与页码', () => {
      const { resetFilters, filterStatus, currentPage, selectedRows } =
        useDepartmentEmployeeList(baseProps)
      filterStatus.value = 'left'
      currentPage.value = 3
      selectedRows.value = [makeEmployee('E1')]

      resetFilters()

      expect(filterStatus.value).toBe('')
      expect(currentPage.value).toBe(1)
      expect(selectedRows.value).toEqual([])
    })

    it('handleSelectionChange 记录选中行', () => {
      const { handleSelectionChange, selectedRows } = useDepartmentEmployeeList(baseProps)
      const rows = [makeEmployee('E1')]

      handleSelectionChange(rows)

      expect(selectedRows.value).toEqual(rows)
    })
  })

  describe('排序模式', () => {
    it('toggleSortMode 可来回切换', async () => {
      mockGetDepartmentEmployees.mockResolvedValue([makeEmployee('E1')])
      const { toggleSortMode, isSortMode } = useDepartmentEmployeeList(baseProps)
      await flushPromises()

      toggleSortMode()
      expect(isSortMode.value).toBe(true)

      toggleSortMode()
      expect(isSortMode.value).toBe(false)
    })

    it('cancelSortMode 恢复备份列表', async () => {
      mockGetDepartmentEmployees.mockResolvedValue([makeEmployee('E1'), makeEmployee('E2')])
      const { employeeList, toggleSortMode, cancelSortMode } = useDepartmentEmployeeList(baseProps)
      await flushPromises()

      toggleSortMode()
      employeeList.value = [makeEmployee('X9')]
      cancelSortMode()

      expect(employeeList.value.map((e) => e.employee_jobcode)).toEqual(['E1', 'E2'])
    })

    it('saveSortOrder 成功后退出排序并刷新', async () => {
      const props = { departmentCode: 'D001', departmentName: '研发部' }
      mockGetDepartmentEmployees.mockResolvedValue([makeEmployee('E1'), makeEmployee('E2')])
      const { employeeList, toggleSortMode, saveSortOrder, isSortMode, isSavingSort } =
        useDepartmentEmployeeList(props)
      await flushPromises()

      toggleSortMode()
      const [a, b] = employeeList.value
      employeeList.value.splice(0, 2, b, a)
      await saveSortOrder()

      expect(mockBatchUpdateSort).toHaveBeenCalledWith([
        { employee_jobcode: 'E2', sort_order: 0 },
        { employee_jobcode: 'E1', sort_order: 1 },
      ])
      expect(mockElMessageSuccess).toHaveBeenCalledWith('排序保存成功')
      expect(isSortMode.value).toBe(false)
      expect(isSavingSort.value).toBe(false)
    })

    it('saveSortOrder 失败时提示错误', async () => {
      const { toggleSortMode, saveSortOrder } = useDepartmentEmployeeList(baseProps)
      await flushPromises()
      toggleSortMode()
      mockBatchUpdateSort.mockRejectedValue(new Error('boom'))

      await saveSortOrder()

      expect(mockShowError).toHaveBeenCalledWith(expect.any(Error), '保存排序失败')
    })

    it('moveEmployee 越界时不移动', async () => {
      mockGetDepartmentEmployees.mockResolvedValue([makeEmployee('E1'), makeEmployee('E2')])
      const { employeeList, moveEmployee } = useDepartmentEmployeeList(baseProps)
      await flushPromises()
      const orderBefore = employeeList.value.map((e) => e.employee_jobcode)

      moveEmployee(0, -1)

      expect(employeeList.value.map((e) => e.employee_jobcode)).toEqual(orderBefore)
    })

    it('moveEmployee 上移并重写 sort_order', async () => {
      mockGetDepartmentEmployees.mockResolvedValue([
        makeEmployee('E1'),
        makeEmployee('E2'),
        makeEmployee('E3'),
      ])
      const { employeeList, moveEmployee } = useDepartmentEmployeeList(baseProps)
      await flushPromises()

      moveEmployee(1, -1)

      expect(employeeList.value.map((e) => e.employee_jobcode)).toEqual(['E2', 'E1', 'E3'])
      expect(employeeList.value.map((e) => e.sort_order)).toEqual([0, 1, 2])
    })
  })

  describe('路由跳转', () => {
    it('handleAddEmployee 跳转新增页', () => {
      const { handleAddEmployee } = useDepartmentEmployeeList(baseProps)
      handleAddEmployee()
      expect(mockPush).toHaveBeenCalledWith({
        name: 'DeptUserForm',
        query: { department_code: 'D001' },
      })
    })

    it('handleEditEmployee 跳转编辑页', () => {
      const { handleEditEmployee } = useDepartmentEmployeeList(baseProps)
      handleEditEmployee(makeEmployee('E1'))
      expect(mockPush).toHaveBeenCalledWith({
        name: 'DeptUserForm',
        query: { jobcode: 'E1' },
      })
    })

    it('handleRowClick 非排序模式下进入编辑', () => {
      const { handleRowClick } = useDepartmentEmployeeList(baseProps)
      handleRowClick(makeEmployee('E1'))
      expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ name: 'DeptUserForm' }))
    })

    it('handleBatchImport 跳转批量导入页', () => {
      const { handleBatchImport } = useDepartmentEmployeeList(baseProps)
      handleBatchImport()
      expect(mockPush).toHaveBeenCalledWith({
        name: 'DeptUserBatchImport',
        query: { department_code: 'D001' },
      })
    })
  })

  describe('删除', () => {
    it('handleDeleteEmployee 成功删除并刷新', async () => {
      const { handleDeleteEmployee } = useDepartmentEmployeeList(baseProps)
      await handleDeleteEmployee(makeEmployee('E1'))

      expect(mockRemove).toHaveBeenCalledWith('E1')
      expect(mockElMessageSuccess).toHaveBeenCalledWith('删除成功')
    })

    it('handleDeleteEmployee 失败提示', async () => {
      mockRemove.mockRejectedValue(new Error('boom'))
      const { handleDeleteEmployee } = useDepartmentEmployeeList(baseProps)
      await handleDeleteEmployee(makeEmployee('E1'))

      expect(mockShowError).toHaveBeenCalledWith(expect.any(Error), '删除人员失败')
    })

    it('handleBatchDelete 无选中时警告', async () => {
      const { handleBatchDelete } = useDepartmentEmployeeList(baseProps)
      await handleBatchDelete()

      expect(mockElMessageWarning).toHaveBeenCalledWith('请先选择要删除的数据')
      expect(mockConfirm).not.toHaveBeenCalled()
    })

    it('handleBatchDelete 全部成功提示', async () => {
      mockRemoveBatch.mockResolvedValue({ success_count: 2, fail_count: 0 })
      const { handleSelectionChange, handleBatchDelete } = useDepartmentEmployeeList(baseProps)
      handleSelectionChange([makeEmployee('E1'), makeEmployee('E2')])

      await handleBatchDelete()

      expect(mockConfirm).toHaveBeenCalledWith(
        '确定要删除选中的 2 条数据吗？删除后数据不可恢复！',
        '批量删除确认',
        expect.objectContaining({ type: 'warning' }),
      )
      expect(mockRemoveBatch).toHaveBeenCalledWith(['E1', 'E2'])
      expect(mockElMessageSuccess).toHaveBeenCalledWith('成功删除 2 条数据')
    })

    it('handleBatchDelete 部分失败时警告', async () => {
      mockRemoveBatch.mockResolvedValue({ success_count: 1, fail_count: 2 })
      const { handleSelectionChange, handleBatchDelete } = useDepartmentEmployeeList(baseProps)
      handleSelectionChange([makeEmployee('E1'), makeEmployee('E2'), makeEmployee('E3')])

      await handleBatchDelete()

      expect(mockElMessageWarning).toHaveBeenCalledWith('成功删除 1 条，失败 2 条')
    })

    it('handleBatchDelete 用户取消时不删除', async () => {
      mockConfirm.mockRejectedValue('cancel')
      const { handleSelectionChange, handleBatchDelete } = useDepartmentEmployeeList(baseProps)
      handleSelectionChange([makeEmployee('E1')])

      await handleBatchDelete()

      expect(mockRemoveBatch).not.toHaveBeenCalled()
      expect(mockShowError).not.toHaveBeenCalled()
    })

    it('handleBatchDelete 失败时提示错误', async () => {
      mockRemoveBatch.mockRejectedValue(new Error('boom'))
      const { handleSelectionChange, handleBatchDelete } = useDepartmentEmployeeList(baseProps)
      handleSelectionChange([makeEmployee('E1')])

      await handleBatchDelete()

      expect(mockShowError).toHaveBeenCalledWith(expect.any(Error), '批量删除失败')
    })

    it('handleBatchDelete 选中数据缺 jobcode 时报错', async () => {
      const { handleSelectionChange, handleBatchDelete } = useDepartmentEmployeeList(baseProps)
      handleSelectionChange([{ employee_jobcode: '', sort_order: 0 } as never])

      await handleBatchDelete()

      expect(mockElMessageError).toHaveBeenCalledWith('无法删除：选中的数据缺少唯一标识')
      expect(mockRemoveBatch).not.toHaveBeenCalled()
    })
  })
})
