/**
 * GroupedAssetChildTable 回归用例（CT-4 回归屏障）
 *
 * 子表必须钉 max-height="500"：否则 EP 根为 fit-content（table.scss:15），
 * 展开区内子表的横向滚动条锚定在长内容最底端（埋底），与列表页同型问题。
 * 取数值型而非百分比：style-helper.mjs:192 的数值路径无 wrap 参照系扣减缺陷
 * （百分比会走 :193 的 calc 路径产生双重扣减死带），且分页条 .child-pager
 * 作为兄弟节点自然下流，不受 D-1 型溢出影响。
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
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
    'el-table-column': { name: 'ElTableColumn', template: '<div class="el-table-column" />' },
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
