import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusTag from '../StatusTag.vue'

describe('StatusTag', () => {
  const stubs = { 'el-tag': { template: '<span class="el-tag"><slot /></span>' } }

  it('renders correct label for known asset status', () => {
    const wrapper = mount(StatusTag, { props: { status: 'in_store' }, global: { stubs } })
    expect(wrapper.text()).toContain('在库')
  })

  it('renders tag element', () => {
    const wrapper = mount(StatusTag, { props: { status: 'in_use' }, global: { stubs } })
    expect(wrapper.find('.el-tag').exists()).toBe(true)
  })

  it('shows raw status value for unknown status', () => {
    const wrapper = mount(StatusTag, { props: { status: 'unknown_status' }, global: { stubs } })
    expect(wrapper.text()).toContain('unknown_status')
  })

  it('supports outasset mapType', () => {
    const wrapper = mount(StatusTag, {
      props: { status: 'pending', mapType: 'outasset' },
      global: { stubs },
    })
    expect(wrapper.text()).toBeTruthy()
  })

  it('supports custom map override', () => {
    const customMap = {
      active: { label: '自定义激活', type: 'success' },
    }
    const wrapper = mount(StatusTag, {
      props: { status: 'active', customMap },
      global: { stubs },
    })
    expect(wrapper.text()).toContain('自定义激活')
  })

  it('falls back to raw value for invalid custom map entry', () => {
    const customMap = {
      active: { label: '激活', type: 'success' },
    }
    const wrapper = mount(StatusTag, {
      props: { status: 'not_in_map', customMap },
      global: { stubs },
    })
    expect(wrapper.text()).toContain('not_in_map')
  })
})
