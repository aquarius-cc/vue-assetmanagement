import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotificationStore } from '../notificationStore'
import type { NotificationItem } from '@/types/notification'

vi.mock('@/api/notification', () => ({
  notificationAPI: {
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}))

const makeItem = (id: number, is_read = false): NotificationItem =>
  ({
    id,
    title: `通知-${id}`,
    message: `内容-${id}`,
    type: 'system',
    priority: 'low',
    is_read,
    created_at: '2026-01-01T00:00:00+08:00',
    related_url: null,
  }) as NotificationItem

describe('NotificationStore', () => {
  let notificationStore: ReturnType<typeof useNotificationStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    notificationStore = useNotificationStore()
    vi.clearAllMocks()
  })

  describe('初始化状态', () => {
    it('应该初始化为空列表与默认分页', () => {
      expect(notificationStore.notifications).toEqual([])
      expect(notificationStore.loading).toBe(false)
      expect(notificationStore.pagination.page).toBe(1)
      expect(notificationStore.pagination.page_size).toBe(20)
      expect(notificationStore.pagination.total).toBe(0)
    })
  })

  describe('获取通知列表', () => {
    it('分页响应时应将结果与总数写入状态', async () => {
      const { notificationAPI } = await import('@/api/notification')
      vi.mocked(notificationAPI.getNotifications).mockResolvedValue({
        count: 2,
        next: null,
        previous: null,
        results: [makeItem(1), makeItem(2)],
      } as never)

      await notificationStore.fetchNotifications({ page: 1, page_size: 20 })

      expect(notificationStore.notifications).toHaveLength(2)
      expect(notificationStore.pagination.total).toBe(2)
      expect(notificationAPI.getNotifications).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      })
    })

    it('数组响应时应以长度作为总数', async () => {
      const { notificationAPI } = await import('@/api/notification')
      vi.mocked(notificationAPI.getNotifications).mockResolvedValue([
        makeItem(1),
        makeItem(2),
        makeItem(3),
      ] as never)

      await notificationStore.fetchNotifications({ limit: 3 })

      expect(notificationStore.notifications).toHaveLength(3)
      expect(notificationStore.pagination.total).toBe(3)
    })

    it('空响应时应清空列表', async () => {
      const { notificationAPI } = await import('@/api/notification')
      vi.mocked(notificationAPI.getNotifications).mockResolvedValue({
        count: 0,
        results: [],
      } as never)

      await notificationStore.fetchNotifications({ page: 1 })

      expect(notificationStore.notifications).toEqual([])
      expect(notificationStore.pagination.total).toBe(0)
    })

    it('results 缺失时应以空数组兜底', async () => {
      const { notificationAPI } = await import('@/api/notification')
      vi.mocked(notificationAPI.getNotifications).mockResolvedValue({
        count: 3,
      } as never)

      await notificationStore.fetchNotifications({ page: 1 })

      expect(notificationStore.notifications).toEqual([])
      expect(notificationStore.pagination.total).toBe(3)
    })

    it('请求失败时应抛出异常并关闭loading', async () => {
      const { notificationAPI } = await import('@/api/notification')
      vi.mocked(notificationAPI.getNotifications).mockRejectedValue(new Error('网络错误'))

      await expect(notificationStore.fetchNotifications()).rejects.toThrow('网络错误')
      expect(notificationStore.loading).toBe(false)
    })
  })

  describe('标记已读', () => {
    it('markRead应调用API并同步本地未读状态', async () => {
      const items = [makeItem(1, false), makeItem(2, false)]
      const { notificationAPI } = await import('@/api/notification')
      vi.mocked(notificationAPI.getNotifications).mockResolvedValue({
        count: 2,
        results: items,
      } as never)
      await notificationStore.fetchNotifications()

      vi.mocked(notificationAPI.markRead).mockResolvedValue(undefined as never)
      await notificationStore.markRead(1)

      expect(notificationAPI.markRead).toHaveBeenCalledWith(1)
      expect(notificationStore.notifications[0].is_read).toBe(true)
      expect(notificationStore.notifications[1].is_read).toBe(false)
    })

    it('markRead对列表外ID应仅调用API不做本地更新', async () => {
      const items = [makeItem(1, false)]
      const { notificationAPI } = await import('@/api/notification')
      vi.mocked(notificationAPI.getNotifications).mockResolvedValue({
        count: 1,
        results: items,
      } as never)
      await notificationStore.fetchNotifications()

      vi.mocked(notificationAPI.markRead).mockResolvedValue(undefined as never)
      await notificationStore.markRead(999)

      expect(notificationAPI.markRead).toHaveBeenCalledWith(999)
      expect(notificationStore.notifications[0].is_read).toBe(false)
    })

    it('markAllRead应调用API并将全部通知置为已读', async () => {
      const items = [makeItem(1, false), makeItem(2, false)]
      const { notificationAPI } = await import('@/api/notification')
      vi.mocked(notificationAPI.getNotifications).mockResolvedValue({
        count: 2,
        results: items,
      } as never)
      await notificationStore.fetchNotifications()

      vi.mocked(notificationAPI.markAllRead).mockResolvedValue({
        marked_count: 2,
      } as never)
      const result = await notificationStore.markAllRead()

      expect(notificationAPI.markAllRead).toHaveBeenCalled()
      expect(result).toEqual({ marked_count: 2 })
      expect(notificationStore.notifications.every((n) => n.is_read)).toBe(true)
    })
  })
})
