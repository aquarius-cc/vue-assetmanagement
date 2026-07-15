<!--
  DepartmentManagement.vue
  部门-人员综合管理页面

  功能：
    - 左侧：部门树形目录（可展开折叠、拖拽排序、新增根部门）
    - 右侧：部门信息卡片（编辑、新增子部门）+ 人员列表（新增人员、批量导入、排序编辑）

  布局：左右分栏，左侧固定宽度 300px，右侧自适应
-->
<template>
  <div class="department-management" v-loading="isLoading" element-loading-text="加载中...">
    <!-- 左侧：部门树形目录 -->
    <div class="tree-panel">
      <DepartmentTree
        ref="treeRef"
        :data="departmentTree"
        :draggable="isSortMode"
        :current-key="selectedDepartment?.department_code"
        @select="handleDepartmentSelect"
        @move="handleDepartmentMove"
        @refresh="loadDepartmentTree"
      />

      <!-- 树操作按钮 -->
      <div class="tree-actions">
        <el-button type="primary" size="small" @click="handleAddRootDepartment">
          <el-icon><Plus /></el-icon>
          新增根部门
        </el-button>
        <el-button :type="isSortMode ? 'success' : 'default'" size="small" @click="toggleSortMode">
          <el-icon><Sort /></el-icon>
          {{ isSortMode ? '完成排序' : '排序模式' }}
        </el-button>
      </div>
    </div>

    <!--
      右侧：内容区

      展示逻辑：
      1. 子路由激活时（DeptUserForm、DeptUserBatchImport 等）：显示子路由页面
      2. 默认状态：
         - 已选中部门：显示部门信息卡片 + 人员列表
         - 未选中部门：显示提示"请从左侧选择部门"

      优化点：
      - 页面加载时自动选中根部门，避免初始状态显示空白提示
      - 用户进入页面即可看到部门信息和人员列表
    -->
    <div class="content-panel">
      <!-- 子路由视图（DeptUserForm、DeptUserBatchImport 等页面） -->
      <router-view v-if="isChildRouteActive" />

      <!--
        默认内容：部门信息 + 人员列表

        状态说明：
        - selectedDepartment 有值：展示选中部门的详细信息和人员列表
        - selectedDepartment 为 null：展示空状态提示（仅在部门树为空时出现）
      -->
      <template v-else>
        <!--
          部门信息卡片
          展示部门名称、编码、信息员等基础信息
          提供编辑、新增子部门、删除等操作按钮
        -->
        <DepartmentInfoCard
          v-if="selectedDepartment"
          :department="selectedDepartment"
          :department-tree="departmentTree"
          @edit="handleEditDepartment"
          @add-child="handleAddChildDepartment"
          @batch-add-child="handleBatchAddChildDepartment"
          @delete="handleDeleteDepartment"
        />

        <!--
          未选择部门时的提示
          仅在部门树加载完成但无根部门时显示（极少出现）
          正常场景：页面加载自动选中根部门，不会显示此提示
        -->
        <el-empty v-else description="请从左侧选择部门" />

        <!--
          人员列表
          展示当前选中部门下的所有人员
          支持新增人员、批量导入、排序编辑等操作
        -->
        <DepartmentEmployeeList
          v-if="selectedDepartment"
          :department-code="selectedDepartment.department_code"
          :department-name="selectedDepartment.department_name"
          :is-root="selectedDepartment.level === 0"
          :department-tree="departmentTree"
        />
      </template>
    </div>

    <!-- 部门表单弹窗 -->
    <DepartmentFormDialog
      v-model:visible="formDialogVisible"
      :type="formDialogType"
      :parent-department="formDialogParent"
      :edit-department="formDialogEdit"
      :department-tree="departmentTree"
      @success="handleFormSuccess"
    />

    <!-- 批量新增子部门弹窗 -->
    <DepartmentBatchAddDialog
      v-model:visible="batchAddVisible"
      :parent-department="batchAddParent"
      @success="handleFormSuccess"
    />
  </div>
