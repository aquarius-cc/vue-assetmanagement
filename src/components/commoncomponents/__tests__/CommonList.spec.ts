import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import CommonList from '../CommonList.vue'
import type { TableColumn } from '@/types/list'

const CommonListColumnStub = {
  name: 'CommonListColumn',
  props: ['column', 'currentPage', 'pageSize'],
  template: `<div class="stub-column">
    <slot
      v-for="(_, name) in $slots"
      :key="name"
      :name="name"
      :row="{ id: 'row-1', code: 'C-001' }"
      :index="0"
    />
  </div>`,
}

const CommonListActionsStub = {
  name: 'CommonListActions',
  props: [
    'showActions',
    'actionColumnWidth',
    'enableSearch',
    'searchPlaceholder',
    'search',
    'enableEdit',
    'enableDelete',
    'showDetailButton',
    'detailRouteName',
    'detailQueryKey',
    'detailQueryParamName',
    'editRouteName',
  ],
  emits: ['update:search', 'search', 'edit', 'delete', 'detail'],
  template: '<div class="stub-actions"><slot name="actions" /></div>',
}

const ElTableStub = {
  name: 'ElTable',
  props: ['data', 'rowKey', 'loading'],
  emits: ['selection-change'],
  template: '<div class="el-table"><slot /></div>',
}

const ElTableColumnStub = {
  name: 'ElTableColumn',
  props: ['type', 'label', 'width', 'minWidth', 'align'],
  template: '<div class="el-table-column"><slot /></div>',
}

const ElPaginationStub = {
  name: 'ElPagination',
  props: ['currentPage', 'pageSize', 'pageSizes', 'total', 'layout'],
  emits: ['update:currentPage', 'update:pageSize', 'sizeChange', 'currentChange'],
  template: '<div class="el-pagination" />',
}

const global = {
  directives: { loading: {} },
  stubs: {
    CommonListColumn: CommonListColumnStub,
    CommonListActions: CommonListActionsStub,
    'el-table': ElTableStub,
    'el-table-column': ElTableColumnStub,
    'el-pagination': ElPaginationStub,
  },
}

const COLUMNS: TableColumn[] = [
  { prop: 'code', label: '编码' },
  { type: 'custom', prop: 'status', label: '状态', slotName: 'status' },
]

const DATA = [{ id: 1, code: 'C-001' }]

const mountList = (options: Record<string, unknown> = {}) =>
  mount(CommonList, {
    props: { data: DATA, columns: COLUMNS, ...(options.props as object) },
    slots: options.slots as never,
    global,
  })

