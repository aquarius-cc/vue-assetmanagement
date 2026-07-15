import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStorageStore } from '../storageStore'

vi.mock('@/api/storage', () => ({
  storageAPI: {
    getStorages: vi.fn(),
    getStorageByRecordcode: vi.fn(),
    createStorage: vi.fn(),
    updateStorage: vi.fn(),
    deleteStorage: vi.fn(),
    batchDeleteStorages: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('StorageStore', () => {
  let store: ReturnType<typeof useStorageStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useStorageStore()
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
    it('应该调用API获取仓库列表', async () => {
      const mockResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            recordcode: 'ST-001',
            storage_name: '主仓库',
            storage_location: 'A栋1楼',
          },
        ],
      }

      const { storageAPI } = await import('@/api/storage')
      vi.mocked(storageAPI.getStorages).mockResolvedValue(mockResponse)

      await store.getList()

      expect(store.list).toHaveLength(1)
      expect(store.list[0].recordcode).toBe('ST-001')
      expect(store.list[0].storage_name).toBe('主仓库')
    })

    it('应该更新分页状态', async () => {
      const { storageAPI } = await import('@/api/storage')
      vi.mocked(storageAPI.getStorages).mockResolvedValue({
        count: 40,
        next: null,
        previous: null,
        results: [],
      })

      await store.getList({ page: 2, page_size: 20 })

      expect(store.pagination.total).toBe(40)
      expect(store.pagination.page).toBe(2)
      expect(store.pagination.page_size).toBe(20)
    })

    it('应该处理API错误', async () => {
      const { storageAPI } = await import('@/api/storage')
      vi.mocked(storageAPI.getStorages).mockRejectedValue(new Error('网络错误'))

      await expect(store.getList()).rejects.toThrow('网络错误')
    })
  })

  describe('创建记录', () => {
    it('应该调用API创建仓库', async () => {
      const mockCreated = {
        recordcode: 'ST-001',
        storage_name: '主仓库',
        storage_location: 'A栋1楼',
      }

      const { storageAPI } = await import('@/api/storage')
      vi.mocked(storageAPI.createStorage).mockResolvedValue(mockCreated)

      await store.create({ storage_name: '主仓库', storage_location: 'A栋1楼' })

      expect(store.list).toHaveLength(1)
      expect(store.list[0].recordcode).toBe('ST-001')
    })

    it('应该处理创建失败', async () => {
      const { storageAPI } = await import('@/api/storage')
      vi.mocked(storageAPI.createStorage).mockRejectedValue(new Error('创建失败'))

      await expect(
        store.create({ storage_name: '主仓库', storage_location: 'A栋1楼' }),
      ).rejects.toThrow('创建失败')
    })
  })

  describe('删除记录', () => {
    it('应该调用API删除仓库', async () => {
      const { storageAPI } = await import('@/api/storage')
      vi.mocked(storageAPI.deleteStorage).mockResolvedValue()

      await store.remove('ST-001')

      expect(storageAPI.deleteStorage).toHaveBeenCalledWith('ST-001')
    })
  })
})
