import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { ElForm, ElFormItem } from 'element-plus'
import SearchBar from '../SearchBar.vue'

const TEXT_FIELDS = [
  { key: 'name', label: '名称', type: 'text' as const },
  { key: 'code', label: '编码', type: 'text' as const },
]

const stubs = {
  'el-card': { template: '<div class="el-card"><slot /></div>' },
  'el-form': { template: '<form class="el-form"><slot /></form>' },
  'el-row': { template: '<div class="el-row"><slot /></div>' },
  'el-col': { template: '<div class="el-col"><slot /></div>' },
  'el-form-item': { template: '<div class="el-form-item"><slot /></div>' },
  'el-input': {
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue'],
  },
  'el-select': { template: '<select :value="modelValue"><slot /></select>', props: ['modelValue'] },
  'el-option': {
    template: '<option :value="value">{{ label }}</option>',
    props: ['label', 'value'],
  },
  'el-date-picker': { template: '<input type="date" />', props: ['modelValue'] },
  'el-button': {
    template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'link', 'size', 'loading', 'disabled'],
    emits: ['click'],
  },
  'el-icon': { template: '<span class="el-icon"><slot /></span>' },
  Search: { template: '<span />' },
  RefreshRight: { template: '<span />' },
}

describe('SearchBar', () => {
  it('renders all configured fields', () => {
    const wrapper = mount(SearchBar, { props: { fields: TEXT_FIELDS }, global: { stubs } })
    expect(wrapper.findAll('.el-form-item').length).toBeGreaterThanOrEqual(2)
  })

  it('emits search event with non-empty params', async () => {
    const wrapper = mount(SearchBar, { props: { fields: TEXT_FIELDS }, global: { stubs } })

    const nameInput = wrapper.findAll('input')[0]
    await nameInput.setValue('测试资产')
    await wrapper.findAll('.el-button')[0].trigger('click')

    expect(wrapper.emitted('search')).toBeTruthy()
    const emitted = wrapper.emitted('search')![0][0] as Record<string, string>
    expect(emitted.name).toBe('测试资产')
    expect(emitted.code).toBeUndefined()
  })

  it('emits reset event and clears form data', async () => {
    const wrapper = mount(SearchBar, { props: { fields: TEXT_FIELDS }, global: { stubs } })

    const nameInput = wrapper.findAll('input')[0]
    await nameInput.setValue('test')

    const resetBtn = wrapper.findAll('.el-button').find((b) => b.text().includes('重置'))
    expect(resetBtn).toBeTruthy()
    await resetBtn!.trigger('click')

    expect(wrapper.emitted('reset')).toBeTruthy()
  })

  it('hides reset button when showReset is false', () => {
    const wrapper = mount(SearchBar, {
      props: { fields: TEXT_FIELDS, showReset: false },
      global: { stubs },
    })
    const resetBtn = wrapper.findAll('.el-button').find((b) => b.text().includes('重置'))
    expect(resetBtn).toBeUndefined()
  })

  it('uses custom search button text', () => {
    const wrapper = mount(SearchBar, {
      props: { fields: TEXT_FIELDS, searchButtonText: '查询' },
      global: { stubs },
    })
    expect(wrapper.text()).toContain('查询')
  })

  it('exposes getSearchParams and reset via defineExpose', () => {
    const wrapper = mount(SearchBar, { props: { fields: TEXT_FIELDS }, global: { stubs } })
    expect(typeof (wrapper.vm as any).getSearchParams).toBe('function')
    expect(typeof (wrapper.vm as any).reset).toBe('function')
  })

  // ===== AC-67j 补强：回填 + 防冲刷 =====
  const FIELDS_WITH_DEFAULT = [
    { key: 'name', label: '名称', type: 'text' as const },
    { key: 'brand', label: '品牌', type: 'text' as const, defaultValue: '联想' },
  ]

  const inputValueAt = (wrapper: ReturnType<typeof mount>, index: number): string =>
    (wrapper.findAll('input')[index].element as HTMLInputElement).value

  it('回填值可读，未回填字段回落 defaultValue（覆盖 ?? 分支）', () => {
    const wrapper = mount(SearchBar, {
      props: { fields: FIELDS_WITH_DEFAULT, initialValues: { name: '显示器' } },
      global: { stubs },
    })
    expect(inputValueAt(wrapper, 0)).toBe('显示器')
    expect(inputValueAt(wrapper, 1)).toBe('联想')
    // collectSearchParams 收集所有非空字段，含默认值字段
    expect((wrapper.vm as any).getSearchParams()).toEqual({ name: '显示器', brand: '联想' })
  })

  it('fields 换新数组后回填值不丢（坑 2 屏障）', async () => {
    const wrapper = mount(SearchBar, {
      props: { fields: TEXT_FIELDS, initialValues: { name: '显示器' } },
      global: { stubs },
    })
    await wrapper.setProps({ fields: [...TEXT_FIELDS] })
    expect(inputValueAt(wrapper, 0)).toBe('显示器')
  })

  it('用户手输值不被 fields 变化冲掉', async () => {
    const wrapper = mount(SearchBar, { props: { fields: TEXT_FIELDS }, global: { stubs } })
    await wrapper.findAll('input')[0].setValue('用户手输')
    await wrapper.setProps({ fields: [...TEXT_FIELDS] })
    expect(inputValueAt(wrapper, 0)).toBe('用户手输')
  })

  it('reset 后新增字段回落默认值，不复活快照值', async () => {
    const wrapper = mount(SearchBar, {
      props: {
        fields: TEXT_FIELDS,
        initialValues: { name: '显示器', extra: '快照值' },
      },
      global: { stubs },
    })
    await wrapper
      .findAll('.el-button')
      .find((b) => b.text().includes('重置'))!
      .trigger('click')
    await wrapper.setProps({
      fields: [...TEXT_FIELDS, { key: 'extra', label: '扩展', type: 'text' as const }],
    })
    expect(inputValueAt(wrapper, 2)).toBe('')
  })

  it('hydrated 守卫：initialValues 换新对象身份不冲掉用户手输', async () => {
    const wrapper = mount(SearchBar, {
      props: { fields: TEXT_FIELDS, initialValues: { name: '显示器' } },
      global: { stubs },
    })
    await wrapper.findAll('input')[0].setValue('用户手输')
    await wrapper.setProps({ initialValues: { name: '显示器' } })
    expect(inputValueAt(wrapper, 0)).toBe('用户手输')
  })

  it('fields 后增字段时快照值不丢（fillMissingFields 读 pendingInitialValues）', async () => {
    const wrapper = mount(SearchBar, {
      props: {
        fields: TEXT_FIELDS,
        initialValues: { name: '显示器', extra: '快照值' },
      },
      global: { stubs },
    })
    await wrapper.setProps({
      fields: [...TEXT_FIELDS, { key: 'extra', label: '扩展', type: 'text' as const }],
    })
    expect(inputValueAt(wrapper, 2)).toBe('快照值')
  })

  it('CT-4：回填后再次点搜索，参数等于快照筛选而非空对象', async () => {
    const wrapper = mount(SearchBar, {
      props: { fields: TEXT_FIELDS, initialValues: { name: '显示器' } },
      global: { stubs },
    })
    await wrapper.findAll('.el-button')[0].trigger('click')
    expect(wrapper.emitted('search')![0][0]).toEqual({ name: '显示器' })
  })

  it('select 字段回填：getSearchParams 含回填的选项值', () => {
    const selectFields = [
      {
        key: 'asset_current_status',
        label: '当前状态',
        type: 'select' as const,
        options: [
          { label: '在库', value: 'in_store' },
          { label: '使用中', value: 'in_use' },
        ],
      },
    ]
    const wrapper = mount(SearchBar, {
      props: {
        fields: selectFields,
        initialValues: { asset_current_status: 'in_use' },
      },
      global: { stubs },
    })
    expect((wrapper.vm as any).getSearchParams()).toEqual({ asset_current_status: 'in_use' })
  })

  // ===== CT-4 回归屏障：ElForm auto 标签宽度导致 unexpected width NaN =====
  // 根因：label-width="auto" 在隐藏容器挂载时 computedWidth=NaN，卸载触发 deregister。
  // 静态断言为主屏障（不依赖 DOM 实现），运行时断言为辅助（验证真实 EP 卸载链）。
  const AUTO_LABEL_WIDTH_RE = /label-width\s*=\s*(["'])(?:['"])?\s*auto\s*(?:['"])?\1/

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('CT-4 静态：SearchBar 源模板不得回退为 auto 标签宽度', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/commoncomponents/SearchBar.vue'),
      'utf-8',
    )
    expect(source).not.toMatch(AUTO_LABEL_WIDTH_RE)
  })

  it('CT-4 运行时：真实 ElForm/ElFormItem 卸载不产生 unexpected width 警告', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { 'el-form': _formStub, 'el-form-item': _itemStub, ...restStubs } = stubs
    const wrapper = mount(SearchBar, {
      props: { fields: TEXT_FIELDS },
      global: { components: { ElForm, ElFormItem }, stubs: restStubs },
    })
    wrapper.unmount()
    await nextTick()

    const unexpectedWidthCalls = warnSpy.mock.calls.filter((args) =>
      String(args[0]?.message ?? args[0]).includes('unexpected width'),
    )
    expect(unexpectedWidthCalls).toHaveLength(0)
  })
})
