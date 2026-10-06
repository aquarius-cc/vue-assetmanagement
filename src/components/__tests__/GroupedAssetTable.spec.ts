/**
 * F3 组件侧用例：src/components/__tests__/GroupedAssetTable.spec.ts
 *
 * 覆盖 F5 矩阵中归属组件层的用例：
 *   1 / 11 组级三态与明细勾选反向驱动
 *   6  无合同哨兵组渲染「—」而非裸 null
 *   12 组内分页条仅 asset_count > 100 可见
 *   13 冻结列（勾选 + 序号 fixed=left，操作 fixed=right）
 *   14 group_key 内嵌 null 位往返不崩
 *   明细插槽透传（F3 把 $slots 转发给明细 CommonList）
 *   明细列集由 prop 注入（DR-1：列集单一定义源在 AssetContentDetails）
 *
 * 【EP stub 设计说明】本仓测试不挂 Element Plus 插件（见 vitest.config.ts），
 * 故用 stub 复刻 el-table 的列渲染语义：真实 EP 由表格把行数据注入各列 default 插槽，
 * 这里以 provide/inject（__rows / __expanded）复刻同构行为，
 * 避免断言落在桩自身的简化上（例如「看起来没渲染」其实是桩丢了行）。
 */
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockGetGroupedAssets, mockGetGroupChildren, mockLogError } = vi.hoisted(() => ({
  mockGetGroupedAssets: vi.fn(),
  mockGetGroupChildren: vi.fn(),
  mockLogError: vi.fn(),
}))

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

vi.mock('@/utils/logger', () => ({ logError: mockLogError }))

import GroupedAssetTable from '../GroupedAssetTable.vue'
import type { AssetDetail, AssetGroupSummary, PaginatedResponse } from '@/types/asset'
import type { TableColumn } from '@/types/list'

type Row = Record<string, unknown>

/** row-key 既可能是字符串也可能是取值函数（EP 两种都支持），桩需一并解析 */
const resolveRowKey = (row: Row, rowKey: unknown): string => {
  if (typeof rowKey === 'function') return String((rowKey as (r: Row) => string)(row))
  return String(row[String(rowKey)] ?? '')
}

const ElTableStub = {
  name: 'ElTable',
  props: ['data', 'rowKey', 'loading', 'expandRowKeys'],
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
    // 受控模式勾选态由 CommonList 按 selectedKeys 计算，桩只需提供实例方法位；
    // 调参正确性由 CommonList.selection.spec.ts 精确断言，不在本文件重复覆盖。
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
  template: `<div class="el-table-column" :data-type="type ?? ''" :data-fixed="fixed ?? ''" :data-label="label ?? ''">
    <div class="col-header"><slot name="header" :row="{}" /></div>
    <div v-for="(row, i) in visibleRows" :key="i" class="col-row"><slot :row="row" :$index="i" /></div>
  </div>`,
}

const ElCheckboxStub = {
  name: 'ElCheckbox',
  props: ['modelValue', 'indeterminate'],
  emits: ['change'],
  template: `<label class="el-checkbox" :data-checked="String(modelValue)" :data-indeterminate="String(indeterminate)">
    <input type="checkbox" :checked="modelValue" @change="$emit('change', $event.target.checked)" />
  </label>`,
}

const ElButtonStub = {
  name: 'ElButton',
  emits: ['click'],
  template: '<button class="el-button" @click="$emit(\'click\', $event)"><slot /></button>',
}

const globalMount = {
  directives: { loading: {} },
  stubs: {
    'el-table': ElTableStub,
    'el-table-column': ElTableColumnStub,
    'el-table-body': { name: 'ElTableBody', template: '<div><slot /></div>' },
    'el-checkbox': ElCheckboxStub,
    'el-button': ElButtonStub,
    'el-pagination': {
      name: 'ElPagination',
      props: ['currentPage', 'pageSize', 'total'],
      template: '<div class="el-pagination" />',
    },
    'el-tag': { template: '<span class="el-tag"><slot /></span>' },
    'el-input': { template: '<input />' },
  },
}

const DETAIL_COLUMNS: TableColumn[] = [
  { type: 'index', label: '序号', width: 80, align: 'center' },
  { prop: 'recordcode', label: '唯一记录码', width: 150, align: 'center' },
  { prop: 'asset_code', label: '编码', width: 180, align: 'center' },
  { prop: 'asset_name', label: '名称', width: 180, align: 'left' },
  {
    type: 'custom',
    prop: 'physical_quantity',
    label: '实物数量',
    width: 110,
    align: 'center',
    slotName: 'physical_quantity',
  },
]

// ===== 夹具 =====
const KEY_MULTI = '["HT2024-001","笔记本","ThinkPad X1","Lenovo"]'
const KEY_SENTINEL = '[null,"投影仪",null,null]'
const KEY_LARGE = '["HT2024-002","服务器",null,null]'

