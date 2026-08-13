<!--
  DepartmentEmployeeList.vue
  部门人员列表组件

  功能：
    - 展示部门下的人员列表（el-table + el-pagination）
    - 支持按人员状态筛选（在职/离职/退休）
    - 支持新增人员、批量导入
    - 支持人员排序编辑（上移/下移）
    - 支持批量选择删除（全选/部分选择）

  数据来源：departmentAPI.getDepartmentEmployeeList()
  不使用 CommonList（因其依赖 usePaginationSearch + store），
  直接使用 el-table + el-pagination 实现列表和分页。

  批量删除说明：
    - 使用 el-table 的 selection 列实现行选择
    - 选择状态通过 @selection-change 事件同步到 selectedRows
    - 排序模式下自动隐藏选择列，避免操作冲突
    - 切换部门时自动清空选择状态，防止跨部门选择残留
    - 调用 userStore.removeBatch() 执行批量删除（后端已支持）
-->
<template>
  <el-card class="department-employee-list">
    <template #header>
      <div class="card-header">
        <div class="header-title">
          <el-icon><User /></el-icon>
          <span>人员列表</span>
          <el-tag size="small" type="info" class="count-tag"> {{ employeeList.length }} 人 </el-tag>
        </div>

        <!--
          人员状态筛选区域
          位置：卡片头部右侧，与操作按钮同行
          功能：按人员状态（在职/离职/退休）筛选列表
          设计：使用单选下拉框，简洁直观
        -->
        <div class="header-filters">
          <el-select
            v-model="filterStatus"
            placeholder="选择状态"
            clearable
            size="small"
            style="width: 120px"
            @change="handleStatusFilterChange"
          >
            <el-option
              v-for="option in statusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>

        <div class="header-actions">
          <el-button
            :type="isSortMode ? 'success' : 'default'"
            size="small"
            @click="toggleSortMode"
          >
            <el-icon><Sort /></el-icon>
            {{ isSortMode ? '完成排序' : '排序编辑' }}
          </el-button>
          <el-button type="primary" size="small" @click="handleAddEmployee">
            <el-icon><Plus /></el-icon>
            新增人员
          </el-button>
          <el-button type="success" size="small" @click="handleBatchImport">
            <el-icon><Upload /></el-icon>
            批量导入
          </el-button>
          <!-- 批量删除按钮：仅在非排序模式下显示，选中数据时可用 -->
          <el-button
            v-if="!isSortMode"
            type="danger"
            size="small"
            :disabled="selectedRows.length === 0"
            :loading="isBatchDeleting"
            @click="handleBatchDelete"
          >
            <el-icon><Delete /></el-icon>
            批量删除 ({{ selectedRows.length }})
          </el-button>
        </div>
      </div>
    </template>

    <!-- 人员表格 -->
    <el-table
      ref="tableRef"
      :data="paginatedData"
      row-key="employee_jobcode"
      border
      stripe
      v-loading="isLoading"
      @row-click="handleRowClick"
      @selection-change="handleSelectionChange"
      class="employee-table"
    >
      <!-- 排序模式：显示序号和上移/下移按钮 -->
      <el-table-column v-if="isSortMode" label="序号" width="70" align="center">
        <template #default="{ $index }">
          <span class="sort-index">{{ $index + 1 }}</span>
        </template>
      </el-table-column>

      <!-- 批量选择列：仅在非排序模式下显示，支持全选/部分选择 -->
      <el-table-column v-if="!isSortMode" type="selection" width="55" align="center" />

      <el-table-column label="姓名" prop="employee_name" min-width="100" />
      <el-table-column label="工号" prop="employee_jobcode" min-width="110" />
      <el-table-column label="状态" prop="employee_status" min-width="80">
        <template #default="{ row }">
          <StatusTag :status="row.employee_status" map-type="employee" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="电话" prop="employee_phone" min-width="130" />
      <el-table-column label="位置" prop="employee_location" min-width="130" />
      <el-table-column
        label="描述"
        prop="employee_description"
        min-width="150"
        show-overflow-tooltip
      />
      <el-table-column label="排序" prop="sort_order" width="70" align="center" />

      <!-- 排序模式：上移/下移操作列 -->
      <el-table-column v-if="isSortMode" label="操作" width="120" fixed="right" align="center">
        <template #default="{ $index }">
          <el-button
            link
            type="primary"
            size="small"
            :disabled="$index === 0"
            @click.stop="moveEmployee($index, -1)"
          >
            上移
          </el-button>
          <el-button
            link
            type="primary"
            size="small"
            :disabled="$index === employeeList.length - 1"
            @click.stop="moveEmployee($index, 1)"
          >
            下移
          </el-button>
        </template>
      </el-table-column>

      <!-- 普通模式：编辑操作列 -->
      <el-table-column v-else label="操作" width="80" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click.stop="handleEditEmployee(row)">
            编辑
          </el-button>
          <el-button link type="danger" size="small" @click.stop="handleDeleteEmployee(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 排序模式：保存/取消按钮 -->
    <div v-if="isSortMode" class="sort-actions">
      <el-button type="primary" :loading="isSavingSort" @click="saveSortOrder">
        保存排序
      </el-button>
      <el-button @click="cancelSortMode">取消</el-button>
    </div>

    <!-- 普通模式：分页 -->
    <div v-else class="pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="employeeList.length"
        layout="total, sizes, prev, pager, next"
        background
        size="small"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 部门人员列表组件
 *
 * Props:
 *   - departmentCode: 部门编码
 *   - departmentName: 部门名称
 *   - isRoot: 是否为根部门（根部门时加载所有子部门人员）
 *   - departmentTree: 部门树数据（根部门时使用）
 *
 * 数据来源：departmentAPI.getDepartmentEmployeeList()
 * 不使用 CommonList（因其依赖 usePaginationSearch + store），
 * 直接使用 el-table + el-pagination 实现列表和分页。
 *
 * 批量删除功能：
 *   - selectedRows: 当前选中的行数据
 *   - handleSelectionChange: 表格选择变化回调
 *   - handleBatchDelete: 批量删除处理方法
 *   - tableRef: 表格组件引用，用于调用 clearSelection
 */
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Plus, Upload, Sort, Delete } from '@element-plus/icons-vue'
import { getDepartmentEmployees } from '@/stores/departmentStore'
import { userAPI } from '@/api/user'
import type { EmployeeExtended, EmployeeStatus } from '@/types/user'
import type { DepartmentTreeNode, DepartmentEmployeeListQueryParams } from '@/types/department'
import { useUserStore } from '@/stores/userStore'
import StatusTag from '@/components/commoncomponents/StatusTag.vue'