describe('CommonList', () => {
  describe('prop defaults', () => {
    it('applies documented default values to pagination and toggles', () => {
      const wrapper = mountList()
      const pagination = wrapper.findComponent({ name: 'ElPagination' })

      expect(pagination.props('currentPage')).toBe(1)
      expect(pagination.props('pageSize')).toBe(20)
      expect(pagination.props('total')).toBe(0)
      expect(pagination.props('pageSizes')).toEqual([20, 50, 100, 200, 500])

      expect(wrapper.findComponent({ name: 'CommonListActions' }).props('showActions')).toBe(true)
      expect(wrapper.findComponent({ name: 'CommonListActions' }).props('enableSearch')).toBe(true)
      expect(wrapper.findComponent({ name: 'CommonListActions' }).props('searchPlaceholder')).toBe(
        '搜索',
      )
      expect(wrapper.findComponent({ name: 'CommonListColumn' }).props('pageSize')).toBe(20)
    })

    it('hides pagination when showPagination is false', () => {
      const wrapper = mountList({ props: { showPagination: false } })
      expect(wrapper.findComponent({ name: 'ElPagination' }).exists()).toBe(false)
    })

    it('renders selection column only when enableSelection is true', () => {
      const off = mountList()
      expect(off.findAllComponents({ name: 'ElTableColumn' })).toHaveLength(0)

      const on = mountList({ props: { enableSelection: true } })
      expect(on.findAllComponents({ name: 'ElTableColumn' })).toHaveLength(1)
    })
  })

  describe('pagination bridge', () => {
    it('re-emits sizeChange and currentChange from el-pagination', async () => {
      const wrapper = mountList()
      const pagination = wrapper.findComponent({ name: 'ElPagination' })

      pagination.vm.$emit('sizeChange', 50)
      pagination.vm.$emit('currentChange', 3)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('sizeChange')).toEqual([[50]])
      expect(wrapper.emitted('currentChange')).toEqual([[3]])
    })

    it('emits update:currentPage and update:pageSize from v-model bindings', async () => {
      const wrapper = mountList()
      const pagination = wrapper.findComponent({ name: 'ElPagination' })

      pagination.vm.$emit('update:currentPage', 4)
      pagination.vm.$emit('update:pageSize', 100)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:currentPage')).toEqual([[4]])
      expect(wrapper.emitted('update:pageSize')).toEqual([[100]])
    })
  })

  describe('action bridge', () => {
    it('re-emits selectionChange with the selected rows', async () => {
      const wrapper = mountList({ props: { enableSelection: true } })
      const rows = [{ id: 7 }]

      wrapper.findComponent({ name: 'ElTable' }).vm.$emit('selection-change', rows)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('selectionChange')).toEqual([[rows]])
    })

    it('re-emits edit, delete and detail with row and index', async () => {
      const wrapper = mountList()
      const actions = wrapper.findComponent({ name: 'CommonListActions' })
      const row = { id: 9 }

      actions.vm.$emit('edit', row, 2)
      actions.vm.$emit('delete', row, 2)
      actions.vm.$emit('detail', row, 2)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('edit')).toEqual([[row, 2]])
      expect(wrapper.emitted('delete')).toEqual([[row, 2]])
      expect(wrapper.emitted('detail')).toEqual([[row, 2]])
    })

    it('forwards search prop and re-emits search keyword updates', async () => {
      const wrapper = mountList({ props: { search: 'keyword' } })
      const actions = wrapper.findComponent({ name: 'CommonListActions' })

      expect(actions.props('search')).toBe('keyword')

      actions.vm.$emit('update:search', 'next')
      actions.vm.$emit('search', 'next')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:search')).toEqual([['next']])
      expect(wrapper.emitted('search')).toEqual([['next']])
    })
  })

  describe('getRowKey', () => {
    const resolveRowKey = (wrapper: ReturnType<typeof mountList>) =>
      wrapper.findComponent({ name: 'ElTable' }).props('rowKey') as (
        row: object,
      ) => string | number | undefined

    it('prefers the configured rowKey field', () => {
      const wrapper = mountList({ props: { rowKey: 'recordcode' } })
      expect(resolveRowKey(wrapper)({ recordcode: 'RC-1' })).toBe('RC-1')
    })

    it('falls back to known identifier fields when rowKey is absent', () => {
      const wrapper = mountList({ props: { rowKey: '' } })

      expect(resolveRowKey(wrapper)({ id: 11 })).toBe(11)
      expect(resolveRowKey(wrapper)({ code: 'C-2' })).toBe('C-2')
      expect(resolveRowKey(wrapper)({ asset_code: 'A-3' })).toBe('A-3')
      expect(resolveRowKey(wrapper)({ contract_code: 'K-4' })).toBe('K-4')
    })

    it('ignores null, undefined and non-scalar identifier values', () => {
      const wrapper = mountList({ props: { rowKey: '' } })

      expect(resolveRowKey(wrapper)({})).toBeUndefined()
      expect(resolveRowKey(wrapper)({ id: null, code: undefined })).toBeUndefined()
      expect(resolveRowKey(wrapper)({ id: { nested: true } })).toBeUndefined()
    })
  })

  describe('exposed methods', () => {
    const mountWithSpyStubs = (actionsSetup: () => object, tableSetup: () => object) => {
      const actionsStub = {
        name: 'CommonListActions',
        props: CommonListActionsStub.props,
        emits: CommonListActionsStub.emits,
        setup: actionsSetup,
        template: '<div class="stub-actions" />',
      }
      const tableStub = {
        name: 'ElTable',
        props: ElTableStub.props,
        emits: ElTableStub.emits,
        setup: tableSetup,
        template: '<div class="el-table"><slot /></div>',
      }
      return mount(CommonList, {
        props: { data: DATA, columns: COLUMNS },
        global: {
          ...global,
          stubs: { ...global.stubs, CommonListActions: actionsStub, 'el-table': tableStub },
        },
      })
    }

    it('delegates search and clearSearch to the actions child instance', () => {
      const search = vi.fn()
      const clearSearch = vi.fn()
      const wrapper = mountWithSpyStubs(
        () => ({ search, clearSearch }),
        () => ({ clearSelection: vi.fn() }),
      )
      const vm = wrapper.vm as unknown as Record<string, () => void>

      vm.search()
      vm.clearSearch()

      expect(search).toHaveBeenCalledTimes(1)
      expect(clearSearch).toHaveBeenCalledTimes(1)
    })

    it('delegates clearSelection to the table child instance', () => {
      const clearSelection = vi.fn()
      const wrapper = mountWithSpyStubs(
        () => ({ search: vi.fn(), clearSearch: vi.fn() }),
        () => ({ clearSelection }),
      )
      const vm = wrapper.vm as unknown as Record<string, () => void>

      vm.clearSelection()

      expect(clearSelection).toHaveBeenCalledTimes(1)
    })

    it('exposes search, clearSearch and clearSelection as callable API', () => {
      const wrapper = mountList()
      const vm = wrapper.vm as unknown as Record<string, unknown>

      expect(typeof vm.search).toBe('function')
      expect(typeof vm.clearSearch).toBe('function')
      expect(typeof vm.clearSelection).toBe('function')
    })
  })

  describe('slot forwarding', () => {
    it('renders parent-provided custom column slots', () => {
      const wrapper = mountList({
        slots: {
          status: '<span class="custom-status">{{ params.row.code }}</span>',
        },
      })

      expect(wrapper.find('.custom-status').exists()).toBe(true)
      expect(wrapper.find('.custom-status').text()).toBe('C-001')
    })
  })
})
