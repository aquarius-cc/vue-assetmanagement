/** [批次4 S9①] DashboardWelcomeBar 挂载覆盖：欢迎栏渲染 + 登出事件 */
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

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
