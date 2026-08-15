import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AxiosError } from 'axios'
import { notificationAPI } from '@/api/notification'

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

const mockToken = vi.hoisted(() => ({
  getDecryptedToken: vi.fn(),
}))

const mockStore = vi.hoisted(() => ({
  authInfo: null as { auth_username: string } | null,
  access_token: null as string | null,
}))

const mockTokenMemory = vi.hoisted(() => ({
  getInMemoryAccessToken: vi.fn(),
}))

vi.mock('@/utils/tokenCrypto', () => ({
  getDecryptedToken: mockToken.getDecryptedToken,
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockStore,
}))

vi.mock('@/utils/tokenMemory', () => ({
  getInMemoryAccessToken: mockTokenMemory.getInMemoryAccessToken,
}))

vi.mock('@/api/notification', () => ({
  notificationAPI: {
    getNotifications: vi.fn().mockResolvedValue({ data: [] }),
    getUnreadCount: vi.fn().mockResolvedValue({ data: { count: 0 } }),
    markAllRead: vi.fn().mockResolvedValue({ data: { marked_count: 0 } }),
  },
}))

const wsInstances: any[] = []
let wsIdCounter = 0

class MockWebSocket {
  static OPEN = 1
  static CLOSED = 3

  url = ''
  readyState = MockWebSocket.OPEN
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: ((event: { code: number }) => void) | null = null
  onerror: (() => void) | null = null

  send = vi.fn()
  close = vi.fn()
  _id: number

  constructor(url: string) {
    this.url = url
    this._id = wsIdCounter++
    wsInstances.push(this)
  }
}

vi.stubGlobal('WebSocket', MockWebSocket)

vi.stubGlobal('localStorage', {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
})

import { useNotification } from '../useNotification'

