import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import type { EmployeeExtended } from '@/types/user'
import {
  useDepartmentEmployeeActions,
  type DepartmentEmployeeActionsDeps,
  type SortableTableRef,
} from '../useDepartmentEmployeeActions'

const mocks = vi.hoisted(() => ({
  elMessage: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  elMessageBox: vi.fn(async () => 'confirm'),
}))

vi.mock('element-plus', () => ({
  ElMessage: mocks.elMessage,
  ElMessageBox: Object.assign(mocks.elMessageBox, {
    confirm: vi.fn(async () => 'confirm'),
    prompt: vi.fn(async () => ({ value: '' })),
  }),
}))

function makeEmployee(jobcode: string, name: string, sortOrder: number): EmployeeExtended {
  return {
    id: 1,
    employee_jobcode: jobcode,
    employee_name: name,
    employee_status: 'active',
    employee_department_code: 'D01',
    employee_phone: '13800000000',
    employee_location: 'L1',
    created_at: '2025-01-01T00:00:00+08:00',
    updated_at: '2025-01-01T00:00:00+08:00',
    is_deleted: false,
    sort_order: sortOrder,
  }
}

interface SetupOptions {
  employees?: EmployeeExtended[]
  selectedRows?: EmployeeExtended[]
  tableRef?: { clearSelection: () => void } | null
  userStore?: Partial<DepartmentEmployeeActionsDeps['userStore']>
  userAPI?: Partial<DepartmentEmployeeActionsDeps['userAPI']>
  loadEmployeeList?: () => Promise<void>
}