// ==================== Props ====================

interface Props {
  /** 部门编码 */
  departmentCode: string
  /** 部门名称 */
  departmentName: string
  /** 是否为根部门 */
  isRoot?: boolean
  /** 部门树数据（根部门时使用，用于获取所有子部门人员） */
  departmentTree?: DepartmentTreeNode[]
}

const props = withDefaults(defineProps<Props>(), {
  isRoot: false,
  departmentTree: () => [],
})

// ==================== 状态定义 ====================

const router = useRouter()
const userStore = useUserStore()

/** 人员列表（全量，按 sort_order 排序） */
const employeeList = ref<EmployeeExtended[]>([])

/** 原始排序（用于取消排序时恢复） */
const originalList = ref<EmployeeExtended[]>([])

/** 加载状态 */
const isLoading = ref(false)

/** 排序编辑模式 */
const isSortMode = ref(false)

/** 保存排序中 */
const isSavingSort = ref(false)

/** 批量删除中 */
const isBatchDeleting = ref(false)

/** 表格组件引用，用于调用 clearSelection 等方法 */
const tableRef = ref<InstanceType<(typeof import('element-plus'))['ElTable']> | null>(null)

/** 当前选中的行数据（批量删除用） */
const selectedRows = ref<EmployeeExtended[]>([])