</template>
<script lang="ts">
export default {
  name: 'DepartmentManagement',
}
</script>
<script setup lang="ts">
/**
 * 部门-人员综合管理页面
 *
 * 数据流：
 *   1. 页面加载时调用 loadDepartmentTree() 获取部门树
 *   2. 用户点击树节点 → handleDepartmentSelect → 更新 selectedDepartment
 *   3. 右侧组件根据 selectedDepartment 展示信息和人员列表
 *   4. 拖拽排序 → handleDepartmentMove → 实时调用 API 保存
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Sort } from '@element-plus/icons-vue'
import { departmentAPI } from '@/api/department'
import type { Department, DepartmentTreeNode, MoveDepartmentParams } from '@/utils/Department'

// ==================== 组件导入 ====================
import DepartmentTree from '@/components/componentsdetails/components/DepartmentTree.vue'
import DepartmentInfoCard from '@/components/componentsdetails/components/DepartmentInfoCard.vue'
import DepartmentEmployeeList from '@/components/componentsdetails/components/DepartmentEmployeeList.vue'
import DepartmentFormDialog from '@/components/componentsdetails/components/DepartmentFormDialog.vue'
import DepartmentBatchAddDialog from '@/components/componentsdetails/components/DepartmentBatchAddDialog.vue'

const route = useRoute()

/**
 * 判断当前是否激活了子路由
 * 子路由包括：DeptUserForm、DeptUserBatchImport、DepartmentForm、DeptDepartmentBatchImport
 * 当子路由激活时，右侧内容区显示子页面而非默认的部门信息+人员列表
 * 注意：路由名称在 router/index.ts 中已使用 Dept 前缀重命名，避免与 UserDetails 下的同名路由冲突
 */
const isChildRouteActive = computed(() => {
  const childRouteNames = ['DeptUserForm', 'DeptUserBatchImport', 'DeptDepartmentBatchImport']
  return route.name !== 'DepartmentManagement' && childRouteNames.includes(route.name as string)
})

// ==================== 状态定义 ====================

/** 页面加载状态 */
const isLoading = ref(false)

/** 部门树数据 */
const departmentTree = ref<DepartmentTreeNode[]>([])

/** 当前选中的部门 */
const selectedDepartment = ref<Department | null>(null)

/** 排序编辑模式 */
const isSortMode = ref(false)

/** 树组件引用 */
const treeRef = ref<InstanceType<typeof DepartmentTree>>()

// ==================== 表单弹窗状态 ====================

/** 表单弹窗显示状态 */
const formDialogVisible = ref(false)

/** 表单弹窗类型：'create' | 'edit' */
const formDialogType = ref<'create' | 'edit'>('create')

/** 表单弹窗父部门（新增子部门时使用） */
const formDialogParent = ref<Department | null>(null)

/** 表单弹窗编辑的部门（编辑时使用） */
const formDialogEdit = ref<Department | null>(null)

// ==================== 批量新增子部门弹窗状态 ====================

/** 批量新增弹窗显示状态 */
const batchAddVisible = ref(false)

/** 批量新增的目标父部门 */
const batchAddParent = ref<Department | null>(null)

// ==================== 方法定义 ====================

/**
 * 加载部门树
 * 页面初始化时调用，获取完整部门树形结构
 *
 * 优化点：
 * 1. 加载完成后自动选中第一个根部门（level === 0）
 * 2. 避免页面初始状态显示"请从左侧选择部门"的提示
 * 3. 提升用户体验，进入页面即可看到部门信息和人员列表
 */
const loadDepartmentTree = async () => {
  try {
    isLoading.value = true
    const tree = await departmentAPI.getDepartmentTree({ with_employee_count: true })
    departmentTree.value = tree

    // 如果当前有选中的部门，刷新其信息
    if (selectedDepartment.value) {
      const updated = findDepartmentInTree(tree, selectedDepartment.value.department_code)
      if (updated) {
        selectedDepartment.value = updated
      }
    } else {
      // 优化：默认选中第一个根部门（level === 0）
      // 这样用户进入页面时右侧内容区直接展示根部门信息，而不是显示"请从左侧选择部门"
      const rootDepartment = tree.find((node) => node.level === 0)
      if (rootDepartment) {
        selectedDepartment.value = rootDepartment
      }
    }
  } catch (error) {
    console.error('加载部门树失败:', error)
    ElMessage.error('加载部门树失败')
  } finally {
    isLoading.value = false
  }
}

/**
 * 在树中查找部门
 * @param tree 部门树
 * @param code 部门编码
 * @returns 找到的部门或 null
 */