describe('useNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    wsInstances.length = 0
    wsIdCounter = 0
    mockStore.authInfo = null
    mockStore.access_token = null
    mockTokenMemory.getInMemoryAccessToken.mockReturnValue(null)
    mockToken.getDecryptedToken.mockImplementation((key: string) =>
      key === 'authInfo'
        ? JSON.stringify({ auth_username: 'testuser' })
        : key === 'access_token'
          ? 'test-token'
          : null,
    )
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with default values', () => {
    const { notifications, unreadCount, isConnected, isLoading } = useNotification()
    expect(notifications.value).toEqual([])
    expect(unreadCount.value).toBe(0)
    expect(isConnected.value).toBe(false)
    expect(isLoading.value).toBe(false)
  })

  it('should connect to WebSocket when connect() is called', async () => {
    const { connect } = useNotification()
    connect()

    await vi.advanceTimersByTimeAsync(0)

    expect(wsInstances.length).toBe(1)
    expect(wsInstances[0].url).toContain('ws://')
  })

  it('should set isConnected when WebSocket opens', async () => {
    const { connect, isConnected } = useNotification()
    connect()

    const ws = wsInstances[0]
    ws.onopen()

    expect(isConnected.value).toBe(true)
  })

  it('should handle incoming notifications', async () => {
    const { connect, notifications, unreadCount } = useNotification()
    connect()

    const ws = wsInstances[0]
    ws.onmessage({
      data: JSON.stringify({
        type: 'notification',
        data: {
          id: 1,
          type: 'system',
          title: 'Test',
          message: 'Test notification',
          priority: 'medium',
          is_read: false,
          created_at: '2024-01-15T10:00:00Z',
        },
      }),
    })

    expect(notifications.value).toHaveLength(1)
    expect(unreadCount.value).toBe(1)
  })

  it('should ignore pong messages', async () => {
    const { connect, notifications, unreadCount } = useNotification()
    connect()

    const ws = wsInstances[0]
    ws.onmessage({ data: JSON.stringify({ type: 'pong' }) })

    expect(notifications.value).toHaveLength(0)
    expect(unreadCount.value).toBe(0)
  })

  it('should mark notification as read', () => {
    const { notifications, unreadCount, markAsRead } = useNotification()

    notifications.value = [
      {
        id: 1,
        type: 'system',
        title: 'T',
        message: 'M',
        priority: 'medium',
        is_read: false,
        created_at: '',
      },
    ]
    unreadCount.value = 1

    markAsRead(1)
    expect(notifications.value[0].is_read).toBe(true)
    expect(unreadCount.value).toBe(0)
  })

  it('should not decrement unread for already-read notification', () => {
    const { notifications, unreadCount, markAsRead } = useNotification()

    notifications.value = [
      {
        id: 1,
        type: 'system',
        title: 'T',
        message: 'M',
        priority: 'medium',
        is_read: true,
        created_at: '',
      },
    ]
    unreadCount.value = 0

    markAsRead(1)
    expect(unreadCount.value).toBe(0)
  })

  it('should mark all as read', async () => {
    const { notifications, unreadCount, markAllAsRead } = useNotification()

    notifications.value = [
      {
        id: 1,
        type: 'system',
        title: 'T1',
        message: 'M1',
        priority: 'medium',
        is_read: false,
        created_at: '',
      },
      {
        id: 2,
        type: 'system',
        title: 'T2',
        message: 'M2',
        priority: 'low',
        is_read: false,
        created_at: '',
      },
    ]
    unreadCount.value = 2

    await markAllAsRead()
    expect(notificationAPI.markAllRead).toHaveBeenCalled()
    expect(notifications.value.every((n: any) => n.is_read)).toBe(true)
    expect(unreadCount.value).toBe(0)
  })

  it('should send ping heartbeat', async () => {
    const { connect } = useNotification()
    connect()

    const ws = wsInstances[0]
    ws.onopen()

    vi.advanceTimersByTime(30000)
    expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }))
  })

  it('should disconnect and clean up', async () => {
    const { connect, disconnect, isConnected } = useNotification()
    connect()

    const ws = wsInstances[0]
    ws.onopen()
    expect(isConnected.value).toBe(true)

    disconnect()
    expect(ws.close).toHaveBeenCalled()
    expect(isConnected.value).toBe(false)
  })

  it('should handle WebSocket onclose', async () => {
    const { connect, isConnected } = useNotification()
    connect()

    const ws = wsInstances[0]
    ws.onopen()
    expect(isConnected.value).toBe(true)

    ws.onclose({ code: 1000 })
    expect(isConnected.value).toBe(false)
  })

  it('should handle WebSocket onerror', async () => {
    const { connect, isConnected } = useNotification()
    connect()

    const ws = wsInstances[0]
    ws.onerror()
    expect(isConnected.value).toBe(false)
  })

  describe('branch coverage', () => {
    it('reads jobcode from authStore when available (cookie channel)', async () => {
      mockStore.authInfo = { auth_username: 'storeuser' }
      mockToken.getDecryptedToken.mockImplementation((key: string) =>
        key === 'access_token' ? 'test-token' : null,
      )

      const { connect } = useNotification()
      connect()

      await vi.advanceTimersByTimeAsync(0)

      expect(wsInstances[0].url).toContain('storeuser')
    })

    it('falls back to localStorage authInfo when store authInfo missing', async () => {
      mockToken.getDecryptedToken.mockImplementation((key: string) =>
        key === 'authInfo'
          ? JSON.stringify({ auth_username: 'legacyuser' })
          : key === 'access_token'
            ? 'test-token'
            : null,
      )

      const { connect } = useNotification()
      connect()

      await vi.advanceTimersByTimeAsync(0)

      expect(wsInstances[0].url).toContain('legacyuser')
    })

    it('prefers in-memory access token (cookie channel)', async () => {
      mockTokenMemory.getInMemoryAccessToken.mockReturnValue('mem-token')
      mockToken.getDecryptedToken.mockImplementation((key: string) =>
        key === 'authInfo' ? JSON.stringify({ auth_username: 'testuser' }) : null,
      )

      const { connect } = useNotification()
      connect()

      await vi.advanceTimersByTimeAsync(0)

      expect(wsInstances[0].url).toContain('mem-token')
    })

    it('prefers authStore access token over localStorage', async () => {
      mockStore.access_token = 'store-token'
      mockToken.getDecryptedToken.mockImplementation((key: string) =>
        key === 'authInfo' ? JSON.stringify({ auth_username: 'testuser' }) : 'local-token',
      )

      const { connect } = useNotification()
      connect()

      await vi.advanceTimersByTimeAsync(0)

      expect(wsInstances[0].url).toContain('store-token')
    })

    it('returns null and skips connect when authInfo is invalid JSON', async () => {
      mockToken.getDecryptedToken.mockImplementation((key: string) =>
        key === 'authInfo' ? '{invalid' : 'test-token',
      )

      const { connect } = useNotification()
      connect()

      await vi.advanceTimersByTimeAsync(0)

      expect(wsInstances).toHaveLength(0)
    })

    it('skips connect when jobcode missing', async () => {
      mockToken.getDecryptedToken.mockImplementation((key: string) =>
        key === 'authInfo' ? JSON.stringify({}) : 'test-token',
      )

      const { connect } = useNotification()
      connect()

      await vi.advanceTimersByTimeAsync(0)

      expect(wsInstances).toHaveLength(0)
    })

    it('skips connect when token missing', async () => {
      mockToken.getDecryptedToken.mockImplementation((key: string) =>
        key === 'authInfo' ? JSON.stringify({ auth_username: 'testuser' }) : null,
      )

      const { connect } = useNotification()
      connect()

      await vi.advanceTimersByTimeAsync(0)

      expect(wsInstances).toHaveLength(0)
    })

    it('ignores malformed ws messages', async () => {
      const { connect } = useNotification()
      connect()

      wsInstances[0].onmessage({ data: '{not-json' })

      expect(wsInstances[0].send).not.toHaveBeenCalled()
    })

    it('ignores unknown message types', async () => {
      const { connect, notifications, unreadCount } = useNotification()
      connect()

      wsInstances[0].onmessage({ data: JSON.stringify({ type: 'connected' }) })

      expect(notifications.value).toHaveLength(0)
      expect(unreadCount.value).toBe(0)
    })

    it('does not send ping when socket not open', async () => {
      const { connect } = useNotification()
      connect()

      wsInstances[0].onopen()
      wsInstances[0].readyState = MockWebSocket.CLOSED
      vi.advanceTimersByTime(30000)

      expect(wsInstances[0].send).not.toHaveBeenCalled()
    })

    it('sends mark_read when socket open', async () => {
      const { connect, notifications, unreadCount, markAsRead } = useNotification()
      connect()
      wsInstances[0].onopen()

      notifications.value = [
        {
          id: 5,
          type: 'system',
          title: 'T',
          message: 'M',
          priority: 'medium',
          is_read: false,
          created_at: '',
        },
      ]
      unreadCount.value = 1

      markAsRead(5)

      expect(wsInstances[0].send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'mark_read', notification_id: 5 }),
      )
    })

    it('prevents duplicate markAllAsRead', async () => {
      const { markAllAsRead } = useNotification()
      let resolveGate: (v: unknown) => void = () => {}
      const gate = new Promise((r) => {
        resolveGate = r
      })
      ;(notificationAPI.markAllRead as ReturnType<typeof vi.fn>).mockReturnValue(gate)

      const first = markAllAsRead()
      const second = markAllAsRead()

      expect(notificationAPI.markAllRead).toHaveBeenCalledTimes(1)
      resolveGate({ data: {} })
      await first
      await second
    })

    it('shows error when markAllAsRead fails with plain error', async () => {
      ;(notificationAPI.markAllRead as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('server down'),
      )

      const { markAllAsRead } = useNotification()
      await markAllAsRead()

      expect((await import('element-plus')).ElMessage.error).toHaveBeenCalledWith('server down')
    })

    it('does not double-toast when markAllAsRead fails with axios error', async () => {
      ;(notificationAPI.markAllRead as ReturnType<typeof vi.fn>).mockRejectedValue(
        new AxiosError('x', 'ERR_BAD_REQUEST'),
      )

      const { markAllAsRead } = useNotification()
      await markAllAsRead()

      expect((await import('element-plus')).ElMessage.error).not.toHaveBeenCalled()
    })

    it('loads notifications from array response', async () => {
      ;(notificationAPI.getNotifications as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ id: 1 }],
      })

      const { fetchNotifications, notifications, isLoading } = useNotification()
      await fetchNotifications(10)

      expect(notifications.value).toEqual([{ id: 1 }])
      expect(isLoading.value).toBe(false)
    })

    it('loads notifications from paginated response', async () => {
      ;(notificationAPI.getNotifications as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { results: [{ id: 2 }] },
      })

      const { fetchNotifications, notifications } = useNotification()
      await fetchNotifications()

      expect(notifications.value).toEqual([{ id: 2 }])
    })

    it('sets fetchError when load fails with plain error', async () => {
      ;(notificationAPI.getNotifications as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('boom'),
      )

      const { fetchNotifications, fetchError } = useNotification()
      await fetchNotifications()

      expect(fetchError.value).toBe(true)
      expect((await import('element-plus')).ElMessage.error).toHaveBeenCalledWith('boom')
    })

    it('sets fetchError without toast on axios failure', async () => {
      ;(notificationAPI.getNotifications as ReturnType<typeof vi.fn>).mockRejectedValue(
        new AxiosError('x', 'ERR_BAD_REQUEST'),
      )

      const { fetchNotifications, fetchError } = useNotification()
      await fetchNotifications()

      expect(fetchError.value).toBe(true)
      expect((await import('element-plus')).ElMessage.error).not.toHaveBeenCalled()
    })

    it('fetches unread count', async () => {
      ;(notificationAPI.getUnreadCount as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { count: 3 },
      })

      const { fetchUnreadCount, unreadCount } = useNotification()
      await fetchUnreadCount()

      expect(unreadCount.value).toBe(3)
    })

    it('tolerates unread count failure', async () => {
      ;(notificationAPI.getUnreadCount as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('x'),
      )

      const { fetchUnreadCount, unreadCount } = useNotification()
      await fetchUnreadCount()

      expect(unreadCount.value).toBe(0)
    })

    it('reconnects on close after delay', async () => {
      const { connect } = useNotification()
      connect()

      wsInstances[0].onclose({ code: 1000 })
      await vi.advanceTimersByTimeAsync(3000)

      expect(wsInstances).toHaveLength(2)
    })

    it('stops reconnect on 4401 (invalid token)', async () => {
      const { connect, isConnectionExhausted } = useNotification()
      connect()

      wsInstances[0].onclose({ code: 4401 })
      await vi.advanceTimersByTimeAsync(30000)

      expect(wsInstances).toHaveLength(1)
      expect(isConnectionExhausted.value).toBe(true)
      expect((await import('element-plus')).ElMessage.warning).toHaveBeenCalledWith(
        '实时通知连接已断开，请重新登录',
      )
    })

    it('stops reconnect on 4403 (forbidden)', async () => {
      const { connect, isConnectionExhausted } = useNotification()
      connect()

      wsInstances[0].onclose({ code: 4403 })
      await vi.advanceTimersByTimeAsync(30000)

      expect(wsInstances).toHaveLength(1)
      expect(isConnectionExhausted.value).toBe(true)
    })

    it('marks connection exhausted after max attempts', async () => {
      const { connect, isConnectionExhausted } = useNotification()
      connect()

      for (let i = 0; i < 11; i++) {
        wsInstances[wsInstances.length - 1].onclose({ code: 1000 })
        await vi.advanceTimersByTimeAsync(15000)
      }

      expect(isConnectionExhausted.value).toBe(true)
      expect((await import('element-plus')).ElMessage.warning).toHaveBeenCalledWith(
        '实时通知连接已断开，请检查网络或点击重新连接',
      )
    })

    it('manualReconnect resets exhaustion and reconnects', async () => {
      const { connect, isConnectionExhausted, manualReconnect } = useNotification()
      connect()

      for (let i = 0; i < 11; i++) {
        wsInstances[wsInstances.length - 1].onclose({ code: 1000 })
        await vi.advanceTimersByTimeAsync(15000)
      }

      expect(isConnectionExhausted.value).toBe(true)

      manualReconnect()

      expect(isConnectionExhausted.value).toBe(false)
      expect(wsInstances).toHaveLength(12)
    })
  })
})
