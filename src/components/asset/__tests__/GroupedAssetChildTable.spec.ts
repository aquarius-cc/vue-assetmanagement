/**
 * GroupedAssetChildTable 回归用例（CT-4 回归屏障）
 *
 * 子表必须钉 max-height="500"：否则 EP 根为 fit-content（table.scss:15），
 * 展开区内子表的横向滚动条锚定在长内容最底端（埋底），与列表页同型问题。
 * 取数值型而非百分比：style-helper.mjs:192 的数值路径无 wrap 参照系扣减缺陷
 * （百分比会走 :193 的 calc 路径产生双重扣减死带），且分页条 .child-pager
 * 作为兄弟节点自然下流，不受 D-1 型溢出影响。
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GroupedAssetChildTable from '../GroupedAssetChildTable.vue'
import type { TableColumn } from '@/types/list'
import type { AssetDetail } from '@/types/asset'

const ElTableStub = {
  name: 'ElTable',
  props: ['data', 'rowKey', 'loading', 'maxHeight', 'size', 'border', 'fit'],
  methods: {
    toggleRowSelection: vi.fn(),
    toggleAllSelection: vi.fn(),
    clearSelection: vi.fn(),
  },
  template: '<div class="el-table"><slot /></div>',
}

const globalMount = {
  directives: { loading: {} },
  stubs: {
    'el-table': ElTableStub,
    'el-table-column': {
      name: 'ElTableColumn',
      props: ['prop', 'label', 'showOverflowTooltip', 'fixed', 'type', 'width', 'minWidth'],
      template: '<div class="el-table-column" />',
    },
    'el-pagination': { name: 'ElPagination', template: '<div class="el-pagination" />' },
    'el-button': { name: 'ElButton', template: '<button><slot /></button>' },
  },
}

const COLUMNS: TableColumn[] = [{ prop: 'asset_code', label: '编码', width: 180 }]
const ROWS = [
  { recordcode: 'RC-1', asset_code: 'ZC001' },
  { recordcode: 'RC-2', asset_code: 'ZC002' },
] as AssetDetail[]

const mountChild = (options: Record<string, unknown> = {}) =>
  mount(GroupedAssetChildTable, {
    props: {
      rows: ROWS,
      columns: COLUMNS,
      groupIndex: 1,
      total: 3,
      currentPage: 1,
      ...(options.props as object),
    },
    global: globalMount,
  })

describe('GroupedAssetChildTable · 高度约束回归（CT-4）', () => {
  it('子表钉 max-height="500"（数值路径，横向条不埋底）', () => {
    const wrapper = mountChild()
    expect(wrapper.findComponent({ name: 'ElTable' }).props('maxHeight')).toBe('500')
  })

  it('分页条仅在 total > pageSize 时渲染（兄弟节点不被表格挤压）', () => {
    const withPager = mountChild({ props: { total: 120, pageSize: 20 } })
    expect(withPager.find('.child-pager').exists()).toBe(true)

    const withoutPager = mountChild({ props: { total: 3, pageSize: 20 } })
    expect(withoutPager.find('.child-pager').exists()).toBe(false)
  })

  it('分页条声明 size="small" 而非弃用布尔 small（EP 2.13.7 deprecation 告警防回潮，CT-4）', () => {
    const wrapper = mountChild({ props: { total: 120, pageSize: 20 } })
    const pager = wrapper.findComponent({ name: 'ElPagination' })
    expect(pager.exists()).toBe(true)
    expect(pager.attributes('size')).toBe('small')
    expect(pager.attributes('small')).toBeUndefined()
  })
})

describe('GroupedAssetChildTable · 全列统一换行策略（CT-4 回归屏障，2026-10-09）', () => {
  it('数据列不设 show-overflow-tooltip——EP .cell 默认折行（break-word 兜底），防截断回潮', () => {
    const wrapper = mountChild()
    const dataCols = wrapper
      .findAllComponents({ name: 'ElTableColumn' })
      .filter((c) => c.props('prop') !== undefined)
    expect(dataCols.length).toBeGreaterThan(0)
    for (const col of dataCols) {
      expect(col.props('showOverflowTooltip')).toBeFalsy()
    }
  })
})

// ===== BF-083：左固定四列 + 极窄（<673px）全列回退 =====

/** 按识别键取列：结构列用 label/type，数据列用 prop */
const columnByKey = (wrapper: ReturnType<typeof mountChild>) => {
  const map = new Map<string, ReturnType<typeof wrapper.findAllComponents>[number]>()
  for (const col of wrapper.findAllComponents({ name: 'ElTableColumn' })) {
    const prop = col.props('prop') as string | undefined
    const label = col.props('label') as string | undefined
    const type = col.props('type') as string | undefined
    map.set(prop ?? label ?? type ?? '', col)
  }
  return map
}

