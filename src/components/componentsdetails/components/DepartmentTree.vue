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
import type { DepartmentTreeNode } from '@/utils/Department'

// ==================== el-tree 拖拽节点类型 ====================

/**
 * el-tree 拖拽回调中的节点参数类型
 * el-tree 的 @node-drop/@allow-drop 回调参数为内部 TreeNode 对象，
 * 其 .data 属性为传入的树节点数据
 */
interface ElTreeNode {
  /** 节点 ID（对应 node-key） */
  id: string | number
  /** 节点绑定的数据（即 treeData 中的对象） */
  data: DepartmentTreeNode
  /** 节点是否展开 */
  expanded: boolean
  /** 子节点 */
  childNodes: ElTreeNode[]
  /** 父节点 */
  parent: ElTreeNode | null
  /** 是否为叶子节点 */
  isLeaf: boolean
  /** 节点层级 */
  level: number
  [key: string]: unknown
}

/**
 * el-tree 内部 Store 类型
 * 用于访问所有节点的映射表
 */
interface ElTreeStore {
  /** 节点映射表，key 为节点 id，value 为节点对象 */
  nodesMap: Record<string, ElTreeNode>
}

/** el-tree @node-drop 回调的放置类型 */
type DropType = 'before' | 'after' | 'inner'

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
      parent_code: string | null
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
    count += node.children.reduce(
      (sum, child) => sum + calculateTotalEmployeeCount(child),
      0
    )
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

/**
 * 判断是否允许拖拽放置
 * @param draggingNode 被拖拽的节点
 * @param dropNode 目标节点
 * @param type 放置类型（before/after/inner）
 * @returns 是否允许放置
 */
const allowDrop = (draggingNode: ElTreeNode, dropNode: ElTreeNode, type: DropType): boolean => {
  const draggingData: DepartmentTreeNode = draggingNode.data
  const dropData: DepartmentTreeNode = dropNode.data

  // 计算放置后的层级
  let newLevel: number
  if (type === 'inner') {
    // 放入目标节点内部，层级为目标层级 + 1
    newLevel = dropData.level + 1
  } else {
    // 放在目标节点前后，层级与目标节点相同
    newLevel = dropData.level
  }

  // 检查层级限制（最大6层，level 从0开始）
  if (newLevel > 5) {
    ElMessage.warning('部门层级最多6层，无法放置到此位置')
    return false
  }

  // 不能放入自己或自己的子节点中
  if (isDescendant(dropData, draggingData.department_code)) {
    return false
  }

  return true
}

/**
 * 判断 target 是否是 source 的后代节点
 * @param target 目标节点
 * @param sourceCode 源节点编码
 * @returns 是否是后代
 */
const isDescendant = (target: DepartmentTreeNode, sourceCode: string): boolean => {
  if (target.department_code === sourceCode) {
    return true
  }
  if (target.children?.length) {
    for (const child of target.children) {
      if (isDescendant(child, sourceCode)) {
        return true
      }
    }
  }
  return false
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

  // 计算新的父节点编码
  let parentCode: string | null = null
  if (dropType === 'inner') {
    // 放入目标节点内部
    parentCode = dropData.department_code
  } else {
    // 放在目标节点前后，父节点与目标节点相同
    parentCode = dropData.parent_code
  }

  // 触发移动事件
  emit('move', {
    department_code: draggingData.department_code,
    parent_code: parentCode,
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
        font-size: 13px;
      }

      .count-tag {
        margin-left: 4px;
        font-size: 11px;
      }
    }
  }
}
</style>