/** 分页：当前页码 */
const currentPage = ref(1)

/** 分页：每页条数 */
const pageSize = ref(10)

/**
 * 筛选：人员状态（空字符串表示全部）
 * 可选值：''（全部）、'active'（在职）、'left'（离职）、'retirement'（退休）
 */
const filterStatus = ref<'' | EmployeeStatus>('')

/**
 * 筛选选项列表
 * 定义下拉框中显示的选项
 * - 全部：显示所有人员
 * - 在职：只显示在职人员
 * - 离职：只显示离职人员
 * - 退休：只显示退休人员
 */
const statusOptions = [
  { label: '全部', value: '' },
  { label: '在职', value: 'active' as EmployeeStatus },
  { label: '离职', value: 'left' as EmployeeStatus },
  { label: '退休', value: 'retirement' as EmployeeStatus },
]

// ==================== 计算属性 ====================

/** 分页后的数据 */
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return employeeList.value.slice(start, start + pageSize.value)
})

// ==================== 方法定义 ====================

/**
 * 从部门树中提取所有部门编码（递归）
 * @param nodes 部门树节点
 * @returns 部门编码数组
 */
const extractAllDepartmentCodes = (nodes: DepartmentTreeNode[]): string[] => {
  const codes: string[] = []
  for (const node of nodes) {
    codes.push(node.department_code)
    if (node.children?.length) {
      codes.push(...extractAllDepartmentCodes(node.children))
    }
  }
  return codes
}

/**
 * 加载部门人员列表
 * 通过 Store 层获取数据（而非直接调用 API），统一数据访问入口
 * Store 层已处理排序和数组类型安全
 *
 * 特殊处理：根部门（isRoot=true）时，递归获取所有子部门的人员
 *
 * 筛选功能：
 * - 根据 filterStatus 值筛选人员状态
 * - 空字符串表示显示全部人员
 * - 筛选条件通过 queryParams 传递给后端 API
 */
const loadEmployeeList = async () => {
  try {
    isLoading.value = true

    // 构建查询参数，根据筛选状态添加 status 条件
    const queryParams: DepartmentEmployeeListQueryParams = {}
    if (filterStatus.value) {
      queryParams.status = filterStatus.value
    }

    if (props.isRoot && props.departmentTree.length > 0) {
      // 根部门：获取所有子部门的人员
      const allCodes = extractAllDepartmentCodes(props.departmentTree)
      // 并发获取所有部门人员（携带筛选参数）
      const allEmployees = await Promise.all(
        allCodes.map((code) => getDepartmentEmployees(code, queryParams)),
      )
      // 合并所有人员并去重（根据 employee_jobcode）
      const employeeMap = new Map<string, EmployeeExtended>()
      allEmployees.flat().forEach((emp) => {
        employeeMap.set(emp.employee_jobcode, emp)
      })
      employeeList.value = Array.from(employeeMap.values())
    } else {
      // 普通部门：仅获取当前部门人员（携带筛选参数）
      employeeList.value = await getDepartmentEmployees(props.departmentCode, queryParams)
    }
  } catch (error) {
    console.error('加载人员列表失败:', error)
    ElMessage.error('加载人员列表失败')
  } finally {
    isLoading.value = false
  }
}

/**
 * 重置筛选条件
 * 切换部门时调用，清空筛选状态并重置分页
 * 同时清空选择状态，避免跨部门选择残留
 * 确保用户切换部门后看到该部门的全部人员
 */
const resetFilters = () => {
  filterStatus.value = ''
  currentPage.value = 1
  // 清空批量选择状态（切换部门后原选择数据已失效）
  tableRef.value?.clearSelection()
  selectedRows.value = []
}