describe('GroupedAssetChildTable · 左固定四列 + 极窄回退（BF-083）', () => {
  let resizeCallback: ResizeObserverCallback | null = null

  class FakeResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      resizeCallback = callback
    }
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }

  beforeEach(() => {
    resizeCallback = null
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /** 模拟容器宽变化（RO 回调注入 contentRect.width） */
  const emitWidth = async (
    wrapper: ReturnType<typeof mountChild>,
    width: number,
  ): Promise<void> => {
    expect(resizeCallback, 'ResizeObserver 应在挂载时被构造并注册回调').not.toBeNull()
    resizeCallback?.(
      [{ contentRect: { width } } as unknown as ResizeObserverEntry],
      {} as ResizeObserver,
    )
    await wrapper.vm.$nextTick()
  }

  const BF83_COLUMNS: TableColumn[] = [
    { prop: 'recordcode', label: '唯一记录码', width: 150 },
    { prop: 'asset_code', label: '编码', width: 180 },
    { prop: 'asset_name', label: '名称', minWidth: 140 },
  ]

  it('常态（宽度未触发回退）：勾选/序号/唯一记录码/编码 fixed=left，操作 fixed=right', async () => {
    const wrapper = mountChild({ props: { columns: BF83_COLUMNS } })
    await wrapper.vm.$nextTick()
    const cols = columnByKey(wrapper)

    expect(cols.get('selection')?.props('fixed')).toBe('left')
    expect(cols.get('序号')?.props('fixed')).toBe('left')
    expect(cols.get('recordcode')?.props('fixed')).toBe('left')
    expect(cols.get('asset_code')?.props('fixed')).toBe('left')
    expect(cols.get('操作')?.props('fixed')).toBe('right')
    // 中间列不固定（名称/数量）
    expect(cols.get('asset_name')?.props('fixed')).toBeUndefined()
    expect(cols.get('数量')?.props('fixed')).toBeUndefined()
  })

  it('极窄 672px（< 673 阈值）：全列含操作一并解除固定——整表滑动', async () => {
    const wrapper = mountChild({ props: { columns: BF83_COLUMNS } })
    await emitWidth(wrapper, 672)
    const cols = columnByKey(wrapper)

    expect(cols.get('selection')?.props('fixed')).toBeUndefined()
    expect(cols.get('序号')?.props('fixed')).toBeUndefined()
    expect(cols.get('recordcode')?.props('fixed')).toBeUndefined()
    expect(cols.get('asset_code')?.props('fixed')).toBeUndefined()
    expect(cols.get('操作')?.props('fixed')).toBeUndefined()
  })

  it('边界 673px（= 阈值，数量列保底可见）：保持常态固定', async () => {
    const wrapper = mountChild({ props: { columns: BF83_COLUMNS } })
    await emitWidth(wrapper, 673)
    const cols = columnByKey(wrapper)

    expect(cols.get('selection')?.props('fixed')).toBe('left')
    expect(cols.get('recordcode')?.props('fixed')).toBe('left')
    expect(cols.get('asset_code')?.props('fixed')).toBe('left')
    expect(cols.get('操作')?.props('fixed')).toBe('right')
  })
})

describe('GroupedAssetChildTable · 固定格不透底源码锁（BF-083 透底修复）', () => {
  const specPath = expect.getState().testPath ?? ''
  const src = readFileSync(join(dirname(specPath), '..', 'GroupedAssetChildTable.vue'), 'utf8')

  it('行底色禁回 transparent——EP 固定格 background:inherit 取自 tr，透底即横滚重影', () => {
    expect(src).not.toMatch(/\.el-table__row\)\s*\{[^}]*background:\s*transparent/)
  })

  it('表头禁回 transparent 且 font-weight:600 保留', () => {
    expect(src).not.toMatch(/\.el-table__header th\)[^}]*background:\s*transparent/)
    expect(src).toMatch(/\.el-table__header th\)[^}]*font-weight:\s*600/)
  })
})
