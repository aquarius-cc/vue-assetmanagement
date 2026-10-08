/**
 * F3 组件侧用例：src/components/__tests__/GroupedAssetTable.spec.ts
 *
 * 覆盖 F5 矩阵中归属组件层的用例：
 *   1 / 11 组级三态与明细勾选反向驱动
 *   6  无合同哨兵组渲染「—」而非裸 null
 *   12 组内分页条仅 asset_count > page_size 可见（BF-073 修正后口径）
 *   13 冻结列（勾选 + 序号 fixed=left，操作 fixed=right）
 *   14 group_key 内嵌 null 位往返不崩
 *   15 汇总列序 = 勾选 → 展开 → 序号（BF-078 需求1；按 EP fixed 重排口径断言真实可见序，非声明序）
 *   16 折叠 A 后展开 B，A 不复活（BF-078 需求2 onExpandChange 归一化，不连带展开）
 *   17~19 会话快照三连：captureSession 采集形状 / initialSnapshot 水合回放顺序 /
 *        滚动位 setScrollTop 回放（BF-078 需求3 返回状态恢复）
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
import GroupedAssetChildTable from '../asset/GroupedAssetChildTable.vue'
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
    // 受控模式勾选态由 CommonList 的 selectedKeys 计算，桩只需提供实例方法位；
    // 调参正确性由 CommonList.selection.spec.ts 精确断言，不在本文件重复覆盖。
    toggleRowSelection: vi.fn(),
    toggleAllSelection: vi.fn(),
    clearSelection: vi.fn(),
    // BF-078 需求3：水合完成后回放滚动位的公开 API 位（真 EP 由 useScrollbar 提供）
    setScrollTop: vi.fn(),
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
    prop: 'asset_current_status',
    label: '当前状态',
    width: 130,
    align: 'center',
    slotName: 'asset_current_status',
  },
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
/** 21~100 缺口档代表（BF-073）：50 条组在旧阈值下分页条不渲染 */
const SUMMARY_MID = makeSummary({
  group_key: '["HT2024-003","交换机",null,null]',
  contract_code: 'HT2024-003',
  asset_name: '交换机',
  asset_specification: null,
  asset_brand: null,
  asset_count: 50,
  asset_codes: Array.from({ length: 50 }, (_, i) => `ZM${i}`),
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
 * 载荷形态与 element-plus@2.13.7 `expand.mjs#toggleRowExpansion` 实证一致：
 * 第二参为**行对象数组**（展开后含该行），非 boolean（BF-078）。
 */
const expandGroup = async (wrapper: ReturnType<typeof mountTable>, row: AssetGroupSummary) => {
  const summaryTable = wrapper.findAllComponents({ name: 'ElTable' })[0]
  summaryTable.vm.$emit('expand-change', row, [row])
  await flush()
}

/** 折叠指定组：同 EP 真实载荷 —— 折叠后第二参数组已不含该行（空数组即全折叠） */
const collapseGroup = async (wrapper: ReturnType<typeof mountTable>, row: AssetGroupSummary) => {
  const summaryTable = wrapper.findAllComponents({ name: 'ElTable' })[0]
  summaryTable.vm.$emit('expand-change', row, [])
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
  // 回归屏障（CT-4）：汇总表必须 height="100%" 且由 __body 包裹层承载，
  // 否则 EP 根 fit-content → 横向条锚在内容最底端（埋底），或表格吃满根高把分页条顶出（D-1）。
  it('汇总表钉 height="100%"，且存在 __body 自滚包裹层', async () => {
    const wrapper = mountTable()
    await flush()
    expect(wrapper.findComponent({ name: 'ElTable' }).props('height')).toBe('100%')
    expect(wrapper.find('.grouped-asset-table__body').exists()).toBe(true)
    // 分页条仍是根的直接子节点（流内、flex-shrink:0 由样式保障）
    expect(wrapper.find('.grouped-asset-table > .grouped-asset-table__pagination').exists()).toBe(
      true,
    )
  })

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
    // 显式展开一个组，使子表（含 fixed=right 操作列）进入 DOM（BF-078 单条组不再自动展开）
    await expandGroup(wrapper, SUMMARY_MULTI)
    const columns = wrapper.findAll('.el-table-column')
    const fixedLeft = columns.filter((c) => c.attributes('data-fixed') === 'left')
    expect(fixedLeft.length).toBeGreaterThanOrEqual(2)
    // 汇总操作列 + 子表操作列均 fixed=right（嵌套子表后共 2 处）；
    // right[0] 可能是子表「编辑/删除/详细」列，汇总「删除组内」列按文本定位
    const right = columns.filter((c) => c.attributes('data-fixed') === 'right')
    expect(right.length).toBeGreaterThanOrEqual(2)
    expect(right.some((c) => c.text().includes('删除组内'))).toBe(true)
  })

  it('用例15：汇总列序 = 勾选 → 展开 → 序号（BF-078 列序需求，EP 重排口径）', async () => {
    const wrapper = mountTable()
    await flush()
    const columns = wrapper.findAll('.el-table-column')
    // EP 真实渲染序 ≠ 声明序：store/watcher.mjs updateColumns 把列重排为
    // [fixed-left 组（声明序）] + [非 fixed 组（声明序）] + [fixed-right 组]，
    // 表头（convertToRows(originColumns)）与表体同走该序；桩按声明序渲染 DOM，
    // 故本用例在断言前按 EP 规则重排，锁的是「真实可见序」。
    // 语义边界（BF-078 二轮回填同注）：本用例把 EP 重排规则镜像进测试，
    // 防的是「改回声明序 / 去掉 fixed」类回归；EP 升级若改重排语义，
    // 本用例防不住——最终裁决以浏览器目验为准。
    const epOrder = [
      ...columns.filter((c) => c.attributes('data-fixed') === 'left'),
      ...columns.filter((c) => !c.attributes('data-fixed')),
      ...columns.filter((c) => c.attributes('data-fixed') === 'right'),
    ]
    const expandDecl = columns.find((c) => c.attributes('data-type') === 'expand')
    expect(expandDecl).toBeDefined()
    // 展开列必须声明 fixed=left，否则 EP 把它沉到非 fixed 组、可见序变为勾选→序号→展开
    expect(expandDecl!.attributes('data-fixed')).toBe('left')
    const checkboxPos = epOrder.findIndex((c) => c.find('.el-checkbox').exists())
    const expandPos = epOrder.findIndex((c) => c.attributes('data-type') === 'expand')
    const indexPos = epOrder.findIndex((c) => c.attributes('data-label') === '序号')
    expect(checkboxPos).toBeGreaterThanOrEqual(0)
    // 勾选 → 展开：展开紧邻勾选右侧（EP 重排后）
    expect(expandPos).toBe(checkboxPos + 1)
    // 展开 → 序号：序号紧邻展开右侧（EP 重排后）
    expect(indexPos).toBe(expandPos + 1)
  })

  it('用例16：折叠 A 后展开 B，A 不复活（BF-078 连带展开回归）', async () => {
    mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_MULTI, SUMMARY_SENTINEL]))
    const wrapper = mountTable()
    await flush()
    const summaryTable = wrapper.findAllComponents({ name: 'ElTable' })[0]

    await expandGroup(wrapper, SUMMARY_MULTI)
    expect(summaryTable.props('expandRowKeys')).toEqual([KEY_MULTI])

    await collapseGroup(wrapper, SUMMARY_MULTI)
    expect(summaryTable.props('expandRowKeys')).toEqual([])

    await expandGroup(wrapper, SUMMARY_SENTINEL)
    expect(summaryTable.props('expandRowKeys')).toEqual([KEY_SENTINEL])
  })

  it('用例1：组级勾选反向驱动明细行勾选（CommonList 受控选中）', async () => {
    // 只保留多资产组：本用例聚焦多资产组级联，单一明细表格便于定位（单条组默认折叠后亦无自动展开干扰，BF-078）
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

    // 明细侧取消 1 条 → GroupedAssetChildTable emit selection-change → F3 setGroupSelection → 组级转半选
    const childTable = wrapper.findComponent(GroupedAssetChildTable)
    expect(childTable.exists()).toBe(true)
    childTable.vm.$emit('selection-change', [
      { recordcode: 'RC-ZC001', asset_code: 'ZC001' },
      { recordcode: 'RC-ZC002', asset_code: 'ZC002' },
    ])
    await flush()

    const box = summaryGroupCheckbox(wrapper, 0)
    expect(box.attributes('data-checked')).toBe('false')
    expect(box.attributes('data-indeterminate')).toBe('true')
  })

  it('用例12：asset_count=120 的组显示组内真分页器（el-pagination）', async () => {
    mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_MULTI, SUMMARY_LARGE]))
    mockGetGroupChildren.mockResolvedValue(paged([]))
    const wrapper = mountTable()
    await flush()
    await expandGroup(wrapper, SUMMARY_LARGE)
    // 真分页：分页器由子组件 .child-pager 承担（旧「加载更多」已移除）
    expect(wrapper.find('.child-pager .el-pagination').exists()).toBe(true)
  })

  it('用例12：组内分页器在 asset_count <= page_size（20）时不渲染', async () => {
    mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_MULTI]))
    mockGetGroupChildren.mockResolvedValue(paged([]))
    const wrapper = mountTable()
    await flush()
    await expandGroup(wrapper, SUMMARY_MULTI)
    expect(wrapper.find('.child-pager .el-pagination').exists()).toBe(false)
  })

  it('用例12（BF-073 回归）：asset_count=50 的组（21~100 档）显示分页器，后续数据可达', async () => {
    // 缺口实证：旧阈值 >100 下该组只显首页 20 条且无翻页入口，21~50 条不可达
    mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_MID]))
    mockGetGroupChildren.mockResolvedValue(
      paged(
        Array.from({ length: 20 }, (_, i) => makeDetail(`ZM${i}`)),
        50,
      ),
    )
    const wrapper = mountTable()
    await flush()
    await expandGroup(wrapper, SUMMARY_MID)
    expect(wrapper.find('.child-pager .el-pagination').exists()).toBe(true)
  })

  it('用例4：翻页走覆盖式分页（page-change → goToChildPage，page=2 请求）', async () => {
    const page1 = Array.from({ length: 20 }, (_, i) => makeDetail(`ZP${i}`))
    mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_LARGE]))
    mockGetGroupChildren.mockResolvedValue(paged(page1, 120))

    const wrapper = mountTable()
    await flush()
    await expandGroup(wrapper, SUMMARY_LARGE)

    // 子组件 emit page-change(2) → F3 调 goToChildPage(group_key, 2) → 请求 page=2（覆盖式）
    const childTable = wrapper.findComponent(GroupedAssetChildTable)
    expect(childTable.exists()).toBe(true)
    childTable.vm.$emit('page-change', 2)
    await flush()

    expect(mockGetGroupChildren).toHaveBeenLastCalledWith(
      expect.objectContaining({ group_key: KEY_LARGE, page: 2 }),
    )
  })

  it('用例14：group_key 内嵌 null 位（无合同 + 无规格 + 无品牌）不崩且能展开', async () => {
    mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_SENTINEL]))
    const wrapper = mountTable()
    await flush()
    await expandGroup(wrapper, SUMMARY_SENTINEL)
    expect(mockGetGroupChildren).toHaveBeenCalledWith(
      expect.objectContaining({ group_key: KEY_SENTINEL }),
    )
    expect(wrapper.text()).toContain('投影仪')
  })

  it('明细插槽透传：asset_current_status 插槽由 F3 转交给子表（白名单列）', async () => {
    // 9 列精简后白名单不含 physical_quantity（原透传用例失去对象，改为验证存留插槽）
    mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_MULTI]))
    const wrapper = mountTable()
    await flush()
    await expandGroup(wrapper, SUMMARY_MULTI)
    const childTable = wrapper.findComponent(GroupedAssetChildTable)
    expect(childTable.exists()).toBe(true)
    // F3 把 $slots 透传给子表，子表对 asset_current_status 列优先走插槽渲染
    expect(childTable.props('columns').map((c: TableColumn) => c.prop)).toContain(
      'asset_current_status',
    )
  })

  it('明细列集白名单过滤后传入子表，不在 F3 内重复定义（DR-1）', async () => {
    const wrapper = mountTable()
    await flush()
    await expandGroup(wrapper, SUMMARY_MULTI)
    const labels = wrapper.findAll('.el-table-column').map((c) => c.attributes('data-label'))
    // 白名单 6 项透传：唯一记录码/编码/名称在列
    expect(labels).toContain('唯一记录码')
    expect(labels).toContain('编码')
    expect(labels).toContain('名称')
    // 精简项不在子表列集：资产分类/实物数量被白名单剔除
    expect(labels).not.toContain('实物数量')
    // 子表自持结构列：序号/数量/操作
    expect(labels).toContain('序号')
    expect(labels).toContain('数量')
    expect(labels).toContain('操作')
  })
})

