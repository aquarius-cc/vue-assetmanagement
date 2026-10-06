/**
 * F5 组件侧用例：src/components/componentsdetails/__tests__/AssetContentDetails.enableGrouping.spec.ts
 *
 * 覆盖：
 *   9  启用开关回归：enableGrouping 缺省 false 时走既有平铺路径（SmartListContainer + CommonList），
 *      GroupedAssetTable 零渲染
 *   15 数量语义回归：录入台数 asset_purchase_number=3 的 3 条记录，「实物数量」列每行恒显 1，
 *      **不得**显 3（否则读起来像 9 台实物）
 *   16 唯一记录码：recordcode 列存在且仅一列
 *
 * 【为何用真实 CommonList】用例 15 的断言对象是 AssetContentDetails 自有的
 * `physical_quantity` 插槽；桩掉 CommonList 就测不到它，测试会「绿而无效」。
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRemoveBatch, mockExcelExport } = vi.hoisted(() => ({
  mockRemoveBatch: vi.fn(),
  mockExcelExport: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ matched: [{ name: 'AssetContentDetails' }] }),
}))

vi.mock('@/composables/useAssetListConfig', () => ({
  useAssetListConfig: () => ({
    searchFields: [],
    storeConfig: {},
    exportColumns: [],
    assetStore: { removeBatch: mockRemoveBatch, pagination: { total: 3 } },
  }),
}))

vi.mock('@/composables/useExcelExport', () => ({
  useExcelExport: () => ({ handleExportExcel: mockExcelExport }),
}))

import AssetContentDetails from '../AssetContentDetails.vue'
import type { AssetDetail } from '@/types/asset'
import type { TableColumn } from '@/types/list'

/** 3 条记录，asset_purchase_number 均为 3（= 一次录入 3 台 fan-out） */
const ROWS: AssetDetail[] = [
  { recordcode: 'RC-1', asset_code: 'ZC001', asset_name: '笔记本', asset_purchase_number: 3 },
  { recordcode: 'RC-2', asset_code: 'ZC002', asset_name: '笔记本', asset_purchase_number: 3 },
  { recordcode: 'RC-3', asset_code: 'ZC003', asset_name: '笔记本', asset_purchase_number: 3 },
] as AssetDetail[]

const SmartListContainerStub = {
  name: 'SmartListContainer',
  props: ['storeConfig'],
  template: `<div class="smart-list">
    <slot :data="rows" :loading="false" :currentPage="1" :pageSize="20" :search="''"
      :total="3" :pageSizeOptions="[20]" :selectedRows="[]"
      :handleSizeChange="() => {}" :handleCurrentChange="() => {}"
      :performSearch="() => {}" :handleSelectionChange="() => {}" />
  </div>`,
  data() {
    return { rows: ROWS }
  },
}

const ElTableStub = {
  name: 'ElTable',
  props: ['data', 'rowKey', 'loading', 'expandRowKeys'],
  emits: ['selection-change'],
  methods: { toggleRowSelection: vi.fn(), clearSelection: vi.fn() },
  template: '<div class="el-table"><slot /></div>',
}

const ElTableColumnStub = {
  name: 'ElTableColumn',
  props: ['type', 'label', 'width', 'align', 'prop', 'slotName'],
  inject: { __rows: { default: () => [] } },
  computed: {
    rows(): Record<string, unknown>[] {
      return (this.__rows ?? []) as Record<string, unknown>[]
    },
  },
  template: `<div class="el-table-column" :data-label="label ?? ''" :data-prop="prop ?? slotName ?? ''">
    <div class="col-header"><slot name="header" :row="{}" /></div>
    <div v-for="(row, i) in rows" :key="i" class="col-row"><slot :row="row" :$index="i" /></div>
  </div>`,
}

