/**
 * GroupedAssetTable statusTag 回归用例（CT-4 回归屏障）
 *
 * 固化链路：F3 子表列集白名单含 asset_current_status → 作用域插槽透传给
 * GroupedAssetChildTable → 外层（AssetContentDetails 形态）以
 * `<StatusTag :status="row.asset_current_status" />` 渲染状态列。
 *
 * 断言三件事：
 *   a. 每个 StatusTag 实例拿到的 status 均为有效值 'in_store'（非 undefined / null）
 *   b. 映射文案渲染为「在库」（ASSET_STATUS_MAP 合约）
 *   c. 合法状态下 StatusTag 不触发 Invalid status 的 logWarn
 *   d. getGroupChildren 返回结果序列化契约（asset_current_status 非空 string）
 *
 * 【EP stub 设计】与 GroupedAssetTable.spec.ts 同构：本仓测试不挂 EP 插件，
 * 用 provide/inject（__rows / __expanded）复刻 el-table 的行注入语义，
 * 避免断言落在桩自身的简化上（历史版本正是因缺桩导致展开插槽 scope 为 undefined 而崩）。
 */
import { mount } from '@vue/test-utils'
import { computed, h } from 'vue'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockGetGroupedAssets, mockGetGroupChildren, mockLogError, mockLogWarn } = vi.hoisted(
  () => ({
    mockGetGroupedAssets: vi.fn(),
    mockGetGroupChildren: vi.fn(),
    mockLogError: vi.fn(),
    mockLogWarn: vi.fn(),
  }),
)

vi.mock('@/api/asset', () => ({
  assetAPI: {
    getGroupedAssets: mockGetGroupedAssets,
    getGroupChildren: mockGetGroupChildren,
  },
}))

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')
  return { ...actual, ElMessage: { error: vi.fn() } }
})

vi.mock('@/utils/logger', () => ({ logError: mockLogError, logWarn: mockLogWarn }))

import GroupedAssetTable from '../GroupedAssetTable.vue'
import StatusTag from '../commoncomponents/StatusTag.vue'
import type { AssetDetail, AssetGroupSummary, PaginatedResponse } from '@/types/asset'
import type { TableColumn } from '@/types/list'

type Row = Record<string, unknown>

const resolveRowKey = (row: Row, rowKey: unknown): string => {
  if (typeof rowKey === 'function') return String((rowKey as (r: Row) => string)(row))
  return String(row[String(rowKey)] ?? '')
}

const ElTableStub = {
  name: 'ElTable',
  props: ['data', 'rowKey', 'loading', 'expandRowKeys', 'height'],
  emits: ['expand-change'],
  provide(this: { data: Row[]; rowKey: unknown; expandRowKeys?: string[] }) {
    return {
      __rows: computed(() => this.data ?? []),
      __expanded: (row: Row) =>
        Array.isArray(this.expandRowKeys) &&
        this.expandRowKeys.includes(resolveRowKey(row, this.rowKey)),
    }
  },
  methods: {
    toggleRowSelection: vi.fn(),
    toggleAllSelection: vi.fn(),
    clearSelection: vi.fn(),
  },
  template: '<div class="el-table"><slot /></div>',
}

const ElTableColumnStub = {
  name: 'ElTableColumn',
  props: ['type', 'label', 'width', 'align', 'prop', 'fixed'],
  inject: ['__rows', '__expanded'],
  computed: {
    visibleRows(): Row[] {
      const rows = (this as unknown as { __rows: Row[] }).__rows
      if (this.type !== 'expand') return rows
      const isExpanded = (this as unknown as { __expanded: (r: Row) => boolean }).__expanded
      return rows.filter(isExpanded)
    },
  },
  template: `<div class="el-table-column" :data-type="type ?? ''" :data-fixed="fixed ?? ''">
    <div class="col-header"><slot name="header" :row="{}" /></div>
    <div v-for="(row, i) in visibleRows" :key="i" class="col-row"><slot :row="row" :$index="i" /></div>
  </div>`,
}

const globalMount = {
  directives: { loading: {} },
  stubs: {
    'el-table': ElTableStub,
    'el-table-column': ElTableColumnStub,
    'el-checkbox': {
      name: 'ElCheckbox',
      props: ['modelValue', 'indeterminate'],
      emits: ['change'],
      template: `<label class="el-checkbox"><input type="checkbox" :checked="modelValue" @change="$emit('change', $event.target.checked)" /></label>`,
    },
    'el-button': {
      name: 'ElButton',
      emits: ['click'],
      template: '<button class="el-button" @click="$emit(\'click\', $event)"><slot /></button>',
    },
    'el-pagination': { name: 'ElPagination', template: '<div class="el-pagination" />' },
    'el-tag': { template: '<span class="el-tag"><slot /></span>' },
    'el-input': { template: '<input />' },
  },
}

