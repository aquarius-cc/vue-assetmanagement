<!--
  DepartmentTree.vue
  部门树形组件

  功能：
    - 展示部门树形结构（el-tree）
    - 支持展开/折叠
    - 支持拖拽排序（当 draggable=true）
    - 显示部门名称和人员数量
    - 层级限制6层，拖拽时校验
-->
<template>
  <div class="department-tree">
    <!-- 树标题 -->
    <div class="tree-header">
      <span class="title">部门目录</span>
      <el-button link size="small" @click="expandAll">
        <el-icon><ArrowDown /></el-icon>
        展开
      </el-button>
      <el-button link size="small" @click="collapseAll">
        <el-icon><ArrowUp /></el-icon>
        折叠
      </el-button>
    </div>

    <!-- 部门树 -->
    <el-tree
      ref="treeRef"
      :data="treeData"
      :props="treeProps"
      :draggable="draggable"
      :allow-drop="allowDrop"
      node-key="department_code"
      highlight-current
      :current-node-key="currentKey"
      :default-expanded-keys="expandedKeys"
      @node-click="handleNodeClick"
      @node-drop="handleNodeDrop"
      class="tree-content"
    >
      <template #default="{ node, data }">
        <div class="tree-node" :class="{ 'is-leaf': !data.children?.length }">
          <el-icon v-if="data.children?.length" class="node-icon">
            <FolderOpened v-if="node.expanded" />
            <Folder v-else />
          </el-icon>
          <el-icon v-else class="node-icon"><Document /></el-icon>
          <span class="node-label" :title="data.department_name">
            {{ data.department_name }}
          </span>
          <el-tag
            v-if="data.employee_count !== undefined"
            size="small"
            type="info"
            class="count-tag"
          >
            {{ data.employee_count }}人
          </el-tag>
        </div>
      </template>
    </el-tree>
  </div>
</template>

<script setup lang="ts">
/**
 * 部门树形组件
 *
 * Props:
 *   - data: 部门树数据
 *   - draggable: 是否可拖拽排序
 *   - currentKey: 当前选中节点的 key
 *
 * Emits:
 *   - select: 选中节点时触发
 *   - move: 拖拽完成时触发
 *   - refresh: 需要刷新时触发
 */
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown, ArrowUp, Folder, FolderOpened, Document } from '@element-plus/icons-vue'
import type { DepartmentTreeNode } from '@/types/department'
import type { DropType, ElTreeNode, ElTreeStore } from '@/types/form-helpers'
import { getSubtreeHeight, isDepartmentInSubtree } from '@/utils/departmentTree'

/** 部门最大层级（level 0 起，共 6 层；与后端 models.MAX_DEPARTMENT_LEVEL 对齐） */
const MAX_DEPARTMENT_LEVEL = 5

// ==================== Props & Emits ====================

interface Props {
  /** 部门树数据 */
  data: DepartmentTreeNode[]
  /** 是否可拖拽排序 */
  draggable?: boolean
  /** 当前选中节点的 key */
  currentKey?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  draggable: false,
  currentKey: null,
})

const emit = defineEmits<{
  /** 选中节点时触发 */
  (e: 'select', department: DepartmentTreeNode): void
  /** 拖拽完成时触发 */
  (
    e: 'move',
    data: {
      department_code: string
      parent_department_code: string | null
      target_code?: string
    },
  ): void
  /** 需要刷新时触发 */
  (e: 'refresh'): void
}>()

// ==================== 状态定义 ====================

/** 树组件引用 */
const treeRef = ref()

/** 默认展开的节点 keys */
const expandedKeys = ref<string[]>([])

/** 树形配置 */
const treeProps = {
  label: 'department_name',
  children: 'children',
}

// ==================== 计算属性 ====================

/**
 * 递归计算部门及其所有子部门的人员总数
 * @param node 部门节点
 * @returns 人员总数（包含子部门）
 */
const calculateTotalEmployeeCount = (node: DepartmentTreeNode): number => {
  let count = node.employee_count || 0
  if (node.children?.length) {
    count += node.children.reduce((sum, child) => sum + calculateTotalEmployeeCount(child), 0)
  }
  return count
}

/**
 * 预处理树数据
 * - 添加 label/value 用于 el-tree
 * - 计算递归人员数量（包含所有子部门）
 */
const processTreeData = (nodes: DepartmentTreeNode[]): DepartmentTreeNode[] => {
  return nodes.map((node) => {
    const processedNode: DepartmentTreeNode = {
      ...node,
      label: node.department_name,
      value: node.department_code,
      // 递归计算人员总数（包含子部门）
      employee_count: calculateTotalEmployeeCount(node),
    }
    // 递归处理子节点
    if (node.children?.length) {
      processedNode.children = processTreeData(node.children)
    }
    return processedNode
  })
}

/** 树数据（预处理后的数据，包含递归计算的人员数量） */
const treeData = computed(() => {
  return processTreeData(props.data)
})

// ==================== 方法定义 ====================

/**
 * 处理节点点击
 * @param data 节点数据
 */
const handleNodeClick = (data: DepartmentTreeNode) => {
  emit('select', data)
}

/** 上一次已提示的拒绝原因键（dragover 期间 allowDrop 高频调用，避免重复弹窗） */
let lastWarnKey = ''