function makeSummary(overrides: Partial<AssetGroupSummary> = {}): AssetGroupSummary {
  return {
    group_key: KEY_MULTI,
    contract_code: 'HT2024-001',
    asset_name: '笔记本',
    asset_specification: 'ThinkPad X1',
    asset_brand: 'Lenovo',
    asset_count: 3,
    price_display: '¥12,000.00',
    asset_codes: ['ZC001', 'ZC002', 'ZC003'],
    ...overrides,
  } as AssetGroupSummary
}

function makeDetail(asset_code: string, overrides: Partial<AssetDetail> = {}): AssetDetail {
  return { recordcode: `RC-${asset_code}`, asset_code, ...overrides } as AssetDetail
}

function paged<T>(results: T[], count = results.length): PaginatedResponse<T> {
  return { count, next: null, previous: null, results } as PaginatedResponse<T>
}

const SUMMARY_MULTI = makeSummary()
const SUMMARY_SENTINEL = makeSummary({
  group_key: KEY_SENTINEL,
  contract_code: null,
  asset_name: '投影仪',
  asset_specification: null,
  asset_brand: null,
  asset_count: 1,
  price_display: '¥0.00',
  asset_codes: ['ZC004'],
})
const SUMMARY_LARGE = makeSummary({
  group_key: KEY_LARGE,
  contract_code: 'HT2024-002',
  asset_name: '服务器',
  asset_specification: null,
  asset_brand: null,
  asset_count: 120,
  asset_codes: Array.from({ length: 120 }, (_, i) => `ZS${i}`),
})

function mountTable() {
  return mount(GroupedAssetTable, {
    props: { detailColumns: DETAIL_COLUMNS },
    slots: { physical_quantity: '<span class="qty-probe">1</span>' },
    global: globalMount,
  })
}

const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * 展开指定组：走 EP 的 `expand-change` 事件通道（即用户点箭头的真实路径），
 * 而非直接改 F2 内部状态 —— 这样同时覆盖 F3 的 `onExpandChange` → `setExpanded` 链路。
 */
const expandGroup = async (wrapper: ReturnType<typeof mountTable>, row: AssetGroupSummary) => {
  const summaryTable = wrapper.findAllComponents({ name: 'ElTable' })[0]
  summaryTable.vm.$emit('expand-change', row, true)
  await flush()
}

/** 明细区 CommonList 内的 el-table（最后一个 el-table 才是明细） */
const detailTableOf = (wrapper: ReturnType<typeof mountTable>) => {
  const tables = wrapper.findAllComponents({ name: 'ElTable' })
  expect(tables.length).toBeGreaterThan(1)
  return tables[tables.length - 1]
}

/** 汇总区第 N 行的组级 checkbox（DOM 里 index 0 是表头全选，故下标需 +1） */
const summaryGroupCheckbox = (wrapper: ReturnType<typeof mountTable>, rowIndex: number) => {
  const boxes = wrapper.findAll('.el-table-column[data-fixed="left"] .el-checkbox')
  return boxes[rowIndex + 1]
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_MULTI, SUMMARY_SENTINEL]))
  mockGetGroupChildren.mockImplementation((params: { group_key: string }) => {
    const map: Record<string, AssetDetail[]> = {
      [KEY_SENTINEL]: [makeDetail('ZC004')],
      [KEY_MULTI]: [
        makeDetail('ZC001', { asset_purchase_number: 3 }),
        makeDetail('ZC002', { asset_purchase_number: 3 }),
        makeDetail('ZC003', { asset_purchase_number: 3 }),
      ],
    }
    return Promise.resolve(paged(map[params.group_key] ?? []))
  })
})

