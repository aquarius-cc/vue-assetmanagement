import { defineComponent, KeepAlive, nextTick, type ComponentPublicInstance } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// [M-10] 捕获 onBeforeRouteLeave 注册的回调，手动触发以模拟用户导航
const { leaveGuards } = vi.hoisted(() => ({ leaveGuards: [] as Array<() => void> }))
vi.mock('vue-router', () => ({
  onBeforeRouteLeave: (cb: () => void) => {
    leaveGuards.push(cb)
  },
}))

import { useDelayedRoute } from '../useDelayedRoute'

type DelayedRouteApi = {
  schedule: (navigate: () => void, delay: number) => void
  cancel: () => void
}

const apiOf = (wrapper: VueWrapper<ComponentPublicInstance>): DelayedRouteApi =>
  wrapper.vm as unknown as DelayedRouteApi

const Host = defineComponent({
  name: 'DelayedRouteHost',
  setup() {
    return useDelayedRoute()
  },
  template: '<div />',
})

const KeepAliveHost = defineComponent({
  components: { Host, KeepAlive },
  props: { show: { type: Boolean, default: true } },
  template: '<KeepAlive><Host v-if="show" /></KeepAlive>',
})

describe('useDelayedRoute（M-10）', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    leaveGuards.length = 0
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('未离场：到时执行一次跳转，路径不变', () => {
    const navigate = vi.fn()
    const wrapper = mount(Host)
    apiOf(wrapper).schedule(() => navigate('/main/departmentmanagement'), 2000)

    vi.advanceTimersByTime(1999)
    expect(navigate).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledWith('/main/departmentmanagement')
    wrapper.unmount()
  })

  it('组件卸载后推进时钟：不执行跳转', () => {
    const navigate = vi.fn()
    const wrapper = mount(Host)
    apiOf(wrapper).schedule(navigate, 2000)

    wrapper.unmount()
    vi.advanceTimersByTime(2000)

    expect(navigate).not.toHaveBeenCalled()
  })

  it('路由离开（onBeforeRouteLeave）：不执行跳转', () => {
    const navigate = vi.fn()
    const wrapper = mount(Host)
    apiOf(wrapper).schedule(navigate, 2000)

    expect(leaveGuards).toHaveLength(1)
    leaveGuards.forEach((guard) => guard())
    vi.advanceTimersByTime(2000)

    expect(navigate).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('父页 keepAlive 失活（onDeactivated）：子树未卸载也不执行跳转', async () => {
    const navigate = vi.fn()
    const wrapper = mount(KeepAliveHost, { props: { show: true } })
    const host = wrapper.findComponent(Host)
    apiOf(host).schedule(navigate, 2000)

    await wrapper.setProps({ show: false })
    await nextTick()
    vi.advanceTimersByTime(2000)

    expect(navigate).not.toHaveBeenCalled()
  })

  it('重复 schedule：只执行最后一次，不叠加', () => {
    const first = vi.fn()
    const second = vi.fn()
    const wrapper = mount(Host)
    apiOf(wrapper).schedule(first, 2000)
    apiOf(wrapper).schedule(second, 2000)

    vi.advanceTimersByTime(2000)

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