describe('GroupedAssetTable · 会话快照采集与水合（BF-078 需求3）', () => {
  it('用例17：captureSession 采集页码/展开态/子表页码/选中集/滚动位，不含筛选', async () => {
    const wrapper = mountTable()
    await flush()
    await expandGroup(wrapper, SUMMARY_MULTI)

    // 滚动位采集走根节点下 EP 滚动容器的 DOM scrollTop（jsdom 无布局，defineProperty 注入）
    const wrap = document.createElement('div')
    wrap.className = 'el-scrollbar__wrap'
    Object.defineProperty(wrap, 'scrollTop', { value: 123, configurable: true })
    wrapper.element.appendChild(wrap)

    const captured = (
      wrapper.vm as unknown as { captureSession: () => Record<string, unknown> }
    ).captureSession()
    expect(captured).toEqual({
      page: 1,
      expandedKeys: [KEY_MULTI],
      childPages: { [KEY_MULTI]: 1 },
      selectedCodes: [],
      scrollTop: 123,
    })
    expect('filters' in captured).toBe(false)
  })

  it('用例18：initialSnapshot 水合——search(存档筛选,页1) → changePage(存档页2) → 展开/子页/选中集回放', async () => {
    const wrapper = mount(GroupedAssetTable, {
      props: {
        detailColumns: DETAIL_COLUMNS,
        initialSnapshot: {
          filters: { asset_current_status: 'in_store' },
          page: 2,
          expandedKeys: [KEY_MULTI],
          childPages: { [KEY_MULTI]: 2 },
          selectedCodes: ['ZC001'],
          scrollTop: 0,
        },
      },
      global: globalMount,
    })
    await flush()

    expect(mockGetGroupedAssets).toHaveBeenCalledTimes(2)
    expect(mockGetGroupedAssets.mock.calls[0]?.[0]).toMatchObject({ page: 1 })
    const lastCall = mockGetGroupedAssets.mock.calls.at(-1)?.[0] as Record<string, unknown>
    expect(lastCall).toMatchObject({ asset_current_status: 'in_store', page: 2 })
    expect(wrapper.findAllComponents({ name: 'ElTable' })[0].props('expandRowKeys')).toEqual([
      KEY_MULTI,
    ])
    expect(mockGetGroupChildren.mock.calls.some(([params]) => params.page === 2)).toBe(true)
    const captured = (
      wrapper.vm as unknown as { captureSession: () => { page: number; selectedCodes: string[] } }
    ).captureSession()
    expect(captured.page).toBe(2)
    expect(captured.selectedCodes).toEqual(['ZC001'])
  })

  it('用例19：存档滚动位 > 0 时调用汇总表 setScrollTop 回放', async () => {
    mount(GroupedAssetTable, {
      props: {
        detailColumns: DETAIL_COLUMNS,
        initialSnapshot: {
          filters: {},
          page: 1,
          expandedKeys: [],
          childPages: {},
          selectedCodes: [],
          scrollTop: 123,
        },
      },
      global: globalMount,
    })
    await flush()

    expect(ElTableStub.methods.setScrollTop).toHaveBeenCalledWith(123)
  })
})
