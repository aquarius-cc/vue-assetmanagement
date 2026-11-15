/** [批次4 S9①] DashboardWelcomeBar 挂载覆盖：欢迎栏渲染 + 登出事件 */
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, afterEach } from 'vitest'

import DashboardWelcomeBar from '../DashboardWelcomeBar.vue'

describe('DashboardWelcomeBar', () => {
  it('渲染问候与当前时间', () => {
    const wrapper = mount(DashboardWelcomeBar, {
      props: {
        authInfo: { real_name: '张三', auth_name: 'zhangsan' },
        loginDuration: '1 小时',
        currentTime: '08:00',
        currentDate: '2026-11-10 星期二',
      },
      shallow: true,
    })
    expect(wrapper.html()).toContain('张三')
  })

  it('可触发 logout 事件', () => {
    const wrapper = mount(DashboardWelcomeBar, {
      props: {
        authInfo: { real_name: '张三', auth_name: 'zhangsan' },
        loginDuration: '1 小时',
        currentTime: '08:00',
        currentDate: '2026-11-10 星期二',
      },
      shallow: true,
    })
    wrapper.vm.$emit('logout')
    expect(wrapper.emitted('logout')).toBeTruthy()
  })
})

// [M-21 门禁固化] 组件 :52 的 greeting computed 读真实墙钟 new Date().getHours()，
// 原两用例不钉时钟时本文件覆盖分支随运行时刻漂移（2026-11-14 同树双跑直证：
// src/**/*.vue 聚合 lines 43.66/43.67、branches 27.76/27.78，唯一漂移文件 = 本组件），
// 薄余量棘轮（C8 取整余量 0.01/0.00pt）因此随机破线。此处钉时钟确定性覆盖
// 5 个时段分支，并补问候语断言缺口；覆盖率只升不降，棘轮值不动。
describe('greeting 时段分支（确定性钉时钟）', () => {
  const baseProps = {
    authInfo: { real_name: '张三', auth_name: 'zhangsan' },
    loginDuration: '1 小时',
    currentTime: '08:00',
    currentDate: '2026-11-10 星期二',
  }

  afterEach(() => {
    vi.useRealTimers()
  })

  const slots: Array<[number, string]> = [
    [3, '夜深了'],
    [9, '早上好'],
    [13, '中午好'],
    [16, '下午好'],
    [21, '晚上好'],
  ]

  for (const [hour, expected] of slots) {
    it(`hour=${hour} → ${expected}`, () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 10, 10, hour, 30, 0))
      const wrapper = mount(DashboardWelcomeBar, {
        props: baseProps,
        shallow: true,
      })
      expect(wrapper.text()).toContain(expected)
    })
  }
})