const findDepartmentInTree = (tree: DepartmentTreeNode[], code: string): Department | null => {
  for (const node of tree) {
    if (node.department_code === code) {
      return node
    }
    if (node.children?.length) {
      const found = findDepartmentInTree(node.children, code)
      if (found) return found
    }
  }
  return null
}

/**
 * 处理部门选择
 * @param department 选中的部门
 */
const handleDepartmentSelect = (department: Department) => {
  selectedDepartment.value = department
}

/**
 * 处理部门移动（拖拽排序）
 * @param data 移动参数
 */
const handleDepartmentMove = async (data: {
  department_code: string
  parent_department_code: string | null
  target_code?: string
}) => {
  try {
    const params: MoveDepartmentParams = {
      target_parent_department_code: data.parent_department_code,
    }
    await departmentAPI.moveDepartment(data.department_code, params)
    ElMessage.success('部门移动成功')
    // 刷新树
    await loadDepartmentTree()
  } catch (error) {
    console.error('部门移动失败:', error)
    ElMessage.error('部门移动失败')
    // 恢复树状态
    await loadDepartmentTree()
  }
}

/**
 * 切换排序编辑模式
 */
const toggleSortMode = () => {
  isSortMode.value = !isSortMode.value
  if (isSortMode.value) {
    ElMessage.info('已进入排序模式，可拖拽部门调整顺序和层级')
  } else {
    ElMessage.success('已退出排序模式')
  }
}

/**
 * 处理新增根部门
 */
const handleAddRootDepartment = () => {
  formDialogType.value = 'create'
  formDialogParent.value = null
  formDialogEdit.value = null
  formDialogVisible.value = true
}

/**
 * 处理编辑部门
 * @param department 要编辑的部门
 */
const handleEditDepartment = (department: Department) => {
  formDialogType.value = 'edit'
  formDialogParent.value = null
  formDialogEdit.value = department
  formDialogVisible.value = true
}

/**
 * 处理新增子部门
 * @param parent 父部门
 */
const handleAddChildDepartment = (parent: Department) => {
  // 检查层级限制（最大6层）
  if (parent.level >= 5) {
    ElMessage.warning('部门层级最多6层，无法在此部门下新增子部门')
    return
  }
  formDialogType.value = 'create'
  formDialogParent.value = parent
  formDialogEdit.value = null
  formDialogVisible.value = true
}

/**
 * 处理批量新增子部门
 * @param parent 父部门
 */
const handleBatchAddChildDepartment = (parent: Department) => {
  if (parent.level >= 5) {
    ElMessage.warning('部门层级最多6层，无法在此部门下新增子部门')
    return
  }
  batchAddParent.value = parent
  batchAddVisible.value = true
}

/**
 * 处理删除部门
 * @param department 要删除的部门
 */
const handleDeleteDepartment = async (department: Department) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除部门 "${department.department_name}" 吗？\n注意：如果该部门下有子部门或人员，将无法删除。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    await departmentAPI.deleteDepartment(department.department_code)
    ElMessage.success('删除成功')

    // 如果删除的是当前选中的部门，清空选中
    if (selectedDepartment.value?.department_code === department.department_code) {
      selectedDepartment.value = null
    }

    // 刷新树
    await loadDepartmentTree()
  } catch (error: unknown) {
    if (error !== 'cancel') {
      console.error('删除部门失败:', error)
      ElMessage.error(error?.toString() || '删除失败，请检查该部门下是否有子部门或人员')
    }
  }
}

/**
 * 处理表单提交成功
 */
const handleFormSuccess = () => {
  formDialogVisible.value = false
  loadDepartmentTree()
}

// ==================== 生命周期 ====================

onMounted(() => {
  loadDepartmentTree()
})
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.department-management {
  display: flex;
  height: 100%;
  background-color: var(--background-color);
  padding: 16px;
  gap: 16px;

  // 左侧树面板
  .tree-panel {
    width: 300px;
    min-width: 300px;
    background-color: var(--card-background);
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .tree-actions {
      padding: 12px 12px 12px 12px;
      border-top: 1px solid var(--border-color-light);
      display: flex;
      gap: 8px;
      justify-content: center;
    }
  }

  // 右侧内容面板
  .content-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow: auto;
    min-width: 0;
  }
}
</style>
