/**
 * 部门树通用工具函数
 *
 * 只保留「按编码查找」「子树编码集合 / 成员判定 / 子树高度」这几项无歧义语义；
 * 早期按 parent 链判定的 isDescendant / isDescendantByCode 已删除（同名不同义、
 * 且对深层子孙判定失效，改由 collectSubtreeCodes 一次性求子集，见 BF-202）。
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
