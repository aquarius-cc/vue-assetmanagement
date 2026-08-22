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
