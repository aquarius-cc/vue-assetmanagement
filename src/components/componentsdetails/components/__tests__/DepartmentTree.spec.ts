/**
 * DepartmentTree 组件补测（MA-23 包 2 · `.vue` 覆盖率棘轮重基前的组件补测）
 *
 * 本文件覆盖 `components/componentsdetails/components/DepartmentTree.vue` 此前
 * 近零覆盖的面（补测前 2.4% 语句覆盖）：
 *   - 模板：树节点渲染、递归人数标签（`calculateTotalEmployeeCount`）、
 *     有/无子节点两支图标分支（`FolderOpened` / `Folder` / `Document`）
 *   - 交互：展开 / 折叠（走 `treeRef.store.nodesMap`）、节点点击 emit `select`
 *   - 拖拽：`allowDrop` 的环判定（落点后的新父节点 ∈ 被拖子树 → 拒绝并告警，含 self-drop）、
 *     层级判定（新层级 + 被拖子树高度 > 5 → 拒绝并告警）、告警去重（同一落点只提示一次）；
 *     `handleNodeDrop` 的 inner / before-outer 两种父节点取值
 *   - 监听：`watch(immediate)` 在有数据且无展开记录时写入 `default-expanded-keys`
 *   - `refresh()` 暴露方法 emit `refresh`
 *
 * 设计取舍：`el-tree` 用自定义桩（真实 EP 树在 jsdom 下无 store 可控性），
 * 桩按 `store.nodesMap` 逐行转发 default slot，使被测组件的 slot 模板真实求值；
 * `element-plus` 仅 mock `ElMessage`（断言层级告警），不桩掉其余导出面。
 */
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockWarning } = vi.hoisted(() => ({ mockWarning: vi.fn() }))

vi.mock('element-plus', () => ({
  ElMessage: { warning: mockWarning, success: vi.fn(), error: vi.fn() },
}))

import DepartmentTree from '../DepartmentTree.vue'
import type { DepartmentTreeNode } from '@/types/department'

/** 4 节点 / 3 层：D1(0) → D11(1) → D111(2)，D2(0) 为叶子 */
const TREE = [
  {
    recordcode: 'R1',
    department_code: 'D1',
    department_name: '总公司',
    level: 0,
    parent_department_code: null,
    employee_count: 5,
    children: [
      {
        recordcode: 'R11',
        department_code: 'D11',
        department_name: '研发部',
        level: 1,
        parent_department_code: 'D1',
        employee_count: 2,
        children: [
          {
            recordcode: 'R111',
            department_code: 'D111',
            department_name: '后端组',
            level: 2,
            parent_department_code: 'D11',
            employee_count: 1,
          },
        ],
      },
    ],
  },
  {
    recordcode: 'R2',
    department_code: 'D2',
    department_name: '市场部',
    level: 0,
    parent_department_code: null,
    employee_count: 3,
  },
] as unknown as DepartmentTreeNode[]

/** 与 `store.nodesMap` 键一一对应，供桩按行下发 `node.expanded` */
const NODE_CODES = ['D1', 'D11', 'D111', 'D2']

type TreeRow = {
  department_code: string
  department_name: string
  employee_count?: number
  children?: TreeRow[]
}

const ElTreeStub = {
  name: 'ElTree',
  props: {
    data: { type: Array, default: () => [] },
    props: { type: Object, default: () => ({}) },
    draggable: { type: Boolean, default: false },
    allowDrop: { type: Function, default: null },
    nodeKey: { type: String, default: '' },
    highlightCurrent: { type: Boolean, default: false },
    currentNodeKey: { type: [String, null], default: null },
    defaultExpandedKeys: { type: Array, default: () => [] },
  },
  emits: ['node-click', 'node-drop'],
  setup(props: { data?: unknown[] }) {
    const store: { nodesMap: Record<string, { expanded: boolean }> } = {
      nodesMap: Object.fromEntries(NODE_CODES.map((code) => [code, { expanded: false }])),
    }
    const flat = computed<TreeRow[]>(() => {
      const out: TreeRow[] = []
      const walk = (nodes: TreeRow[]) => {
        for (const n of nodes) {
          out.push(n)
          if (n.children?.length) walk(n.children)
        }
      }
      walk((props.data ?? []) as TreeRow[])
      return out
    })
    return { store, flat }
  },
  template: `
    <div class="tree-stub">
      <div
        v-for="row in flat"
        :key="row.department_code"
        class="tree-node-row"
        @click="$emit('node-click', row)"
      >
        <slot
          :node="{ expanded: !!store.nodesMap[row.department_code]?.expanded }"
          :data="row"
        />
      </div>
    </div>
  `,
}

