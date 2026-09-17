import { describe, it, expect } from 'vitest'
import type { DepartmentTreeNode } from '@/types/department'
import { findDepartmentNode, isDescendant, isDescendantByCode } from '../departmentTree'

function node(
  code: string,
  parent: string | null,
  children: DepartmentTreeNode[] = [],
): DepartmentTreeNode {
  return {
    recordcode: `rc-${code}`,
    department_code: code,
    department_name: code,
    department_information: '',
    parent: parent,
    parent_department_code: parent,
    path: code,
    level: 0,
    sort_order: 0,
    children,
  }
}

const d1_1 = node('D1-1', 'D1', [node('D1-1-1', 'D1-1')])
const d1_2 = node('D1-2', 'D1')
const rootNode = node('ROOT', null, [d1_1, d1_2])
const tree = [rootNode, node('D2', 'ROOT')]

describe('findDepartmentNode', () => {
  it('根节点直接命中', () => {
    const found = findDepartmentNode(tree, 'ROOT')
    expect(found?.department_code).toBe('ROOT')
  })

  it('深层子节点命中', () => {
    const found = findDepartmentNode(tree, 'D1-1-1')
    expect(found?.department_code).toBe('D1-1-1')
  })

  it('兄弟节点在后半段命中', () => {
    const found = findDepartmentNode(tree, 'D2')
    expect(found?.department_code).toBe('D2')
  })

  it('子节点搜索未命中后继续遍历', () => {
    const fallthrough = [node('A', null, [node('B', 'A')]), node('C', 'ROOT')]
    const found = findDepartmentNode(fallthrough, 'C')
    expect(found?.department_code).toBe('C')
  })

  it('目标不存在时返回 null', () => {
    expect(findDepartmentNode(tree, 'NOPE')).toBeNull()
  })

  it('空 children 数组不进入递归', () => {
    const singled = [node('X', null, [])]
    expect(findDepartmentNode(singled, 'Y')).toBeNull()
  })

  it('无 children 属性的节点不进入递归', () => {
    const withoutChildren = [
      {
        recordcode: 'rc-D2',
        department_code: 'D2',
        department_name: 'D2',
        department_information: '',
        parent: 'ROOT',
        parent_department_code: 'ROOT',
        path: 'D2',
        level: 0,
        sort_order: 0,
      } as DepartmentTreeNode,
    ]
    expect(findDepartmentNode(withoutChildren, 'D2')?.department_code).toBe('D2')
    expect(findDepartmentNode(withoutChildren, 'NOPE')).toBeNull()
  })
})

describe('isDescendant', () => {
  it('节点自身父编码匹配返回 true', () => {
    expect(isDescendant(d1_1, 'D1')).toBe(true)
  })

  it('子节点中的某个父编码匹配返回 true', () => {
    const parentX = node('PX', 'ROOT', [node('CX', 'PX')])
    expect(isDescendant(parentX, 'PX')).toBe(true)
  })

  it('子节点中的深层节点递归返回 true', () => {
    expect(isDescendant(rootNode, 'D1-1')).toBe(true)
  })

  it('深层节点非目标后代时返回 false', () => {
    expect(isDescendant(rootNode, 'D1-1-1')).toBe(false)
  })

  it('子节点均不匹配返回 false', () => {
    expect(isDescendant(rootNode, 'Z')).toBe(false)
  })

  it('无子节点且父编码不匹配返回 false', () => {
    expect(isDescendant(d1_2, 'Z')).toBe(false)
    expect(isDescendant(d1_2, 'D1')).toBe(true)
  })
})

describe('isDescendantByCode', () => {
  it('编码不存在时返回 false', () => {
    expect(isDescendantByCode('NOPE', 'ROOT', tree)).toBe(false)
  })

  it('编码节点为指定祖先的后代时返回 true', () => {
    expect(isDescendantByCode('D1-1', 'D1', tree)).toBe(true)
  })

  it('编码节点不是指定祖先的后代时返回 false', () => {
    expect(isDescendantByCode('D1-1', 'ROOT', tree)).toBe(false)
  })
})
