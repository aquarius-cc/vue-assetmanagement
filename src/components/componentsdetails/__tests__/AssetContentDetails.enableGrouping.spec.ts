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

const {
  mockRemoveBatch,
  mockExcelExport,
  mockGroupedSearch,
  mockGroupedRefresh,
  mockSmartSearchWithParams,
  mockSmartReset,
} = vi.hoisted(() => ({
  mockRemoveBatch: vi.fn(),
  mockExcelExport: vi.fn(),
  mockGroupedSearch: vi.fn(),
  mockGroupedRefresh: vi.fn(),
  mockSmartSearchWithParams: vi.fn(),
  mockSmartReset: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ matched: [{ name: 'AssetContentDetails' }] }),
}))

/**
 * 字段集用哨兵对象而非真实字段：本文件只断言「组件把 composable 返回的哪一个字段集
 * 绑给了 SearchBar」（接线正确性），字段集的真实构成（9 项 / 剔除分类键）由
 * `useAssetListConfig.spec.ts` 的 groupedSearchFields 用例负责——避免测试断言自身 mock。
 */
vi.mock('@/composables/useAssetListConfig', async () => {
  const { ref } = await import('vue')
  return {
    useAssetListConfig: () => ({
      searchFields: ref([{ key: 'FLAT_SENTINEL' }]),
      groupedSearchFields: ref([{ key: 'GROUPED_SENTINEL' }]),
      storeConfig: {},
      exportColumns: [],
      assetStore: { removeBatch: mockRemoveBatch, pagination: { total: 3 } },
    }),
  }
})

vi.mock('@/composables/useExcelExport', () => ({
  useExcelExport: () => ({ handleExportExcel: mockExcelExport }),
}))

import AssetContentDetails from '../AssetContentDetails.vue'
import StatusTag from '@/components/commoncomponents/StatusTag.vue'
import type { AssetDetail } from '@/types/asset'
import type { TableColumn } from '@/types/list'

