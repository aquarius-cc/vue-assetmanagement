import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useOperationLogStore } from '../operationLogStore'

vi.mock('@/api/operationLog', () => ({
  operationLogAPI: {
    getOperationLogs: vi.fn(),
    getOperationLogDetail: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('OperationLogStore', () => {
  let store: ReturnType<typeof useOperationLogStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useOperationLogStore()
    vi.clearAllMocks()
  })

  describe('初始化状态', () => {
    it('应该初始化为空列表', () => {
      expect(store.list).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.pagination.total).toBe(0)
    })
  })

  describe('获取列表', () => {
    it('应该调用API获取操作日志列表', async () => {
      const mockResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            logging_id: 'LOG-001',
            asset_name: '笔记本电脑',
            operation_type: 'create',
            operation_time: '2026-07-09T10:00:00Z',
          },
        ],
      }

      const { operationLogAPI } = await import('@/api/operationLog')
      vi.mocked(operationLogAPI.getOperationLogs).mockResolvedValue(mockResponse)

      await store.getList()

      expect(store.list).toHaveLength(1)
      expect(store.list[0].logging_id).toBe('LOG-001')
    })

    it('应该更新分页状态', async () => {
      const { operationLogAPI } = await import('@/api/operationLog')
      vi.mocked(operationLogAPI.getOperationLogs).mockResolvedValue({
        count: 200,
        next: null,
        previous: null,
        results: [],
      })

      await store.getList({ page: 10, page_size: 20 })

      expect(store.pagination.total).toBe(200)
      expect(store.pagination.page).toBe(10)
    })

    it('应该处理API错误', async () => {
      const { operationLogAPI } = await import('@/api/operationLog')
      vi.mocked(operationLogAPI.getOperationLogs).mockRejectedValue(new Error('网络错误'))

      await expect(store.getList()).rejects.toThrow('网络错误')
    })
  })

  describe('只读模块限制', () => {
    it('create应该抛出只读错误', async () => {
      await expect(store.create({})).rejects.toThrow('操作日志为只读模块，不支持创建操作')
    })

    it('update应该抛出只读错误', async () => {
      await expect(
        store.update({ logging_id: 'LOG-001' } as any),
      ).rejects.toThrow('操作日志为只读模块，不支持更新操作')
    })

    it('remove应该抛出只读错误', async () => {
      await expect(store.remove('LOG-001')).rejects.toThrow('操作日志为只读模块，不支持删除操作')
    })
  })
})
