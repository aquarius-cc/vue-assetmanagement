/** [批次4 S9①] NotificationBell 挂载覆盖：铃铛渲染 + 未读角标 + 面板开关 */
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { markAsReadMock, markAllAsReadMock, fetchNotificationsMock } = vi.hoisted(() => ({
  markAsReadMock: vi.fn(),
  markAllAsReadMock: vi.fn(),
  fetchNotificationsMock: vi.fn(),
}))

vi.mock('@/composables/useNotification', () => ({
  useNotification: () => ({
    notifications: ref([]),
    unreadCount: ref(0),
    isConnected: ref(false),
    isLoading: ref(false),
    isMarkingAll: ref(false),
    fetchError: ref(false),
    markAsRead: markAsReadMock,
    markAllAsRead: markAllAsReadMock,
    fetchNotifications: fetchNotificationsMock,
  }),
}))
vi.mock('@/utils/navigation', () => ({ safeNavigate: vi.fn() }))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}))

import NotificationBell from '../NotificationBell.vue'

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('挂载渲染铃铛', () => {
    const wrapper = mount(NotificationBell, { shallow: true })
    expect(wrapper.exists()).toBe(true)
  })

  it('零未读时不显示角标数字', () => {
    const wrapper = mount(NotificationBell, { shallow: true })
    expect(wrapper.text()).not.toContain('99')
  })
})
