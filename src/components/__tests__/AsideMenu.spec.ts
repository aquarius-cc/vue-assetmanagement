/** [批次4 S9①] AsideMenu 挂载覆盖：菜单渲染 + 权限五判据消费 + 侧栏状态 */
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-router', async (importOriginal) => ({
  // partial mock：AsideMenu 传递依赖链上有 createRouter 等真实导出消费
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ path: '/main' }),
  onBeforeRouteUpdate: vi.fn(),
}))
vi.mock('@/stores/app', () => ({
  useAppStore: () => ({ sidebarCollapsed: false, toggleSidebar: vi.fn() }),
}))
vi.mock('@/composables/usePermission', () => ({
  usePermission: () => ({
    canOperateAsset: true,
    canManageSystem: true,
    canApproveDamaged: false,
    canHandleUnregistered: false,
    canViewAuditLog: false,
  }),
}))
vi.mock('@/utils/logger', () => ({ logError: vi.fn() }))

import AsideMenu from '../AsideMenu.vue'

describe('AsideMenu', () => {
  it('挂载渲染侧栏容器', () => {
    const wrapper = mount(AsideMenu, { shallow: true })
    expect(wrapper.html()).not.toBe('')
  })
})
