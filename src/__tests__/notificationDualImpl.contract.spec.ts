/**
 * @file [S12 契约快照] fetchNotifications 双实现的行为分叉
 * @module __tests__/notificationDualImpl.contract
 * @description
 *   ⚠️ 契约快照，S12 收敛时必须同步改写本 spec。
 *
 *   C-14（Rules_Fiels/Duplicate_Codes/complete-patterns.md，2026-11-09 S4 降级裁决）
 *   已裁定 store / composable 两份 fetchNotifications 保留：职责、容器、错误语义
 *   均不同，收敛另立 S12。本文件把「当前故意分叉」固化为可执行的回归屏障，
 *   防止任一实现被无意改写成分叉消失（或分叉扩大）而无人察觉。
 *
 *   本文件断言的是**经裁决的现状**，不是期望的终态：S12 执行收敛时这些断言
 *   会变红，属预期行为，须同步改写/删除，不得当作线上缺陷回滚。
 *
 *   分叉清单：
 *   ① 错误语义：store 异常外抛；composable catch 后走 notifyCallerError 单出口并置 fetchError。
 *   ② 分页契约：store 写 pagination.total（NotificationList → usePagedList 适配层依赖）；
 *      composable 返回值不含分页状态。
 *   ③ 容器：notifications / unreadCount / isLoading 实例级；fetchError / isMarkingAll 模块级共享。
 *   ④ WS 推送：共享连接单例分发，但各消费者 unshift 各自的实例级数组。
 *
 * @callers 仅测试运行器（Vitest）；生产代码不得引用。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { notificationAPI } from '@/api/notification'
import { useNotificationStore } from '@/stores/notificationStore'
import {
  resetSharedNotificationConnectionForTest,
  useNotification,
} from '@/composables/useNotification'

vi.mock('@/api/notification', () => ({
  notificationAPI: {
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn().mockResolvedValue({ count: 0 }),
    markRead: vi.fn().mockResolvedValue({}),
    markAllRead: vi.fn().mockResolvedValue({ marked_count: 0 }),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: { warning: vi.fn(), success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/utils/tokenObfuscator', () => ({
  decodeToken: vi.fn(() => JSON.stringify({ auth_username: 'EMP001' })),
}))

vi.mock('@/utils/tokenMemory', () => ({
  getInMemoryAccessToken: vi.fn(() => 'mem-token'),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ authInfo: { auth_username: 'EMP001' }, access_token: 'token-abc' }),
}))

/** [M-21] 共享连接单例的 WS 替身（范式同 useNotificationShared.spec.ts） */
class MockWebSocket {
  static instances: MockWebSocket[] = []
  static readonly OPEN = 1
  static readonly CLOSED = 3

  url = ''
  readyState = MockWebSocket.OPEN
  sent: string[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: ((event: { code: number }) => void) | null = null
  onerror: (() => void) | null = null

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED
  }

  static reset(): void {
    MockWebSocket.instances = []
  }

  static get last(): MockWebSocket {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1]
  }
}

vi.stubGlobal('WebSocket', MockWebSocket)

const getNotificationsMock = notificationAPI.getNotifications as ReturnType<typeof vi.fn>

const Consumer = defineComponent({
  setup() {
    return useNotification()
  },
  template: '<div />',
})

interface ConsumerVm {
  notifications: { id: number }[]
  unreadCount: number
}

function consumerVm(wrapper: ReturnType<typeof mount>): ConsumerVm {
  return wrapper.vm as unknown as ConsumerVm
}

describe('[S12] fetchNotifications 双实现行为分叉（契约快照）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    MockWebSocket.reset()
    resetSharedNotificationConnectionForTest()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    resetSharedNotificationConnectionForTest()
  })

  it('① 错误语义：store 异常外抛，composable catch 单出口仅置 fetchError', async () => {
    const boom = new Error('boom')
    getNotificationsMock.mockRejectedValue(boom)

    const store = useNotificationStore()
    await expect(store.fetchNotifications()).rejects.toThrow('boom')

    const { fetchNotifications, fetchError } = useNotification()
    await expect(fetchNotifications()).resolves.toBeUndefined()
    expect(fetchError.value).toBe(true)
  })

  it('② 分页契约：store 写 pagination.total，composable 返回值不含分页状态', async () => {
    getNotificationsMock.mockResolvedValue({
      count: 7,
      total_pages: 1,
      page: 1,
      page_size: 20,
      results: [{ id: 1 }],
    })

    const store = useNotificationStore()
    await store.fetchNotifications()
    // NotificationList → usePagedList 适配层以此字段驱动 total（S10/M-14）
    expect(store.pagination.total).toBe(7)
    expect(store.notifications).toEqual([{ id: 1 }])

    const composable = useNotification()
    expect(composable).not.toHaveProperty('pagination')
    await composable.fetchNotifications()
    expect(composable.notifications.value).toEqual([{ id: 1 }])
    // 收敛为单源时若把 pagination 从 store 移除，此处即失效，须同步改写本 spec
    expect(store.pagination.total).toBe(7)
  })

  it('③ 容器：数据态实例级，错误态模块级共享', () => {
    const a = useNotification()
    const b = useNotification()

    expect(a.notifications.value).toEqual([])
    expect(b.unreadCount.value).toBe(0)
    a.notifications.value.push({ id: 9 } as never)
    expect(b.notifications.value).toEqual([])

    // [M-32] fetchError 是当前模块级 ref，非实例级；收敛为 Pinia 单例时须重新确认
    expect(a.fetchError).toBe(b.fetchError)
  })

  it('④ WS 推送：共享连接分发，但各消费者 unshift 各自的实例级数组', async () => {
    const a = mount(Consumer)
    const b = mount(Consumer)
    await Promise.resolve()

    const ws = MockWebSocket.last
    ws.onopen?.()
    ws.onmessage?.({
      data: JSON.stringify({ type: 'notification', data: { id: 1, is_read: false } }),
    })

    const aVm = consumerVm(a)
    const bVm = consumerVm(b)
    expect(aVm.notifications).toHaveLength(1)
    expect(bVm.notifications).toHaveLength(1)
    expect(aVm.unreadCount).toBe(1)
    expect(bVm.unreadCount).toBe(1)
    expect(aVm.notifications).not.toBe(bVm.notifications)

    a.unmount()
    b.unmount()
  })
})
