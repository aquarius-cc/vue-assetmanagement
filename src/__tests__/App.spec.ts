/** [批次4 S9①] App.vue 挂载覆盖（零测试资产补测）：根路由视图渲染 + 暗色模式初始化 */
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/composables/useDarkMode', () => ({ useDarkMode: vi.fn() }))

import { useDarkMode } from '@/composables/useDarkMode'
import App from '../App.vue'

describe('App', () => {
  it('挂载即初始化暗色模式并渲染路由视图', () => {
    const wrapper = mount(App, { shallow: true })
    expect(useDarkMode).toHaveBeenCalled()
    expect(wrapper.html()).toContain('router-view')
  })
})
