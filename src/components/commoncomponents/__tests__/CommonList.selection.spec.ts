/**
 * CommonList 受控选择契约：src/components/commoncomponents/__tests__/CommonList.selection.spec.ts
 *
 * F3 分组三态反向驱动明细勾选依赖本次新增的 `selectedKeys` 受控模式，故须精确断言：
 *  1. 受控模式：按 selectedKeys 调用 `toggleRowSelection(row, shouldSelect, true)`（ignoreSelectable 恒 true）
 *  2. 非受控：不传 selectedKeys 时不触碰 el-table 选中 API，行为与既有调用方一致（回归）
 *  3. 同步期抑制 selection-change 回抛（否则 → F2 setGroupSelection → selectedCodes → 回环）
 *  4. 用户主动勾选仍正常 emit selection-change（反向链路不能被误伤）
 *  5. rowKey 走既有 getRowKey 回退链，asset_code 可作键
 *  6. selectedKeys 变化后新挂载的行同步勾选
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import CommonList from '../CommonList.vue'
import type { TableColumn } from '@/types/list'

type Row = Record<string, unknown>

const resolveRowKey = (row: Row, rowKey: unknown): string => {
  if (typeof rowKey === 'function') return String((rowKey as (r: Row) => string)(row))
  return String(row[String(rowKey)] ?? '')
}

const ElTableStub = {
  name: 'ElTable',
  props: ['data', 'rowKey', 'loading'],
  emits: ['selection-change'],
  provide(this: { data: Row[]; rowKey: unknown }) {
    return { __rows: this.data ?? [] }
  },
  data() {
    return { __sel: [] as Row[] }
  },
  methods: {
    /**
     * 复刻 EP 2.13.7 真实行为：**置位/取消置位都会同步触发 selection-change**。
     * CommonList 的 isSyncingSelection 守卫正是为拦截这条回抛而存在，
     * 若桩不同步 emit，守卫就永远测不到（测「绿」但没测到东西）。
     */
    toggleRowSelection(row: Row, selected: boolean) {
      this.__sel = selected
        ? [...this.__sel.filter((r) => r !== row), row]
        : this.__sel.filter((r) => r !== row)
      this.$emit('selection-change', this.__sel)
    },
    clearSelection() {
      this.__sel = []
      this.$emit('selection-change', this.__sel)
    },
  },
  template: '<div class="el-table"><slot /></div>',
}

const ElTableColumnStub = {
  name: 'ElTableColumn',
  props: ['type', 'label', 'prop', 'slotName', 'fixed'],
  template: '<div class="el-table-column"><slot /></div>',
}

const globalMount = {
  directives: { loading: {} },
  stubs: {
    CommonListColumn: { name: 'CommonListColumn', props: ['column'], template: '<div />' },
    CommonListActions: { name: 'CommonListActions', props: ['showActions'], template: '<div />' },
    'el-table': ElTableStub,
    'el-table-column': ElTableColumnStub,
    'el-pagination': { template: '<div />' },
    'el-input': { template: '<input />' },
    'el-button': { template: '<button><slot /></button>' },
  },
}

const COLUMNS: TableColumn[] = [{ prop: 'asset_code', label: '编码', width: 120 }]

const ROWS = [
  { recordcode: 'RC-1', asset_code: 'ZC001' },
  { recordcode: 'RC-2', asset_code: 'ZC002' },
  { recordcode: 'RC-3', asset_code: 'ZC003' },
]

const tableOf = (wrapper: ReturnType<typeof mount>) => wrapper.findComponent({ name: 'ElTable' })
const flush = async () => {
  await new Promise((r) => setTimeout(r, 0))
}

const mountList = (selectedKeys?: string[]) =>
  mount(CommonList, {
    props: {
      data: ROWS,
      columns: COLUMNS,
      rowKey: 'asset_code',
      enableSelection: true,
      ...(selectedKeys === undefined ? {} : { selectedKeys }),
    },
    global: globalMount,
  })

