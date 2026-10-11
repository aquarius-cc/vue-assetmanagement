/**
 * CommonList 列固定极窄降级（BF-083 需求2b）
 *
 * 阈值 = 勾选55 + 左固定Σ声明宽(80+150+180) + 操作宽估算180 + 最小非固定列宽110 = 755。
 * fixture 镜像 AssetContentDetails 平铺列配置（出处锚），spec 钉死 754 解固定 /
 * 755 保持两态；列宽调整会使断言漂移，改列宽须同步本 fixture。
 */
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CommonList from '../CommonList.vue'
import type { TableColumn } from '@/types/list'

const ElTableStub = {
  name: 'ElTable',
  props: ['data', 'rowKey', 'loading', 'height', 'fit', 'border', 'headerCellStyle', 'cellStyle'],
  template: '<div class="el-table"><slot /></div>',
}

const ElTableColumnStub = {
  name: 'ElTableColumn',
  props: ['type', 'prop', 'label', 'width', 'minWidth', 'align', 'fixed', 'reserveSelection'],
  template: '<div class="el-table-column"><slot /></div>',
}

const globalMount = {
  directives: { loading: {} },
  stubs: {
    'el-table': ElTableStub,
    'el-table-column': ElTableColumnStub,
    'el-pagination': { name: 'ElPagination', template: '<div class="el-pagination" />' },
    'el-input': { name: 'ElInput', template: '<input />' },
    'el-button': { name: 'ElButton', template: '<button><slot /></button>' },
  },
  mocks: { $router: { push: vi.fn() } },
}

const FIXTURE_COLUMNS: TableColumn[] = [
  { type: 'index', label: '序号', width: 80, align: 'center', fixed: 'left' },
  { prop: 'recordcode', label: '唯一记录码', width: 150, align: 'center', fixed: 'left' },
  { prop: 'asset_code', label: '编码', width: 180, align: 'center', fixed: 'left' },
  { prop: 'asset_name', label: '名称', width: 180, align: 'left' },
  { prop: 'physical_quantity', label: '实物数量', width: 110, align: 'center' },
]

const DATA = [{ id: 1, recordcode: 'RC-1', asset_code: 'ZC001', asset_name: '笔记本' }]

const mountList = () =>
  mount(CommonList, {
    props: { data: DATA, columns: FIXTURE_COLUMNS, enableSelection: true },
    global: globalMount,
  })

let resizeCallback: ResizeObserverCallback | null = null

class FakeResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe('CommonList · 列固定极窄降级（BF-083 需求2b）', () => {
  beforeEach(() => {
    resizeCallback = null
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const emitWidth = async (wrapper: ReturnType<typeof mountList>, width: number): Promise<void> => {
    expect(resizeCallback, 'ResizeObserver 应在挂载时被构造并注册回调').not.toBeNull()
    resizeCallback?.(
      [{ contentRect: { width } } as unknown as ResizeObserverEntry],
      {} as ResizeObserver,
    )
    await wrapper.vm.$nextTick()
  }

  const columnByKey = (wrapper: ReturnType<typeof mountList>) => {
    const map = new Map<string, ReturnType<typeof wrapper.findAllComponents>[number]>()
    for (const col of wrapper.findAllComponents({ name: 'ElTableColumn' })) {
      const prop = col.props('prop') as string | undefined
      const label = col.props('label') as string | undefined
      const type = col.props('type') as string | undefined
      map.set(prop ?? label ?? type ?? '', col)
    }
    return map
  }

  it('常态（未触发降级）：勾选/序号/记录码/编码 fixed=left，操作 fixed=right，中间列不固定', async () => {
    const wrapper = mountList()
    await wrapper.vm.$nextTick()
    const cols = columnByKey(wrapper)

    expect(cols.get('selection')?.props('fixed')).toBe('left')
    expect(cols.get('序号')?.props('fixed')).toBe('left')
    expect(cols.get('recordcode')?.props('fixed')).toBe('left')
    expect(cols.get('asset_code')?.props('fixed')).toBe('left')
    expect(cols.get('操作')?.props('fixed')).toBe('right')
    expect(cols.get('asset_name')?.props('fixed')).toBeUndefined()
    expect(cols.get('physical_quantity')?.props('fixed')).toBeUndefined()
  })

  it('极窄 754px（< 755 阈值）：全列含勾选/操作一并解除固定——整表滑动', async () => {
    const wrapper = mountList()
    await emitWidth(wrapper, 754)
    const cols = columnByKey(wrapper)

    expect(cols.get('selection')?.props('fixed')).toBeUndefined()
    expect(cols.get('序号')?.props('fixed')).toBeUndefined()
    expect(cols.get('recordcode')?.props('fixed')).toBeUndefined()
    expect(cols.get('asset_code')?.props('fixed')).toBeUndefined()
    expect(cols.get('操作')?.props('fixed')).toBeUndefined()
  })

  it('边界 755px（= 阈值，最小中间列保底可见）：保持常态固定', async () => {
    const wrapper = mountList()
    await emitWidth(wrapper, 755)
    const cols = columnByKey(wrapper)

    expect(cols.get('selection')?.props('fixed')).toBe('left')
    expect(cols.get('recordcode')?.props('fixed')).toBe('left')
    expect(cols.get('asset_code')?.props('fixed')).toBe('left')
    expect(cols.get('操作')?.props('fixed')).toBe('right')
  })
})
