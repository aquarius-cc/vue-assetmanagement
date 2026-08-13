import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGet, mockPost, mockUnwrapResponse } = vi.hoisted(() => ({
  mockGet: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
  mockPost: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
  mockUnwrapResponse: vi.fn(
    async (promise: Promise<{ code: number; data: unknown; message: string }>) => {
      const res = await promise
      if (res.code !== 0) throw new Error(res.message || '请求失败')
      return res.data
    },
  ),
}))

vi.mock('@/api/request', () => ({
  get: mockGet,
  post: mockPost,
  unwrapResponse: mockUnwrapResponse,
}))

import { notificationAPI } from '@/api/notification'

describe('notificationAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getNotifications calls GET /notifications/ with params cast', async () => {
    await notificationAPI.getNotifications({ page: 1, is_read: false } as never)
    expect(mockGet).toHaveBeenCalledWith('/notifications/', { page: 1, is_read: false })
  })

  it('getUnreadCount calls GET /notifications/unread-count/', async () => {
    await notificationAPI.getUnreadCount()
    expect(mockGet).toHaveBeenCalledWith('/notifications/unread-count/')
  })

  it('markRead calls POST /notifications/{id}/read/', async () => {
    await notificationAPI.markRead(12)
    expect(mockPost).toHaveBeenCalledWith('/notifications/12/read/')
  })

  it('markAllRead calls POST /notifications/read-all/', async () => {
    await notificationAPI.markAllRead()
    expect(mockPost).toHaveBeenCalledWith('/notifications/read-all/')
  })
})
