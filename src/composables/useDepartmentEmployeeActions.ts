/**
 * 部门人员列表「排序编辑 + 批量删除」操作逻辑
 * （自 DepartmentEmployeeList.vue 物理提取，零逻辑变更）
 *
 * 响应式安全：employeeList / selectedRows 以 Ref 注入，tableRef 以对象引用注入，
 * 所有读写均通过 .value 进行，与原组件内实现行为一致。
 */
import { ref, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { EmployeeExtended } from '@/types/user'

/** 表格实例的最小接口（仅使用 clearSelection） */
export interface SortableTableRef {
  clearSelection: () => void
}

/** 排序保存 API 的最小接口 */
interface UserActionsAPI {
  batchUpdateSort: (
    data: Array<{ employee_jobcode: string; sort_order: number }>,
  ) => Promise<unknown>
}

/** 操作逻辑依赖 */
export interface DepartmentEmployeeActionsDeps {
  /** 人员列表（全量，响应式） */
  employeeList: Ref<EmployeeExtended[]>
  /** 当前选中的行数据（批量删除用） */
  selectedRows: Ref<EmployeeExtended[]>
  /** 表格组件引用（用于 clearSelection） */
  tableRef: Ref<SortableTableRef | null>
  /** 用户 store（删除用） */
  userStore: {
    remove: (jobcode: string) => Promise<unknown>
    removeBatch: (
      jobcodes: string[],
    ) => Promise<{ fail_count?: number; success_count?: number } | undefined>
  }
  /** 排序/删除 API */
  userAPI: UserActionsAPI
  /** 操作成功后刷新列表的回调 */
  loadEmployeeList: () => Promise<void>
}

/** 创建排序与批量删除操作逻辑 */
export function useDepartmentEmployeeActions(deps: DepartmentEmployeeActionsDeps) {
  const { employeeList, selectedRows, tableRef, userStore, userAPI, loadEmployeeList } = deps

  // ===== 排序编辑状态 =====

  /** 原始排序（用于取消排序时恢复） */
  const originalList = ref<EmployeeExtended[]>([])

  /** 排序编辑模式 */
  const isSortMode = ref(false)

  /** 保存排序中 */
  const isSavingSort = ref(false)

  /** 批量删除中 */
  const isBatchDeleting = ref(false)

  /**
   * 切换排序编辑模式
   * 进入排序模式时清空选择状态（排序模式下不允许批量删除）
   */
  const toggleSortMode = () => {
    if (!isSortMode.value) {
      // 进入排序模式：保存原始列表副本，清空选择状态
      originalList.value = [...employeeList.value]
      tableRef.value?.clearSelection()
      selectedRows.value = []
    }
    isSortMode.value = !isSortMode.value
  }

  /**
   * 取消排序模式，恢复原始排序
   */
  const cancelSortMode = () => {
    employeeList.value = [...originalList.value]
    isSortMode.value = false
  }

  /**
   * 移动人员排序（上移/下移）
   * @param index 当前索引
   * @param direction 移动方向（-1=上移，1=下移）
   */
  const moveEmployee = (index: number, direction: number) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= employeeList.value.length) return

    // 交换数组元素
    const temp = employeeList.value[index]
    employeeList.value[index] = employeeList.value[newIndex]
    employeeList.value[newIndex] = temp

    // 同步更新 sort_order 值
    employeeList.value.forEach((item, idx) => {
      item.sort_order = idx
    })
  }

  /** 保存排序到后端 */
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
      // 重新加载以获取后端确认后的数据
      await loadEmployeeList()
    } catch (error) {
      console.error('保存排序失败:', error)
      ElMessage.error('保存排序失败')
    } finally {
      isSavingSort.value = false
    }
  }

  /**
   * 批量删除人员
   * 弹出确认框，确认后调用 userStore.removeBatch 执行批量删除
   * 删除成功后清空选择状态并刷新列表
   */
  const handleBatchDelete = async () => {
    if (selectedRows.value.length === 0) {
      ElMessage.warning('请先选择要删除的数据')
      return
    }

    // 提取选中的工号（唯一标识）
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
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning',
        },
      )

      isBatchDeleting.value = true
      const result = await userStore.removeBatch(jobcodes)

      // 处理部分失败情况
      if (result && 'fail_count' in result && result.fail_count && result.fail_count > 0) {
        ElMessage.warning(`成功删除 ${result.success_count} 条，失败 ${result.fail_count} 条`)
      } else {
        ElMessage.success(`成功删除 ${jobcodes.length} 条数据`)
      }

      // 清空选择状态
      tableRef.value?.clearSelection()
      selectedRows.value = []
      // 刷新列表
      await loadEmployeeList()
    } catch (error) {
      if (error === 'cancel') return // 用户取消删除
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败，请重试')
    } finally {
      isBatchDeleting.value = false
    }
  }

  return {
    isSortMode,
    isSavingSort,
    isBatchDeleting,
    toggleSortMode,
    cancelSortMode,
    moveEmployee,
    saveSortOrder,
    handleBatchDelete,
  }
}