/**
 * 状态筛选变化处理
 * 切换筛选条件时，重新加载列表并重置分页到第一页
 * 确保筛选后从第一页开始查看结果
 */
const handleStatusFilterChange = () => {
  currentPage.value = 1
  loadEmployeeList()
}

/**
 * 表格选择变化回调
 * 当用户勾选/取消勾选行时，更新 selectedRows 状态
 * @param rows 当前选中的行数据数组
 */
const handleSelectionChange = (rows: EmployeeExtended[]) => {
  selectedRows.value = rows
}

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

/**
 * 保存排序到后端
 */
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
 * 跳转到新增人员页面（携带当前部门编码）
 */
const handleAddEmployee = () => {
  router.push({
    name: 'DeptUserForm',
    query: { department_code: props.departmentCode },
  })
}

/**
 * 删除人员
 * @param row 要删除的人员数据
 */
const handleDeleteEmployee = async (row: EmployeeExtended) => {
  try {
    await userStore.remove(row.employee_jobcode)
    ElMessage.success('删除成功')
    // 刷新列表
    await loadEmployeeList()
  } catch (error) {
    console.error('删除人员失败:', error)
    ElMessage.error('删除人员失败')
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
    if (result && 'fail_count' in result && result.fail_count > 0) {
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

/**
 * 跳转到批量导入页面（携带当前部门编码）
 */
const handleBatchImport = () => {
  router.push({
    name: 'DeptUserBatchImport',
    query: { department_code: props.departmentCode },
  })
}

/**
 * 跳转到编辑人员页面
 */
const handleEditEmployee = (row: EmployeeExtended) => {
  router.push({
    name: 'DeptUserForm',
    query: { jobcode: row.employee_jobcode },
  })
}

/**
 * 行点击事件（跳转编辑）
 */
const handleRowClick = (row: EmployeeExtended) => {
  if (!isSortMode.value) {
    handleEditEmployee(row)
  }
}

// ==================== 监听 ====================

/**
 * 监听部门相关属性变化
 * 当部门编码、是否根部门、部门树发生变化时：
 * 1. 重置筛选条件（清空状态筛选、重置分页）
 * 2. 重新加载人员列表
 *
 * 设计说明：
 * - 切换部门时重置筛选，避免用户在新部门看到空列表（因为筛选条件可能不匹配）
 * - 保持用户体验一致性：每次切换部门都从"全部"状态开始查看
 */
watch(
  [() => props.departmentCode, () => props.isRoot, () => props.departmentTree],
  () => {
    // 重置筛选条件（清空状态筛选、重置分页）
    resetFilters()
    // 根目录时，确保 departmentTree 已加载（有数据）
    const treeNotEmpty = props.departmentTree && props.departmentTree.length > 0
    if (props.isRoot && treeNotEmpty) {
      loadEmployeeList()
    } else if (!props.isRoot) {
      loadEmployeeList()
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.department-employee-list {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 16px;

      .el-icon {
        color: var(--color-primary-light);
      }

      .count-tag {
        margin-left: 4px;
      }
    }

    /**
     * 筛选区域样式
     * 使用 flex 布局，与操作按钮保持同行
     * 添加间距和对齐，确保视觉协调
     */
    .header-filters {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto; // 将筛选器推到右侧
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    /**
     * 响应式适配
     * 小屏幕时筛选器和操作按钮换行显示
     * 确保在移动设备上也能正常操作
     */
    @media (max-width: 768px) {
      .header-filters,
      .header-actions {
        width: 100%;
        justify-content: flex-start;
        margin-left: 0;
      }
    }
  }

  .employee-table {
    cursor: pointer;
  }

  .sort-index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background-color: var(--color-primary-light);
    color: var(--card-background);
    border-radius: 50%;
    font-size: 12px;
  }

  .sort-actions {
    margin-top: 16px;
    display: flex;
    justify-content: center;
    gap: 12px;
  }

  .pagination-wrapper {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