const globalMount = {
  directives: { loading: {} },
  stubs: {
    SmartListContainer: SmartListContainerStub,
    SearchBar: { name: 'SearchBar', template: '<div class="search-bar" />' },
    'router-view': { template: '<div />' },
    GroupedAssetTable: {
      name: 'GroupedAssetTable',
      props: ['detailColumns'],
      template: '<div class="grouped" />',
    },
    'el-table': ElTableStub,
    'el-table-column': ElTableColumnStub,
    'el-pagination': { template: '<div />' },
    'el-input': { template: '<input />' },
    'el-button': { template: '<button><slot /></button>' },
    'el-tag': { template: '<span class="el-tag"><slot /></span>' },
    'el-checkbox': {
      props: ['modelValue', 'indeterminate'],
      template: '<input type="checkbox" />',
    },
    'el-form-item': { template: '<div><slot /></div>' },
    'el-date-picker': { template: '<div />' },
  },
}

/** 行数据经 provide 注入桩 el-table-column，使每列能按行渲染（复刻 EP 列渲染语义） */
const rowProvider = {
  install(app: { provide: (key: string, value: unknown) => void }) {
    app.provide('__rows', ROWS)
  },
}

const mountDetails = (props: Record<string, unknown> = {}) =>
  mount(AssetContentDetails, { props, global: { ...globalMount, plugins: [rowProvider] } })

const columnCells = (wrapper: ReturnType<typeof mountDetails>, label: string) =>
  wrapper.findAll(`.el-table-column[data-label="${label}"] .col-row`).map((c) => c.text())

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AssetContentDetails · 分组开关与列集回归', () => {
  it('用例9：缺省 enableGrouping=false 时渲染平铺列表，不渲染分组表格', () => {
    const wrapper = mountDetails()
    expect(wrapper.find('.smart-list').exists()).toBe(true)
    expect(wrapper.find('.grouped').exists()).toBe(false)
  })

  it('用例9：enableGrouping=true 时渲染分组表格，列集经 detailColumns 注入', () => {
    const wrapper = mountDetails({ enableGrouping: true })
    const grouped = wrapper.findComponent({ name: 'GroupedAssetTable' })
    expect(grouped.exists()).toBe(true)
    expect(wrapper.find('.smart-list').exists()).toBe(false)
    const columns = grouped.props('detailColumns') as { prop?: string }[]
    expect(columns.map((c) => c.prop)).toContain('physical_quantity')
  })

  it('用例15：「实物数量」列每行恒显 1，不受 asset_purchase_number=3 影响', () => {
    const wrapper = mountDetails()
    expect(columnCells(wrapper, '实物数量')).toEqual(['1', '1', '1'])
  })

  it('用例15：数量列未绑定 asset_purchase_number（绑定则 3 行会各显 3）', () => {
    const wrapper = mountDetails()
    const qtyColumn = wrapper
      .findAllComponents({ name: 'CommonListColumn' })
      .map((c) => c.props('column') as TableColumn)
      .find((c) => c.label === '实物数量')
    expect(qtyColumn).toBeDefined()
    expect(qtyColumn!.prop).toBe('physical_quantity')
    expect(qtyColumn!.prop).not.toBe('asset_purchase_number')
    expect(qtyColumn!.slotName).toBe('physical_quantity')
  })

  it('用例16：唯一记录码列存在且仅一列', () => {
    const wrapper = mountDetails()
    const labels = wrapper.findAll('.el-table-column').map((c) => c.attributes('data-label'))
    expect(labels.filter((l) => l === '唯一记录码')).toHaveLength(1)
  })

  it('用例16：新增单价列来自 asset_purchase_price', () => {
    const wrapper = mountDetails()
    const labels = wrapper.findAll('.el-table-column').map((c) => c.attributes('data-label'))
    expect(labels).toContain('单价')
    const priceColumn = wrapper
      .findAll('.el-table-column')
      .find((c) => c.attributes('data-label') === '单价')
    expect(priceColumn!.attributes('data-prop')).toBe('asset_purchase_price')
  })
})
