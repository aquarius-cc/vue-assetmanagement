/**
 * @file useNotificationConnection 生命周期测试 [BF-095/I-9]
 * 覆盖: ① 主动断开后 onclose 不复活 ② connect 入口关旧连接
 *       ③ 二次 open 不叠加心跳 timer ④ exhausted 后 token 变化复位重连
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useNotificationConnection } from '../useNotificationConnection'

vi.mock('element-plus', () => ({
  ElMessage: { warning: vi.fn(), success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/utils/tokenObfuscator', () => ({
  decodeToken: vi.fn(() => null),
}))

vi.mock('@/utils/tokenMemory', () => ({
  getInMemoryAccessToken: vi.fn(() => 'mem-token'),
}))

vi.mock('@/stores/auth', async () => {
  const { reactive } = await vi.importActual<typeof import('vue')>('vue')
  const authState = reactive({ auth_username: 'EMP001', access_token: 'token-abc' })
  return {
    useAuthStore: () => ({
      get authInfo() {
        return { auth_username: authState.auth_username }
      },
      get access_token() {
        return authState.access_token
      },
    }),
    setToken: (token: string) => {
      authState.access_token = token
    },
  }
})

class MockWebSocket {
  static instances: MockWebSocket[] = []
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3

  url: string
  protocols: string[] | undefined
  readyState = MockWebSocket.CONNECTING
  closed = false
  sent: string[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: ((event: { code: number }) => void) | null = null
  onerror: (() => void) | null = null

  constructor(url: string, protocols?: string[]) {
    this.url = url
    this.protocols = protocols
    MockWebSocket.instances.push(this)
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.closed = true
    this.readyState = MockWebSocket.CLOSED
  }

  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.()
  }

  simulateClose(code = 1000): void {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.({ code })
  }

  static reset(): void {
    MockWebSocket.instances = []
  }

  static get last(): MockWebSocket {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1]
  }
}

describe('useNotificationConnection [BF-095/I-9]', () => {
  let originalWebSocket: typeof globalThis.WebSocket

  beforeEach(() => {
    vi.clearAllMocks()
    MockWebSocket.reset()
    originalWebSocket = globalThis.WebSocket
    globalThis.WebSocket = MockWebSocket as unknown as typeof globalThis.WebSocket
  })

  afterEach(() => {
    vi.useRealTimers()
    globalThis.WebSocket = originalWebSocket
  })

  async function setToken(token: string): Promise<void> {
    const authModule = (await import('@/stores/auth')) as unknown as {
      setToken: (t: string) => void
    }
    authModule.setToken(token)
  }

  it('connect 以工号路径与内存 token 建连，onopen 后 isConnected=true', () => {
    const conn = useNotificationConnection()
    conn.connect()

    expect(MockWebSocket.instances).toHaveLength(1)
    const ws = MockWebSocket.last
    expect(ws.url).toContain('/ws/notifications/EMP001/')
    expect(ws.protocols).toEqual(['mem-token'])
    expect(conn.isConnected.value).toBe(false)

    ws.simulateOpen()
    expect(conn.isConnected.value).toBe(true)
  })

  it('I-9① 主动 disconnect 后异步 onclose(1000) 不复活连接', () => {
    vi.useFakeTimers()
    const conn = useNotificationConnection()
    conn.connect()
    MockWebSocket.last.simulateOpen()

    conn.disconnect()
    expect(conn.isConnected.value).toBe(false)

    // 模拟浏览器 close 事件异步到达
    MockWebSocket.last.simulateClose(1000)
    vi.advanceTimersByTime(10000)
    expect(MockWebSocket.instances).toHaveLength(1)
  })

  it('I-9② connect 入口先关旧连接：manualReconnect 旧 socket 被显式关闭且不再分发', () => {
    const conn = useNotificationConnection()
    conn.connect()
    const first = MockWebSocket.last
    first.simulateOpen()

    conn.manualReconnect()
    expect(first.closed).toBe(true)
    expect(MockWebSocket.instances).toHaveLength(2)

    // 旧 socket 的 onclose 已被摘除，迟到事件不产生重连副作用
    first.onclose = null
    first.simulateClose(1006)
    expect(MockWebSocket.instances).toHaveLength(2)
  })

  it('I-9③ 二次 open 后心跳 timer 不叠加：30s 仅发 1 个 ping', () => {
    vi.useFakeTimers()
    const conn = useNotificationConnection()
    conn.connect()
    MockWebSocket.last.simulateOpen()

    conn.manualReconnect()
    MockWebSocket.last.simulateOpen()

    vi.advanceTimersByTime(30000)
    expect(MockWebSocket.last.sent.filter((s) => s.includes('ping'))).toHaveLength(1)
  })

  it('I-9④ 4401 置 exhausted 后，token 变化（重新登录）复位并重连', async () => {
    const conn = useNotificationConnection()
    conn.connect()
    MockWebSocket.last.simulateOpen()

    MockWebSocket.last.simulateClose(4401)
    expect(conn.isConnectionExhausted.value).toBe(true)

    await setToken('token-relogin')
    await nextTick()

    expect(conn.isConnectionExhausted.value).toBe(false)
    expect(MockWebSocket.instances).toHaveLength(2)
  })

  it('I-9④ 连接正常时 token 静默刷新不触发重连', async () => {
    const conn = useNotificationConnection()
    conn.connect()
    MockWebSocket.last.simulateOpen()
    expect(conn.isConnectionExhausted.value).toBe(false)

    await setToken('token-refreshed')
    await nextTick()

    expect(MockWebSocket.instances).toHaveLength(1)
  })

  it('M-22 connect 入口清 pending 重连定时器：手动建连后旧 timer 到期不再新建连接（churn 消除）', () => {
    vi.useFakeTimers()
    const conn = useNotificationConnection()
    conn.connect()
    MockWebSocket.last.simulateOpen()

    // 断线 → scheduleReconnect 挂起重连定时器（3s 后到期）
    MockWebSocket.last.simulateClose(1006)
    expect(MockWebSocket.instances).toHaveLength(1)

    // 定时器未到期期间手动建连（用户点重连 / 切回前台）
    conn.connect()
    expect(MockWebSocket.instances).toHaveLength(2)

    // 旧 pending timer 若未清理，到期会打断刚建立的连接再建第三只（连接 churn）
    vi.advanceTimersByTime(30000)
    expect(MockWebSocket.instances).toHaveLength(2)
  })

  it('M-22 scheduleReconnect 先清后置：定时器句柄不被覆盖丢失，连续断线仅一个重连定时器生效', () => {
    vi.useFakeTimers()
    const conn = useNotificationConnection()
    conn.connect()
    const first = MockWebSocket.last
    first.simulateOpen()

    // 第一次断线挂定时器 A；随后手动建连又断线挂定时器 B
    first.simulateClose(1006)
    conn.connect()
    const second = MockWebSocket.last
    second.simulateOpen()
    second.simulateClose(1006)

    vi.advanceTimersByTime(30000)
    // 先清后置: A 被清、仅 B 到期建 1 只 → 共 3 只；
    // 若 A 句柄被覆盖丢失: A、B 双双到期 → 5 只（B 到期还会关旧建新）
    expect(MockWebSocket.instances).toHaveLength(3)
  })
})