const globalMount = {
  stubs: {
    'el-tree': ElTreeStub,
    'el-button': { template: '<button class="el-btn"><slot /></button>' },
    'el-icon': { template: '<i class="el-icon"><slot /></i>' },
    'el-tag': { template: '<span class="el-tag"><slot /></span>' },
  },
}

const mountTree = (props: Record<string, unknown> = {}) =>
  mount(DepartmentTree, { props: { data: TREE, ...props }, global: globalMount })

const treeStub = (wrapper: ReturnType<typeof mountTree>) =>
  wrapper.findComponent({ name: 'ElTree' })

const allowDropOf = (wrapper: ReturnType<typeof mountTree>) =>
  treeStub(wrapper).props('allowDrop') as (
    dragging: { data: TreeRow },
    drop: { data: TreeRow },
    type: 'inner' | 'before' | 'after',
  ) => boolean

beforeEach(() => {
  mockWarning.mockClear()
})

describe('DepartmentTree · 渲染与人数递归', () => {
  it('4 个节点全部渲染，部门名称可见', () => {
    const wrapper = mountTree()
    const labels = wrapper.findAll('.tree-node').map((n) => n.find('.node-label').text())
    expect(labels).toEqual(['总公司', '研发部', '后端组', '市场部'])
  })

  it('人数标签按子树递归求和（D1 = 5+2+1 = 8），叶子取自身值', () => {
    const wrapper = mountTree()
    const tags = wrapper.findAll('.el-tag').map((t) => t.text())
    expect(tags).toEqual(['8人', '3人', '1人', '3人'])
  })

  it('有子节点的行渲染 Folder 图标（node.expanded=false 走 v-else 分支）', () => {
    const wrapper = mountTree()
    const firstRow = wrapper.findAll('.tree-node')[0]
    expect(firstRow.find('.node-icon').exists()).toBe(true)
    expect(firstRow.classes()).not.toContain('is-leaf')
  })

  it('叶子行渲染 Document 图标并带 is-leaf 类', () => {
    const wrapper = mountTree()
    const leafRow = wrapper.findAll('.tree-node')[3]
    expect(leafRow.classes()).toContain('is-leaf')
    expect(leafRow.find('.node-icon').exists()).toBe(true)
  })

  it('immediate watch 在有数据时写入 default-expanded-keys（顶层节点码）', () => {
    const wrapper = mountTree()
    expect(treeStub(wrapper).props('defaultExpandedKeys')).toEqual(['D1', 'D2'])
  })
})

describe('DepartmentTree · 交互', () => {
  it('节点点击 emit select 并携带该节点数据', () => {
    const wrapper = mountTree()
    wrapper.findAll('.tree-node-row')[1].trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
    expect((wrapper.emitted('select')![0] as unknown[])[0]).toMatchObject({
      department_code: 'D11',
    })
  })

  it('展开按钮把 store.nodesMap 全部置 expanded=true（含重渲染走 FolderOpened 分支）', async () => {
    const wrapper = mountTree()
    const nodesMap = treeStub(wrapper).vm.store.nodesMap
    expect(Object.values(nodesMap).every((n) => !n.expanded)).toBe(true)

    await wrapper.findAll('.el-btn')[0].trigger('click')

    expect(Object.values(treeStub(wrapper).vm.store.nodesMap).every((n) => n.expanded)).toBe(true)
    expect(wrapper.findAll('.tree-node')[0].find('.node-icon').exists()).toBe(true)
  })

  it('折叠按钮把 store.nodesMap 全部置 expanded=false', async () => {
    const wrapper = mountTree()
    await wrapper.findAll('.el-btn')[1].trigger('click')
    const nodesMap = treeStub(wrapper).vm.store.nodesMap
    expect(Object.values(nodesMap).every((n) => !n.expanded)).toBe(true)
  })

  it('refresh() 暴露方法 emit refresh', () => {
    const wrapper = mountTree()
    ;(wrapper.vm as unknown as { refresh: () => void }).refresh()
    expect(wrapper.emitted('refresh')).toHaveLength(1)
  })
})