describe('GroupedAssetTable · F3 组件层', () => {
  it('用例6：无合同哨兵组合同号渲染「—」，不出现裸 null', async () => {
    const wrapper = mountTable()
    await flush()
    const text = wrapper.text()
    expect(text).toContain('投影仪')
    expect(text).not.toContain('null')
    expect(text).toContain('—')
  })

  it('用例13：勾选列与序号列 fixed=left，操作列 fixed=right', async () => {
    const wrapper = mountTable()
    await flush()
    const columns = wrapper.findAll('.el-table-column')
    const fixedLeft = columns.filter((c) => c.attributes('data-fixed') === 'left')
    expect(fixedLeft.length).toBeGreaterThanOrEqual(2)
    const right = columns.filter((c) => c.attributes('data-fixed') === 'right')
    expect(right).toHaveLength(1)
    expect(right[0].text()).toContain('删除组内')
  })

  it('用例1：组级勾选反向驱动明细行勾选（CommonList 受控选中）', async () => {
    // 只保留多资产组：单条组会被 F2 自动展开，导致存在两个明细表格难以定位
    mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_MULTI]))
    const wrapper = mountTable()
    await flush()
    await expandGroup(wrapper, SUMMARY_MULTI)

    const detailTable = detailTableOf(wrapper)
    detailTable.vm.toggleRowSelection = vi.fn()

    await summaryGroupCheckbox(wrapper, 0).find('input').setValue(true)
    await flush()

    const calls = (detailTable.vm.toggleRowSelection as ReturnType<typeof vi.fn>).mock.calls
    expect(calls).toHaveLength(3)
    calls.forEach((call) => {
      expect(call[1]).toBe(true)
      expect(call[2]).toBe(true)
    })
  })

  it('用例11：组级 checkbox 三态随明细实际勾选状态变化', async () => {
    mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_MULTI]))
    const wrapper = mountTable()
    await flush()
    const summaryBox = summaryGroupCheckbox(wrapper, 0)
    expect(summaryBox.attributes('data-indeterminate')).toBe('false')

    await summaryBox.find('input').setValue(true)
    await flush()
    expect(summaryGroupCheckbox(wrapper, 0).attributes('data-checked')).toBe('true')
    expect(summaryGroupCheckbox(wrapper, 0).attributes('data-indeterminate')).toBe('false')
  })

  it('明细侧部分勾选回传后，组级 checkbox 转 indeterminate', async () => {
    mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_MULTI]))
    const wrapper = mountTable()
    await flush()
    await expandGroup(wrapper, SUMMARY_MULTI)

    await summaryGroupCheckbox(wrapper, 0).find('input').setValue(true)
    await flush()

    // 明细侧取消 1 条 → CommonList emit selection-change → F3 setGroupSelection → 组级转半选
    const detailList = wrapper.findAllComponents({ name: 'CommonList' })[0]
    detailList.vm.$emit('selection-change', [
      { recordcode: 'RC-ZC001', asset_code: 'ZC001' },
      { recordcode: 'RC-ZC002', asset_code: 'ZC002' },
    ])
    await flush()

    const box = summaryGroupCheckbox(wrapper, 0)
    expect(box.attributes('data-checked')).toBe('false')
    expect(box.attributes('data-indeterminate')).toBe('true')
  })

  it('用例12：asset_count=120 的组显示组内分页条', async () => {
    mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_MULTI, SUMMARY_LARGE]))
    mockGetGroupChildren.mockResolvedValue(paged([]))
    const wrapper = mountTable()
    await flush()
    await expandGroup(wrapper, SUMMARY_LARGE)
    expect(wrapper.find('.child-pagination').exists()).toBe(true)
    expect(wrapper.find('.child-pagination').text()).toContain('/ 120')
  })

  it('用例12：组内分页条在 asset_count <= 100 时不渲染', async () => {
    mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_MULTI]))
    mockGetGroupChildren.mockResolvedValue(paged([]))
    const wrapper = mountTable()
    await flush()
    await expandGroup(wrapper, SUMMARY_MULTI)
    expect(wrapper.find('.child-pagination').exists()).toBe(false)
  })

  it('用例4：点击「加载下一页」按 page=2 追加而非替换（append 语义）', async () => {
    const page1 = Array.from({ length: 20 }, (_, i) => makeDetail(`ZP${i}`))
    const page2 = Array.from({ length: 20 }, (_, i) => makeDetail(`ZQ${i}`))
    mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_LARGE]))
    mockGetGroupChildren
      .mockResolvedValueOnce(paged(page1, 120))
      .mockResolvedValueOnce(paged(page2, 120))

    const wrapper = mountTable()
    await flush()
    await expandGroup(wrapper, SUMMARY_LARGE)

    // 首屏 20 条 → 第 1 页
    expect(wrapper.find('.child-pagination').text()).toContain('已加载 20 / 120 条（第 1 页）')

    const moreButton = wrapper
      .findAll('.child-pagination .el-button')
      .find((b) => b.text().includes('加载下一页'))
    expect(moreButton).toBeDefined()
    await moreButton!.trigger('click')
    await flush()

    // 追加后 40 条、第 2 页；且第二个请求带 page=2
    expect(wrapper.find('.child-pagination').text()).toContain('已加载 40 / 120 条（第 2 页）')
    expect(mockGetGroupChildren).toHaveBeenLastCalledWith(
      expect.objectContaining({ group_key: KEY_LARGE, page: 2 }),
    )
  })

  it('用例14：group_key 内嵌 null 位（无合同 + 无规格 + 无品牌）不崩且能展开', async () => {
    mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_SENTINEL]))
    const wrapper = mountTable()
    await flush()
    expect(mockGetGroupChildren).toHaveBeenCalledWith(
      expect.objectContaining({ group_key: KEY_SENTINEL }),
    )
    expect(wrapper.text()).toContain('投影仪')
  })

  it('明细插槽透传：physical_quantity 插槽由 F3 转交给明细 CommonList', async () => {
    const wrapper = mountTable()
    await flush()
    expect(wrapper.findAll('.qty-probe').length).toBeGreaterThan(0)
  })

  it('明细列集由 prop 注入，不在 F3 内重复定义（DR-1）', async () => {
    const wrapper = mountTable()
    await flush()
    await expandGroup(wrapper, SUMMARY_MULTI)
    const labels = wrapper.findAll('.el-table-column').map((c) => c.attributes('data-label'))
    expect(labels).toContain('唯一记录码')
    expect(labels).toContain('实物数量')
  })
})
