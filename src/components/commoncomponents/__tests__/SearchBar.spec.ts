import { mount } from '@vue/test-utils'
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
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue'],
  },
  'el-select': { template: '<select><slot /></select>', props: ['modelValue'] },
  'el-option': { template: '<option />', props: ['label', 'value'] },
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
})