describe('DepartmentTree · 拖拽防环与层级校验（allowDrop）', () => {
  it('拖入第 6 层（newLevel > 5）拒绝并弹层级告警', () => {
    const wrapper = mountTree()
    const drop = { data: { ...TREE[0].children![0].children![0], level: 5 } } as { data: TreeRow }
    const dragging = { data: { ...TREE[1], department_code: 'D2' } } as { data: TreeRow }

    expect(allowDropOf(wrapper)(dragging, drop, 'inner')).toBe(false)
    expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('最多'))
  })

  it('层级判定计入被拖子树高度：高度 2 的子树拖入 level=4 拒绝', () => {
    const wrapper = mountTree()
    // D1 → D11 → D111 高度为 2，落入 level 4 后最深节点将达第 8 层
    const dragging = { data: { ...TREE[0] } } as { data: TreeRow }
    const drop = { data: { ...TREE[1], level: 4 } } as { data: TreeRow }

    expect(allowDropOf(wrapper)(dragging, drop, 'inner')).toBe(false)
    expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('最多'))
  })

  it('拖到自身节点上拒绝并弹环告警（before / inner 一致）', () => {
    const wrapper = mountTree()
    const dragging = { data: { ...TREE[0] } } as { data: TreeRow }
    const same = { data: { ...TREE[0] } } as { data: TreeRow }

    expect(allowDropOf(wrapper)(dragging, same, 'before')).toBe(false)
    expect(allowDropOf(wrapper)(dragging, same, 'inner')).toBe(false)
    expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('子部门'))
  })

  it('拖父节点到其子节点 inner 拒绝（新父节点落在被拖子树内）', () => {
    const wrapper = mountTree()
    const dragging = { data: { ...TREE[0] } } as { data: TreeRow }
    const child = { data: { ...TREE[0].children![0] } } as { data: TreeRow }

    expect(allowDropOf(wrapper)(dragging, child, 'inner')).toBe(false)
    expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('子部门'))
  })

  it('拖父节点到其子节点 before 拒绝（新父节点仍是自身）', () => {
    const wrapper = mountTree()
    const dragging = { data: { ...TREE[0] } } as { data: TreeRow }
    const child = { data: { ...TREE[0].children![0] } } as { data: TreeRow }

    expect(allowDropOf(wrapper)(dragging, child, 'before')).toBe(false)
    expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('子部门'))
  })

  it('拖子节点到祖先 before 允许（提级，不再误拒）', () => {
    const wrapper = mountTree()
    const dragging = { data: { ...TREE[0].children![0].children![0] } } as { data: TreeRow }
    const ancestor = { data: { ...TREE[0] } } as { data: TreeRow }

    expect(allowDropOf(wrapper)(dragging, ancestor, 'before')).toBe(true)
    expect(mockWarning).not.toHaveBeenCalled()
  })

  it('同一落点重复校验只提示一次（dragover 高频调用去重）', () => {
    const wrapper = mountTree()
    const dragging = { data: { ...TREE[0] } } as { data: TreeRow }
    const drop = { data: { ...TREE[1], level: 4 } } as { data: TreeRow }
    const allow = allowDropOf(wrapper)

    allow(dragging, drop, 'inner')
    allow(dragging, drop, 'inner')
    allow(dragging, drop, 'inner')

    expect(mockWarning).toHaveBeenCalledTimes(1)
  })

  it('同层 before 放置在层级 0 的节点上允许', () => {
    const wrapper = mountTree()
    const dragging = { data: { ...TREE[1] } } as { data: TreeRow }
    const drop = { data: { ...TREE[0] } } as { data: TreeRow }

    expect(allowDropOf(wrapper)(dragging, drop, 'before')).toBe(true)
    expect(mockWarning).not.toHaveBeenCalled()
  })
})

describe('DepartmentTree · 拖拽落点（handleNodeDrop）', () => {
  it('inner：新父节点 = 目标节点自身', () => {
    const wrapper = mountTree()
    const dragging = { data: { ...TREE[1] } } as { data: TreeRow }
    const drop = { data: { ...TREE[0] } } as { data: TreeRow }

    treeStub(wrapper).vm.$emit('node-drop', dragging, drop, 'inner')

    expect(wrapper.emitted('move')).toHaveLength(1)
    expect(wrapper.emitted('move')![0]).toEqual([
      { department_code: 'D2', parent_department_code: 'D1', target_code: 'D1' },
    ])
  })

  it('before/after：新父节点 = 目标节点的父节点', () => {
    const wrapper = mountTree()
    const dragging = { data: { ...TREE[1] } } as { data: TreeRow }
    const drop = { data: { ...TREE[0].children![0] } } as { data: TreeRow }

    treeStub(wrapper).vm.$emit('node-drop', dragging, drop, 'before')

    expect(wrapper.emitted('move')![0]).toEqual([
      { department_code: 'D2', parent_department_code: 'D1', target_code: 'D11' },
    ])
  })
})
