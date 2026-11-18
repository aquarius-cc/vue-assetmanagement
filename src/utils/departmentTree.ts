/**
 * 部门树通用工具函数（自 DepartmentFormDialog.vue 物理提取，零逻辑变更）
 */
import type { DepartmentTreeNode } from '@/types/department'

/** 在部门树中查找指定编码的节点 */
export const findDepartmentNode = (
  nodes: DepartmentTreeNode[],
  targetCode: string,
): DepartmentTreeNode | null => {
  for (const node of nodes) {
    if (node.department_code === targetCode) return node
    if (node.children?.length) {
      const found = findDepartmentNode(node.children, targetCode)
      if (found) return found
    }
  }
  return null
}

/**
 * 判断节点是否是指定编码的子部门
 * @param node 节点
 * @param parentCode 父部门编码
 */
export const isDescendant = (node: DepartmentTreeNode, parentCode: string): boolean => {
  if (node.parent_department_code === parentCode) return true
  if (node.children?.length) {
    return node.children.some((child) => isDescendant(child, parentCode))
  }
  return false
}

/**
 * 判断指定编码的节点是否是另一个节点的子部门
 * @param code 要检查的编码
 * @param ancestorCode 祖先编码
 * @param tree 部门树
 */
export const isDescendantByCode = (
  code: string,
  ancestorCode: string,
  tree: DepartmentTreeNode[],
): boolean => {
  const node = findDepartmentNode(tree, code)
  if (!node) return false
  return isDescendant(node, ancestorCode)
}

/**
 * 收集节点自身及全部后代的部门编码（前序深度优先）
 * @param node 子树根节点
 * @returns 编码列表，首项为 node 自身
 */
export const collectSubtreeCodes = (node: DepartmentTreeNode): string[] => {
  const codes = [node.department_code]
  for (const child of node.children ?? []) {
    codes.push(...collectSubtreeCodes(child))
  }
  return codes
}

/**
 * 判断编码是否落在以 root 为根的子树内（含 root 自身）
 * @param root 子树根节点
 * @param code 待检查的部门编码
 */
export const isDepartmentInSubtree = (root: DepartmentTreeNode, code: string): boolean => {
  if (root.department_code === code) return true
  return (root.children ?? []).some((child) => isDepartmentInSubtree(child, code))
}

/**
 * 计算子树高度（相对深度，叶子为 0）
 * @param node 子树根节点
 * @returns 从 root 到最深叶子的边数
 */
export const getSubtreeHeight = (node: DepartmentTreeNode): number => {
  if (!node.children?.length) return 0
  return 1 + Math.max(...node.children.map((child) => getSubtreeHeight(child)))
}
