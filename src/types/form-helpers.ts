/**
 * @file 表单辅助类型定义，包括各种建议项、树节点、时间线等辅助接口
 * @module types/form-helpers
 * @exports
 *   - AssetSuggestion/ContractFormSuggestion/StorageSuggestion/AssetTypeSuggestion: 建议项接口
 *   - ElTreeNode/ElTreeStore/DropType: el-tree 拖拽节点与存储接口
 *   - TimelineItem/ChangeRecord/DepartmentFormItem: 其他辅助接口
 * @callers
 *   - composables/*（组合式函数）
 *   - components/*（组件）
 *   - views/*（页面视图）
 */

import type { DepartmentTreeNode } from '@/types/department'

/** 资产建议项 */
export interface AssetSuggestion {
  value: string
  asset_code: string
  asset_name: string
  recordcode?: string
}

/** 合同建议项 */
export interface ContractFormSuggestion {
  value: string
  contract_code: string
  contract_name: string
  recordcode: string
}

/** 仓库建议项 */
export interface StorageSuggestion {
  value: string
  storage_code: string
  storage_name: string
}

/** 资产类型建议项 */
export interface AssetTypeSuggestion {
  value: string
  type_code: string
  type_name: string
}

/** El-Tree 拖拽节点（el-tree 回调中的内部 TreeNode 对象） */
export interface ElTreeNode {
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

/** El-Tree store（用于访问所有节点的映射表） */
export interface ElTreeStore {
  /** 节点映射表，key 为节点 id，value 为节点对象 */
  nodesMap: Record<string, ElTreeNode>
}

/** el-tree @node-drop 回调的放置类型 */
export type DropType = 'before' | 'after' | 'inner'

/** 时间线条目 */
export interface TimelineItem {
  timestamp: string
  content: string
  type?: string
}

/** 操作日志变更记录 */
export interface ChangeRecord {
  field: string
  old_value: string
  new_value: string
}

/** 部门表单项 */
export interface DepartmentFormItem {
  label: string
  value: string | number
}