describe('CommonList · 受控选择模式（selectedKeys）', () => {
  it('用例1：受控模式按 selectedKeys 逐行调用 toggleRowSelection，ignoreSelectable 恒 true', async () => {
    const wrapper = mountList([])
    // 先让 onMounted 的首屏同步跑完，避免与后续变更的同步混在一起计数
    await flush()
    const toggle = vi.fn()
    tableOf(wrapper).vm.toggleRowSelection = toggle

    await wrapper.setProps({ selectedKeys: ['ZC001', 'ZC003'] })
    await flush()

    expect(toggle).toHaveBeenCalledTimes(3)
    const byCode = new Map(
      toggle.mock.calls.map((call) => [resolveRowKey(call[0] as Row, 'asset_code'), call[1]]),
    )
    expect(byCode.get('ZC001')).toBe(true)
    expect(byCode.get('ZC002')).toBe(false)
    expect(byCode.get('ZC003')).toBe(true)
    toggle.mock.calls.forEach((call) => expect(call[2]).toBe(true))
  })

  it('用例1：selectedKeys 清空后所有行被置为未选中', async () => {
    const wrapper = mountList(['ZC001'])
    await flush()
    const toggle = vi.fn()
    tableOf(wrapper).vm.toggleRowSelection = toggle

    await wrapper.setProps({ selectedKeys: [] })
    await flush()

    expect(toggle).toHaveBeenCalledTimes(3)
    toggle.mock.calls.forEach((call) => expect(call[1]).toBe(false))
  })

  it('用例1b：首屏即带 selectedKeys 挂载时勾选态生效（onMounted 兜底，非 immediate）', async () => {
    const toggle = vi.fn()
    const wrapper = mount(CommonList, {
      props: {
        data: ROWS,
        columns: COLUMNS,
        rowKey: 'asset_code',
        enableSelection: true,
        selectedKeys: ['ZC002'],
      },
      global: globalMount,
    })
    tableOf(wrapper).vm.toggleRowSelection = toggle
    await flush()
    expect(toggle).toHaveBeenCalledTimes(3)
    const checked = toggle.mock.calls.filter((call) => call[1] === true)
    expect(checked).toHaveLength(1)
    expect(resolveRowKey(checked[0][0] as Row, 'asset_code')).toBe('ZC002')
  })

  it('用例1：数据后续追加时，新行同样按 selectedKeys 同步', async () => {
    const wrapper = mountList(['ZC004'])
    await flush()
    const toggle = vi.fn()
    tableOf(wrapper).vm.toggleRowSelection = toggle

    await wrapper.setProps({
      data: [...ROWS, { recordcode: 'RC-4', asset_code: 'ZC004' }],
    })
    await flush()

    const lastCall = toggle.mock.calls[toggle.mock.calls.length - 1]
    expect(resolveRowKey(lastCall[0] as Row, 'asset_code')).toBe('ZC004')
    expect(lastCall[1]).toBe(true)
  })

  it('用例2：非受控模式（不传 selectedKeys）完全不触碰 el-table 选中 API', async () => {
    const toggle = vi.fn()
    const wrapper = mountList(undefined)
    tableOf(wrapper).vm.toggleRowSelection = toggle
    await wrapper.setProps({ data: [...ROWS, { recordcode: 'RC-4', asset_code: 'ZC004' }] })
    await flush()
    expect(toggle).not.toHaveBeenCalled()
  })

  it('用例3：同步窗口内抑制 selection-change 回抛（避免与上层形成回环）', async () => {
    const wrapper = mountList(['ZC001', 'ZC002'])
    await flush()
    // 桩每次 toggleRowSelection 都同步 emit selection-change（复刻 EP），
    // 若无 isSyncingSelection 守卫，此处应冒泡出一批 selectionChange；有了守卫则应为空。
    expect(wrapper.emitted('selectionChange')).toBeUndefined()
  })

  it('用例3b：同步结束后守卫释放，用户主动勾选可正常冒泡', async () => {
    const wrapper = mountList(['ZC001'])
    await flush()
    tableOf(wrapper).vm.$emit('selection-change', [ROWS[0]])
    expect(wrapper.emitted('selectionChange')).toBeTruthy()
  })

  it('用例4：用户主动勾选仍正常 emit selection-change（反向链路不被误伤）', async () => {
    const wrapper = mountList([])
    await flush()
    tableOf(wrapper).vm.$emit('selection-change', [ROWS[0], ROWS[1]])
    await flush()
    expect(wrapper.emitted('selectionChange')).toBeTruthy()
    expect(wrapper.emitted('selectionChange')![0][0]).toHaveLength(2)
  })
})
