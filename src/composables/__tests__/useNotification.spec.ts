import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/utils/tokenCrypto', () => ({
  getDecryptedToken: vi.fn().mockReturnValue(JSON.stringify({ auth_username: 'testuser' })),
}))

vi.mock('@/api/request', () => ({
  get: vi.fn().mockResolvedValue({ data: [] }),
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
  onclose: (() => void) | null = null
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

  it('should mark all as read', () => {
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

    markAllAsRead()
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

    ws.onclose()
    expect(isConnected.value).toBe(false)
  })

  it('should handle WebSocket onerror', async () => {
    const { connect, isConnected } = useNotification()
    connect()

    const ws = wsInstances[0]
    ws.onerror()
    expect(isConnected.value).toBe(false)
  })
})