/** 3 条记录，asset_purchase_number 均为 3（= 一次录入 3 台 fan-out）；asset_current_status 必填，见状态列用例 */
const ROWS: AssetDetail[] = [
  {
    recordcode: 'RC-1',
    asset_code: 'ZC001',
    asset_name: '笔记本',
    asset_purchase_number: 3,
    asset_current_status: 'in_store',
  },
  {
    recordcode: 'RC-2',
    asset_code: 'ZC002',
    asset_name: '笔记本',
    asset_purchase_number: 3,
    asset_current_status: 'in_store',
  },
  {
    recordcode: 'RC-3',
    asset_code: 'ZC003',
    asset_name: '笔记本',
    asset_purchase_number: 3,
    asset_current_status: 'in_store',
  },
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
  methods: {
    searchWithParams: mockSmartSearchWithParams,
    reset: mockSmartReset,
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
    SearchBar: {
      name: 'SearchBar',
      props: ['fields'],
      emits: ['search', 'reset'],
      template: '<div class="search-bar" />',
    },
    'router-view': { template: '<div />' },
    GroupedAssetTable: {
      name: 'GroupedAssetTable',
      props: ['detailColumns'],
      methods: { search: mockGroupedSearch, refresh: mockGroupedRefresh },
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

  /**
   * 夹具回归（CT-4）：ROWS 必须携带 asset_current_status，否则真实 StatusTag 收到
   * undefined 并打出 `[StatusTag] Invalid status "undefined"`（降级显示原始值，不抛错）。
   * 断言因此落在 props 上，而非期待组件崩溃。
   */
  it('状态列 StatusTag 收到真值 status（防 Invalid status "undefined" 告警）', () => {
    const wrapper = mountDetails()
    const tags = wrapper.findAllComponents(StatusTag)
    expect(tags).toHaveLength(3)
    for (const tag of tags) {
      expect(typeof tag.props('status')).toBe('string')
      expect(tag.props('status')).toBeTruthy()
    }
    expect(tags[0].text()).toBe('在库')
  })

  // ===== 【B 批】筛选字段集接线 + 分组筛选映射 =====
  describe('B 批 · 搜索栏字段集接线', () => {
    it('缺省（平铺）：SearchBar 收到 useAssetListConfig 的 searchFields 引用', () => {
      const wrapper = mountDetails()
      const fields = wrapper.findComponent({ name: 'SearchBar' }).props('fields')
      expect(fields).toEqual([{ key: 'FLAT_SENTINEL' }])
    })

    it('enableGrouping=true：SearchBar 改绑 groupedSearchFields 引用', () => {
      const wrapper = mountDetails({ enableGrouping: true })
      const fields = wrapper.findComponent({ name: 'SearchBar' }).props('fields')
      expect(fields).toEqual([{ key: 'GROUPED_SENTINEL' }])
      expect(fields).not.toEqual([{ key: 'FLAT_SENTINEL' }])
    })
  })

  describe('B 批 · 分组筛选映射 toGroupedFilters', () => {
    /** 9 个非组键 + 唯一改名键，覆盖 GROUPED_FILTER_KEY_MAP 的全部入口 */
    const NINE_KEYS = {
      asset_code: 'ZC001',
      asset_name: '笔记本',
      asset_brand: '联想',
      asset_specification: 'X1',
      asset_current_status: 'in_store',
      asset_contract_name: '框架合同',
      asset_type_category: 'AT_W2',
      asset_type_recordcode: 'ASSETTYPE-001',
      asset_storage_recordcode: 'STORAGE-001',
    }

    it('9 键映射为分组端点参数（asset_contract → contract_code 唯一改名）', async () => {
      const wrapper = mountDetails({ enableGrouping: true })
      wrapper.findComponent({ name: 'SearchBar' }).vm.$emit('search', {
        ...NINE_KEYS,
        asset_contract: 'HT2024-001',
      })
      await wrapper.vm.$nextTick()

      expect(mockGroupedSearch).toHaveBeenCalledWith({
        asset_code: 'ZC001',
        asset_name: '笔记本',
        asset_brand: '联想',
        asset_specification: 'X1',
        asset_current_status: 'in_store',
        asset_contract_name: '框架合同',
        asset_type_category: 'AT_W2',
        asset_type_recordcode: 'ASSETTYPE-001',
        asset_storage_recordcode: 'STORAGE-001',
        contract_code: 'HT2024-001',
      })
      expect(mockSmartSearchWithParams).not.toHaveBeenCalled()
    })

    it('映射表外的键被丢弃（DRF 会静默忽略，导致筛选无声失效）', async () => {
      const wrapper = mountDetails({ enableGrouping: true })
      wrapper.findComponent({ name: 'SearchBar' }).vm.$emit('search', {
        keyword: '机',
        no_contract: 'true',
        group_key: 'X',
      })
      await wrapper.vm.$nextTick()

      expect(mockGroupedSearch).toHaveBeenCalledWith({})
    })

    it('空串/未填的键不入参（后端将空串视为未传，避免误过滤）', async () => {
      const wrapper = mountDetails({ enableGrouping: true })
      wrapper.findComponent({ name: 'SearchBar' }).vm.$emit('search', {
        asset_code: 'ZC001',
        asset_name: '',
        asset_brand: undefined,
      })
      await wrapper.vm.$nextTick()

      expect(mockGroupedSearch).toHaveBeenCalledWith({ asset_code: 'ZC001' })
    })

    it('分组 reset 调用 groupedTable.search() 无参，不走平铺 reset', async () => {
      const wrapper = mountDetails({ enableGrouping: true })
      wrapper.findComponent({ name: 'SearchBar' }).vm.$emit('reset')
      await wrapper.vm.$nextTick()

      expect(mockGroupedSearch).toHaveBeenCalledTimes(1)
      expect(mockGroupedSearch).toHaveBeenCalledWith()
      expect(mockSmartReset).not.toHaveBeenCalled()
    })

    it('平铺模式：参数原样交给平铺列表，不经过分组映射', async () => {
      const wrapper = mountDetails()
      const params = { asset_type_category: 'AT_W2' }
      wrapper.findComponent({ name: 'SearchBar' }).vm.$emit('search', params)
      await wrapper.vm.$nextTick()

      expect(mockSmartSearchWithParams).toHaveBeenCalledWith(params)
      expect(mockGroupedSearch).not.toHaveBeenCalled()
    })
  })
})
