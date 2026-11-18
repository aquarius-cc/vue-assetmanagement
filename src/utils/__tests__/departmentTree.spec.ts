import { describe, it, expect } from 'vitest'
import type { DepartmentTreeNode } from '@/types/department'
import {
  collectSubtreeCodes,
  findDepartmentNode,
  getSubtreeHeight,
  isDepartmentInSubtree,
} from '../departmentTree'

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

/** 四层链：L0 → L1 → L2 → L3 */
const deep = node('L0', null, [node('L1', 'L0', [node('L2', 'L1', [node('L3', 'L2')])])])

describe('collectSubtreeCodes', () => {
  it('返回自身 + 全部后代编码（前序深度优先）', () => {
    expect(collectSubtreeCodes(rootNode)).toEqual(['ROOT', 'D1-1', 'D1-1-1', 'D1-2'])
  })

  it('四层链全部收集', () => {
    expect(collectSubtreeCodes(deep)).toEqual(['L0', 'L1', 'L2', 'L3'])
  })

  it('叶子返回自身编码', () => {
    expect(collectSubtreeCodes(d1_2)).toEqual(['D1-2'])
  })
})

describe('isDepartmentInSubtree', () => {
  it('自身命中', () => {
    expect(isDepartmentInSubtree(rootNode, 'ROOT')).toBe(true)
  })

  it('三级后代命中', () => {
    expect(isDepartmentInSubtree(rootNode, 'D1-1-1')).toBe(true)
  })

  it('兄弟节点与无关编码不命中', () => {
    expect(isDepartmentInSubtree(d1_1, 'D1-2')).toBe(false)
    expect(isDepartmentInSubtree(rootNode, 'NOPE')).toBe(false)
  })
})

describe('getSubtreeHeight', () => {
  it('叶子高度为 0', () => {
    expect(getSubtreeHeight(d1_2)).toBe(0)
  })

  it('两层子树高度为 1', () => {
    expect(getSubtreeHeight(d1_1)).toBe(1)
  })

  it('三层子树高度为 2', () => {
    expect(getSubtreeHeight(rootNode)).toBe(2)
  })

  it('四层链高度为 3', () => {
    expect(getSubtreeHeight(deep)).toBe(3)
  })
})
