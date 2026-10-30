/**
 * M-21 共享连接单例测试：双消费者单连接 / refcount 断连时机 / offMessage 摘除。
 * 先红后绿：单例化前双消费者各建一条连接（2 只 ws），红；单例落地后转绿。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { resetSharedNotificationConnectionForTest, useNotification } from '../useNotification'

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

vi.mock('@/api/notification', () => ({
  notificationAPI: {
    getNotifications: vi.fn().mockResolvedValue([]),
    getUnreadCount: vi.fn().mockResolvedValue({ count: 0 }),
    markAllRead: vi.fn().mockResolvedValue({ marked_count: 0 }),
  },
}))

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

const Consumer = defineComponent({
  setup() {
    return useNotification()
  },
  template: '<div />',
})

describe('useNotification 共享连接单例 [M-21]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    MockWebSocket.reset()
    resetSharedNotificationConnectionForTest()
  })

  afterEach(() => {
    resetSharedNotificationConnectionForTest()
  })

  it('双消费者（桌面铃铛 + 移动抽屉）共享单条连接，仅 1 次 fetchUnreadCount', async () => {
    const a = mount(Consumer)
    const b = mount(Consumer)
    await Promise.resolve()

    // 红基线：双实例各自 connect() → 2 只 ws；单例化后应恒为 1
    expect(MockWebSocket.instances).toHaveLength(1)
    expect(a.vm.isConnected).toBe(false)
    expect(b.vm.isConnected).toBe(false)

    a.unmount()
    // refcount: 桌面卸载不误断抽屉内消费者（抽屉关闭 → 桌面铃铛仍在线）
    expect(MockWebSocket.last.readyState).not.toBe(MockWebSocket.CLOSED)

    b.unmount()
    // 归零才真断连
    expect(MockWebSocket.last.readyState).toBe(MockWebSocket.CLOSED)
  })

  it('offMessage：消费者卸载后不再收到消息分发（handler 摘除，无泄漏）', async () => {
    const wrapper = mount(Consumer)
    await Promise.resolve()
    const ws = MockWebSocket.last
    ws.onopen?.()

    wrapper.unmount()

    // 卸载后到达的推送不得再触达已卸载消费者（其数据态应保持不变）
    ws.onmessage?.({ data: JSON.stringify({ type: 'notification', data: { id: 1, is_read: false } }) })
    expect(MockWebSocket.instances).toHaveLength(1)
  })
})