/**
 * 拒绝放置并提示（同一拖拽组合只提示一次）
 * @param draggingCode 被拖拽节点编码
 * @param dropCode 目标节点编码
 * @param type 放置类型
 * @param reason 拒绝原因（cycle/level）
 * @param message 提示文案
 */
const warnBlocked = (
  draggingCode: string,
  dropCode: string,
  type: DropType,
  reason: 'cycle' | 'level',
  message: string,
) => {
  const key = `${draggingCode}|${dropCode}|${type}|${reason}`
  if (lastWarnKey === key) return
  lastWarnKey = key
  ElMessage.warning(message)
}

/**
 * 判断是否允许拖拽放置
 *
 * 判定顺序（与后端 DepartmentService._validate_move_hierarchy 对齐）：
 *   1. 环判定：落点后的新父节点不能是被拖节点自身或其子树内节点
 *   2. 层级判定：新层级 + 被拖子树高度不得超过 MAX_DEPARTMENT_LEVEL
 *
 * @param draggingNode 被拖拽的节点
 * @param dropNode 目标节点
 * @param type 放置类型（before/after/inner）
 * @returns 是否允许放置
 */
const allowDrop = (draggingNode: ElTreeNode, dropNode: ElTreeNode, type: DropType): boolean => {
  const draggingData: DepartmentTreeNode = draggingNode.data
  const dropData: DepartmentTreeNode = dropNode.data

  // 落点后的新父节点：inner 为目标节点自身，before/after 为目标节点的父节点
  const newParentCode =
    type === 'inner' ? dropData.department_code : dropData.parent_department_code

  // 环判定：放到自身，或新父节点落在被拖子树内（含被拖节点自身）
  if (
    dropData.department_code === draggingData.department_code ||
    (newParentCode !== null && isDepartmentInSubtree(draggingData, newParentCode))
  ) {
    warnBlocked(
      draggingData.department_code,
      dropData.department_code,
      type,
      'cycle',
      '不能将部门移动到自己的子部门下',
    )
    return false
  }

  // 层级判定：inner 的新层级 = 目标层级 + 1；before/after 与目标节点同层
  const newLevel = type === 'inner' ? dropData.level + 1 : dropData.level
  if (newLevel + getSubtreeHeight(draggingData) > MAX_DEPARTMENT_LEVEL) {
    warnBlocked(
      draggingData.department_code,
      dropData.department_code,
      type,
      'level',
      '部门层级最多6层，无法放置到此位置',
    )
    return false
  }

  lastWarnKey = ''
  return true
}

/**
 * 处理节点拖拽完成
 * @param draggingNode 被拖拽的节点
 * @param dropNode 目标节点
 * @param dropType 放置类型
 */
const handleNodeDrop = (draggingNode: ElTreeNode, dropNode: ElTreeNode, dropType: DropType) => {
  const draggingData: DepartmentTreeNode = draggingNode.data
  const dropData: DepartmentTreeNode = dropNode.data

  // 计算新的父节点业务编码
  let parentCode: string | null = null
  if (dropType === 'inner') {
    // 放入目标节点内部
    parentCode = dropData.department_code
  } else {
    // 放在目标节点前后，父节点与目标节点相同
    parentCode = dropData.parent_department_code
  }

  // 触发移动事件
  emit('move', {
    department_code: draggingData.department_code,
    parent_department_code: parentCode,
    target_code: dropData.department_code,
  })
}
/**
 * 展开所有节点
 * 通过 el-tree 的 store 遍历所有节点并设置 expanded = true
 */
const expandAll = () => {
  const tree = treeRef.value
  if (!tree?.store) return

  const store = tree.store as ElTreeStore
  // 遍历 store 中的所有节点，设置展开状态
  Object.values(store.nodesMap).forEach((node: ElTreeNode) => {
    node.expanded = true
  })
}

/**
 * 折叠所有节点
 * 通过 el-tree 的 store 遍历所有节点并设置 expanded = false
 */
const collapseAll = () => {
  const tree = treeRef.value
  if (!tree?.store) return

  const store = tree.store as ElTreeStore
  // 遍历 store 中的所有节点，设置折叠状态
  Object.values(store.nodesMap).forEach((node: ElTreeNode) => {
    node.expanded = false
  })
}

/**
 * 刷新树
 */
const refresh = () => {
  emit('refresh')
}

// ==================== 暴露方法 ====================

defineExpose({
  expandAll,
  collapseAll,
  refresh,
})

// ==================== 监听 ====================

// 当数据变化时，默认展开第一层
watch(
  () => props.data,
  (newData) => {
    if (newData.length > 0 && expandedKeys.value.length === 0) {
      expandedKeys.value = newData.map((node) => node.department_code)
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.department-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .tree-header {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color-light);

    .title {
      font-weight: 600;
      font-size: 14px;
      color: var(--text-primary);
      margin-right: auto;
    }
  }

  .tree-content {
    flex: 1;
    overflow: auto;
    padding: 8px 4px 8px 0;

    .tree-node {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 4px 4px 4px 0;

      &.is-leaf {
        padding-left: 8px;
      }

      .node-icon {
        margin-right: 8px;
        color: var(--text-secondary);
        font-size: 16px;
      }

      .node-label {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 14px;
      }

      .count-tag {
        margin-left: 4px;
        font-size: 14px;
      }
    }
  }
}
</style>