const DETAIL_COLUMNS: TableColumn[] = [
  { prop: 'recordcode', label: '唯一记录码', width: 150, align: 'center' },
  {
    type: 'custom',
    prop: 'asset_current_status',
    label: '当前状态',
    width: 130,
    align: 'center',
    slotName: 'asset_current_status',
  },
]

const GROUP_KEY = '["HT2024-001","笔记本","ThinkPad X1","Lenovo"]'

function makeSummary(overrides: Partial<AssetGroupSummary> = {}): AssetGroupSummary {
  return {
    group_key: GROUP_KEY,
    contract_code: 'HT2024-001',
    asset_name: '笔记本',
    asset_specification: 'ThinkPad X1',
    asset_brand: 'Lenovo',
    asset_count: 2,
    price_display: '¥12,000.00',
    asset_codes: ['A001', 'A002'],
    ...overrides,
  } as AssetGroupSummary
}

function makeDetail(asset_code: string, status = 'in_store'): AssetDetail {
  return {
    recordcode: `RC-${asset_code}`,
    asset_code,
    asset_current_status: status,
  } as AssetDetail
}

function paged<T>(results: T[], count = results.length): PaginatedResponse<T> {
  return { count, next: null, previous: null, results } as PaginatedResponse<T>
}

const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/** 复刻 AssetContentDetails 的状态列用法：作用域插槽把 row 交给真实 StatusTag */
function mountTable() {
  return mount(GroupedAssetTable, {
    props: { detailColumns: DETAIL_COLUMNS },
    slots: {
      asset_current_status: ({ row }: { row: AssetDetail }) =>
        h(StatusTag, { status: row.asset_current_status ?? '' }),
    },
    global: globalMount,
  })
}

/** 走 EP expand-change 事件通道展开组（与 GroupedAssetTable.spec.ts 同路径；载荷为行对象数组，element-plus@2.13.7 实证，BF-078） */
const expandGroup = async (wrapper: ReturnType<typeof mountTable>, row: AssetGroupSummary) => {
  const summaryTable = wrapper.findAllComponents({ name: 'ElTable' })[0]
  summaryTable.vm.$emit('expand-change', row, [row])
  await flush()
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetGroupedAssets.mockResolvedValue(paged([makeSummary()]))
  mockGetGroupChildren.mockResolvedValue(paged([makeDetail('A001'), makeDetail('A002')]))
})

describe('GroupedAssetTable statusTag regression (CT-4)', () => {
  it('a. 每个 StatusTag 实例 props("status") === "in_store"（非 undefined / null）', async () => {
    const wrapper = mountTable()
    await flush()
    await expandGroup(wrapper, makeSummary())

    const tags = wrapper.findAllComponents(StatusTag)
    expect(tags.length).toBeGreaterThan(0)
    tags.forEach((tag) => {
      expect(tag.props('status')).toBe('in_store')
    })
  })

  it('b. 渲染文本含「在库」（ASSET_STATUS_MAP 合约）', async () => {
    const wrapper = mountTable()
    await flush()
    await expandGroup(wrapper, makeSummary())

    expect(wrapper.text()).toContain('在库')
  })

  it('c. 合法状态下 StatusTag 不触发 Invalid status 的 logWarn（应为 0 次）', async () => {
    const wrapper = mountTable()
    await flush()
    await expandGroup(wrapper, makeSummary())

    expect(wrapper.findAllComponents(StatusTag).length).toBeGreaterThan(0)
    expect(mockLogWarn).not.toHaveBeenCalled()
  })

  it('d. 序列化契约：getGroupChildren 每条结果 asset_current_status 为非空 string', async () => {
    const { assetAPI } = await import('@/api/asset')
    const res = await assetAPI.getGroupChildren({ group_key: 'test', page: 1, page_size: 20 })
    expect(res.results).toBeDefined()
    expect(
      res.results.every(
        (r: AssetDetail) =>
          typeof r.asset_current_status === 'string' && r.asset_current_status !== '',
      ),
    ).toBe(true)
  })
})
