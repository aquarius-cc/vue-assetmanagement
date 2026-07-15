<!--
  DepartmentInfoCard.vue
  部门信息卡片组件

  功能：
    - 展示部门基本信息（名称、编码、信息员、层级、排序）
    - 支持编辑部门
    - 支持新增子部门
    - 支持删除部门
-->
<template>
  <el-card class="department-info-card">
    <template #header>
      <div class="card-header">
        <div class="header-title">
          <el-icon><OfficeBuilding /></el-icon>
          <span>部门信息</span>
        </div>
        <div class="header-actions">
          <el-button type="primary" size="small" @click="handleEdit">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          <el-button type="success" size="small" @click="handleAddChild">
            <el-icon><Plus /></el-icon>
            新增子部门
          </el-button>
          <el-button type="warning" size="small" @click="handleBatchAddChild">
            <el-icon><Plus /></el-icon>
            批量新增
          </el-button>
          <el-button type="danger" size="small" @click="handleDelete">
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
        </div>
      </div>
    </template>

    <!-- 部门信息展示 -->
    <div class="info-content">
      <div class="info-item">
        <span class="label">部门名称：</span>
        <span class="value">{{ department.department_name }}</span>
      </div>
      <div class="info-item">
        <span class="label">部门编码：</span>
        <span class="value">{{ department.department_code }}</span>
      </div>
      <div class="info-item">
        <span class="label">部门信息员：</span>
        <span class="value">{{ department.department_information }}</span>
      </div>
      <div class="info-row">
        <div class="info-item">
          <span class="label">部门层级：</span>
          <el-tag size="small" :type="levelTagType">{{ levelText }}</el-tag>
        </div>
        <div class="info-item" v-if="department.level !== 0">
          <span class="label">父部门编码：</span>
          <span class="value">{{ department.parent_department_code || '—' }}</span>
        </div>
        <div class="info-item">
          <span class="label">物化路径：</span>
          <span class="value">{{ department.path }}</span>
        </div>
        <div class="info-item">
          <span class="label">排序顺序：</span>
          <span class="value">{{ department.sort_order }}</span>
        </div>
      </div>
      <div class="info-item">
        <span class="label">人员数量：</span>
        <el-tag size="small" type="info">{{ totalEmployeeCount }} 人</el-tag>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 部门信息卡片组件
 *
 * Props:
 *   - department: 部门信息
 *
 * Emits:
 *   - edit: 点击编辑按钮时触发
 *   - add-child: 点击新增子部门按钮时触发
 *   - delete: 点击删除按钮时触发
 */
import { computed } from 'vue'
import { OfficeBuilding, Edit, Plus, Delete } from '@element-plus/icons-vue'
import type { Department, DepartmentTreeNode } from '@/utils/Department'

// ==================== Props & Emits ====================

interface Props {
  /** 部门信息 */
  department: Department
  /** 部门树数据（用于计算递归人员数量） */
  departmentTree?: DepartmentTreeNode[]
}

const props = withDefaults(defineProps<Props>(), {
  departmentTree: () => [],
})

const emit = defineEmits<{
  /** 编辑部门 */
  (e: 'edit', department: Department): void
  /** 新增子部门 */
  (e: 'add-child', department: Department): void
  /** 批量新增子部门 */
  (e: 'batch-add-child', department: Department): void
  /** 删除部门 */
  (e: 'delete', department: Department): void
}>()

// ==================== 计算属性 ====================

/** 层级文本 */
const levelText = computed(() => {
  const levels = ['根部门', '一级部门', '二级部门', '三级部门', '四级部门', '五级部门']
  return levels[props.department.level] || `第${props.department.level + 1}级`
})

/** 层级标签类型 */
const levelTagType = computed(() => {
  const types: Record<number, string> = {
    0: 'danger',
    1: 'warning',
    2: 'success',
    3: 'primary',
    4: 'info',
    5: 'info',
  }
  return types[props.department.level] || 'info'
})

/**
 * 递归计算部门及其所有子部门的人员总数
 * @param nodes 部门树节点
 * @param targetCode 目标部门编码
 * @returns 人员总数（包含子部门）
 */
const calculateTotalEmployeeCount = (
  nodes: DepartmentTreeNode[],
  targetCode: string
): number => {
  for (const node of nodes) {
    if (node.department_code === targetCode) {
      // 找到目标部门，递归计算所有子部门人员
      let count = node.employee_count || 0
      if (node.children?.length) {
        count += node.children.reduce(
          (sum, child) => sum + calculateSubtreeCount(child),
          0
        )
      }
      return count
    }
    // 在当前节点的子节点中查找
    if (node.children?.length) {
      const count = calculateTotalEmployeeCount(node.children, targetCode)
      if (count > 0) return count
    }
  }
  return 0
}

/**
 * 计算子树的人员总数
 * @param node 部门节点
 * @returns 人员总数
 */
const calculateSubtreeCount = (node: DepartmentTreeNode): number => {
  let count = node.employee_count || 0
  if (node.children?.length) {
    count += node.children.reduce((sum, child) => sum + calculateSubtreeCount(child), 0)
  }
  return count
}

/** 部门人员总数（递归计算所有子部门） */
const totalEmployeeCount = computed(() => {
  if (!props.departmentTree.length) {
    // 没有部门树数据时，使用部门自身的 employee_count
    return props.department.employee_count || 0
  }
  return calculateTotalEmployeeCount(
    props.departmentTree,
    props.department.department_code
  )
})

// ==================== 方法定义 ====================

/** 处理编辑 */
const handleEdit = () => {
  emit('edit', props.department)
}

/** 处理新增子部门 */
const handleAddChild = () => {
  emit('add-child', props.department)
}

/** 处理批量新增子部门 */
const handleBatchAddChild = () => {
  emit('batch-add-child', props.department)
}

/** 处理删除 */
const handleDelete = () => {
  emit('delete', props.department)
}
</script>

<style lang="scss" scoped>
.department-info-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 16px;

      .el-icon {
        color: var(--color-primary-light);
      }
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }
  }

  .info-content {
    display: flex;
    flex-direction: column;
    gap: 16px;

    .info-row {
      display: flex;
      gap: 32px;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;

      .label {
        color: var(--text-regular);
        font-size: 14px;
        min-width: 80px;
      }

      .value {
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 500;
      }
    }
  }
}
</style>
