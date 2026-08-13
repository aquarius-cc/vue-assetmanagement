import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHardDiskSnStore } from '../harddiskSnStore'

vi.mock('@/api/harddiskSn', () => ({
  harddiskSnAPI: {
    getHardDiskSNs: vi.fn(),
    getHardDiskSN: vi.fn(),
    createHardDiskSN: vi.fn(),
    updateHardDiskSN: vi.fn(),
    deleteHardDiskSN: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('HardDiskSnStore', () => {
  let store: ReturnType<typeof useHardDiskSnStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useHardDiskSnStore()
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
    it('应该调用API获取硬盘序列号列表', async () => {
      const mockResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            recordcode: 'HD-001',
            harddisksn_asset: 'AS-001',
            harddisk_sn_code: 'SN12345678',
          },
        ],
      }

      const { harddiskSnAPI } = await import('@/api/harddiskSn')
      vi.mocked(harddiskSnAPI.getHardDiskSNs).mockResolvedValue(mockResponse)

      await store.getList()

      expect(store.list).toHaveLength(1)
      expect(store.list[0].harddisksn_asset).toBe('AS-001')
      expect(store.list[0].harddisk_sn_code).toBe('SN12345678')
    })

    it('应该更新分页状态', async () => {
      const { harddiskSnAPI } = await import('@/api/harddiskSn')
      vi.mocked(harddiskSnAPI.getHardDiskSNs).mockResolvedValue({
        count: 50,
        next: null,
        previous: null,
        results: [],
      })

      await store.getList({ page: 3, page_size: 20 })

      expect(store.pagination.total).toBe(50)
      expect(store.pagination.page).toBe(3)
    })

    it('应该处理API错误', async () => {
      const { harddiskSnAPI } = await import('@/api/harddiskSn')
      vi.mocked(harddiskSnAPI.getHardDiskSNs).mockRejectedValue(new Error('网络错误'))

      await expect(store.getList()).rejects.toThrow('网络错误')
    })
  })

  describe('创建记录', () => {
    it('应该调用API创建硬盘序列号', async () => {
      const mockCreated = {
        recordcode: 'HD-001',
        harddisksn_asset: 'AS-001',
        harddisk_sn_code: 'SN12345678',
      }

      const { harddiskSnAPI } = await import('@/api/harddiskSn')
      vi.mocked(harddiskSnAPI.createHardDiskSN).mockResolvedValue(mockCreated as any)

      await store.create({
        harddisksn_asset: 'AS-001',
        harddisk_sn_code: 'SN12345678',
      })

      expect(store.list).toHaveLength(1)
      expect(store.list[0].harddisksn_asset).toBe('AS-001')
    })

    it('应该处理创建失败', async () => {
      const { harddiskSnAPI } = await import('@/api/harddiskSn')
      vi.mocked(harddiskSnAPI.createHardDiskSN).mockRejectedValue(new Error('创建失败'))

      await expect(
        store.create({ harddisksn_asset: 'AS-001', harddisk_sn_code: 'SN12345678' }),
      ).rejects.toThrow('创建失败')
    })
  })

  describe('删除记录', () => {
    it('应该调用API删除硬盘序列号', async () => {
      const { harddiskSnAPI } = await import('@/api/harddiskSn')
      vi.mocked(harddiskSnAPI.deleteHardDiskSN).mockResolvedValue()

      await store.remove('AS-001')

      expect(harddiskSnAPI.deleteHardDiskSN).toHaveBeenCalledWith('AS-001')
    })
  })
})