function setup(options: SetupOptions = {}) {
  const employeeList = ref<EmployeeExtended[]>(
    options.employees ?? [makeEmployee('A001', '张三', 0), makeEmployee('A002', '李四', 1)],
  )
  const selectedRows = ref<EmployeeExtended[]>(options.selectedRows ?? [])
  const tableRef = ref<SortableTableRef | null>(
    options.tableRef === undefined ? { clearSelection: vi.fn() } : options.tableRef,
  )
  const userStore = {
    remove: vi.fn(async () => undefined),
    removeBatch: vi.fn(async () => undefined),
    ...options.userStore,
  }
  const userAPI = {
    batchUpdateSort: vi.fn(async () => undefined),
    ...options.userAPI,
  }
  const loadEmployeeList = options.loadEmployeeList ?? vi.fn(async () => undefined)
  const composable = useDepartmentEmployeeActions({
    employeeList,
    selectedRows,
    tableRef,
    userStore: userStore as DepartmentEmployeeActionsDeps['userStore'],
    userAPI: userAPI as DepartmentEmployeeActionsDeps['userAPI'],
    loadEmployeeList,
  })
  return {
    ...composable,
    employeeList,
    selectedRows,
    tableRef,
    userStore,
    userAPI,
    loadEmployeeList,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.elMessageBox.confirm.mockReset()
  mocks.elMessageBox.confirm.mockResolvedValue('confirm')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('useDepartmentEmployeeActions', () => {
  it('进入排序模式保存原始列表并清空选择状态', () => {
    const employees = [makeEmployee('A001', '张三', 0), makeEmployee('A002', '李四', 1)]
    const { toggleSortMode, isSortMode, selectedRows, tableRef } = setup({
      employees,
      selectedRows: [employees[0]],
    })
    toggleSortMode()
    expect(isSortMode.value).toBe(true)
    expect(selectedRows.value).toEqual([])
    expect(tableRef.value?.clearSelection).toHaveBeenCalled()
  })

  it('tableRef 为 null 时进入排序模式不崩溃', () => {
    const { toggleSortMode, isSortMode } = setup({ tableRef: null })
    toggleSortMode()
    expect(isSortMode.value).toBe(true)
  })

  it('退出排序模式仅切换标记，不清空选择', () => {
    const { toggleSortMode, isSortMode, selectedRows, employeeList, tableRef } = setup()
    toggleSortMode()
    selectedRows.value = [employeeList.value[0]]
    const clearSelection = (tableRef.value as { clearSelection: ReturnType<typeof vi.fn> })
      .clearSelection
    clearSelection.mockClear()
    toggleSortMode()
    expect(isSortMode.value).toBe(false)
    expect(selectedRows.value).toHaveLength(1)
    expect(clearSelection).not.toHaveBeenCalled()
  })

  it('取消排序模式恢复原始排序', () => {
    const { toggleSortMode, cancelSortMode, isSortMode, employeeList } = setup()
    toggleSortMode()
    employeeList.value.reverse()
    cancelSortMode()
    expect(isSortMode.value).toBe(false)
    expect(employeeList.value.map((e) => e.employee_jobcode)).toEqual(['A001', 'A002'])
  })

  it('moveEmployee 上移交换元素并同步 sort_order', () => {
    const { moveEmployee, employeeList } = setup()
    moveEmployee(1, -1)
    expect(employeeList.value.map((e) => e.employee_jobcode)).toEqual(['A002', 'A001'])
    expect(employeeList.value[0].sort_order).toBe(0)
    expect(employeeList.value[1].sort_order).toBe(1)
  })

  it('moveEmployee 下移越界不修改列表', () => {
    const { moveEmployee, employeeList } = setup()
    const before = employeeList.value.map((e) => e.employee_jobcode)
    moveEmployee(1, 1)
    expect(employeeList.value.map((e) => e.employee_jobcode)).toEqual(before)
  })

  it('moveEmployee 上移越界不修改列表', () => {
    const { moveEmployee, employeeList } = setup()
    const before = employeeList.value.map((e) => e.employee_jobcode)
    moveEmployee(0, -1)
    expect(employeeList.value.map((e) => e.employee_jobcode)).toEqual(before)
  })

  it('saveSortOrder 成功提示并退出排序模式且刷新列表', async () => {
    const { toggleSortMode, saveSortOrder, isSavingSort, isSortMode, userAPI, loadEmployeeList } =
      setup()
    toggleSortMode()
    await saveSortOrder()
    expect(userAPI.batchUpdateSort).toHaveBeenCalledWith([
      { employee_jobcode: 'A001', sort_order: 0 },
      { employee_jobcode: 'A002', sort_order: 1 },
    ])
    expect(mocks.elMessage.success).toHaveBeenCalledWith('排序保存成功')
    expect(isSortMode.value).toBe(false)
    expect(loadEmployeeList).toHaveBeenCalled()
    expect(isSavingSort.value).toBe(false)
  })

  it('saveSortOrder 失败时提示错误', async () => {
    const { saveSortOrder, isSavingSort, isSortMode, userAPI, loadEmployeeList } = setup({
      userAPI: {
        batchUpdateSort: vi.fn(async () => {
          throw new Error('network')
        }),
      },
    })
    await saveSortOrder()
    expect(mocks.elMessage.error).toHaveBeenCalledWith('保存排序失败')
    expect(loadEmployeeList).not.toHaveBeenCalled()
    expect(isSavingSort.value).toBe(false)
    expect(isSortMode.value).toBe(false)
    expect(userAPI.batchUpdateSort).toHaveBeenCalledTimes(1)
  })

  it('批量删除未选择数据时提示警告', async () => {
    const { handleBatchDelete, userStore } = setup()
    await handleBatchDelete()
    expect(mocks.elMessage.warning).toHaveBeenCalledWith('请先选择要删除的数据')
    expect(userStore.removeBatch).not.toHaveBeenCalled()
  })

  it('选中的数据缺少工号时提示错误', async () => {
    const { handleBatchDelete, userStore } = setup({
      selectedRows: [makeEmployee('', '无名', 0)],
    })
    await handleBatchDelete()
    expect(mocks.elMessage.error).toHaveBeenCalledWith('无法删除：选中的数据缺少唯一标识')
    expect(userStore.removeBatch).not.toHaveBeenCalled()
  })

  it('用户取消批量删除后提前返回', async () => {
    const { handleBatchDelete, userStore } = setup({
      selectedRows: [makeEmployee('A001', '张三', 0)],
    })
    mocks.elMessageBox.confirm.mockRejectedValueOnce('cancel')
    await handleBatchDelete()
    expect(userStore.removeBatch).not.toHaveBeenCalled()
    expect(mocks.elMessage.success).not.toHaveBeenCalled()
  })

  it('批量删除部分失败时提示警告并刷新', async () => {
    const { handleBatchDelete, userStore, selectedRows, tableRef, loadEmployeeList } = setup({
      selectedRows: [makeEmployee('A001', '张三', 0), makeEmployee('A002', '李四', 1)],
    })
    userStore.removeBatch.mockResolvedValueOnce({ success_count: 1, fail_count: 2 })
    await handleBatchDelete()
    expect(mocks.elMessage.warning).toHaveBeenCalledWith('成功删除 1 条，失败 2 条')
    expect(selectedRows.value).toEqual([])
    expect(tableRef.value?.clearSelection).toHaveBeenCalled()
    expect(loadEmployeeList).toHaveBeenCalled()
  })

  it('批量删除全部成功时提示成功', async () => {
    const { handleBatchDelete, userStore, selectedRows } = setup({
      selectedRows: [makeEmployee('A001', '张三', 0), makeEmployee('A002', '李四', 1)],
    })
    userStore.removeBatch.mockResolvedValueOnce(undefined)
    await handleBatchDelete()
    expect(mocks.elMessage.success).toHaveBeenCalledWith('成功删除 2 条数据')
    expect(mocks.elMessage.warning).not.toHaveBeenCalled()
    expect(selectedRows.value).toEqual([])
  })

  it('批量删除接口异常时提示错误', async () => {
    const { handleBatchDelete, userStore } = setup({
      selectedRows: [makeEmployee('A001', '张三', 0)],
    })
    userStore.removeBatch.mockRejectedValueOnce(new Error('boom'))
    await handleBatchDelete()
    expect(mocks.elMessage.error).toHaveBeenCalledWith('批量删除失败，请重试')
  })
})
