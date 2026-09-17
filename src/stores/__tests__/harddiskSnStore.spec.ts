import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHardDiskSnStore, getHardDiskSNsByAsset, saveHardDiskSNBatch } from '../harddiskSnStore'

vi.mock('@/api/harddiskSn', () => ({
  harddiskSnAPI: {
    getHardDiskSNs: vi.fn(),
    getHardDiskSN: vi.fn(),
    createHardDiskSN: vi.fn(),
    updateHardDiskSN: vi.fn(),
    deleteHardDiskSN: vi.fn(),
    getHardDiskSNsByAsset: vi.fn(),
    saveHardDiskSNBatch: vi.fn(),
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

  describe('按资产查询与批量保存', () => {
    it('getHardDiskSNsByAsset应该调用API并透传 asset_code', async () => {
      const mockResponse = { results: [{ recordcode: 'HD-001' }], count: 1 }
      const { harddiskSnAPI } = await import('@/api/harddiskSn')
      vi.mocked(harddiskSnAPI.getHardDiskSNsByAsset).mockResolvedValue(mockResponse as any)

      const result = await getHardDiskSNsByAsset('AS-001')

      expect(harddiskSnAPI.getHardDiskSNsByAsset).toHaveBeenCalledWith('AS-001')
      expect(result).toEqual(mockResponse)
    })

    it('getHardDiskSNsByAsset API失败时应抛出异常', async () => {
      const { harddiskSnAPI } = await import('@/api/harddiskSn')
      vi.mocked(harddiskSnAPI.getHardDiskSNsByAsset).mockRejectedValue(new Error('查询失败'))

      await expect(getHardDiskSNsByAsset('AS-001')).rejects.toThrow('查询失败')
    })

    it('saveHardDiskSNBatch应该调用API并透传批量数据', async () => {
      const mockResult = { created: 1, updated: 0, total: 1, asset_recordcode: 'AR-001' }
      const { harddiskSnAPI } = await import('@/api/harddiskSn')
      vi.mocked(harddiskSnAPI.saveHardDiskSNBatch).mockResolvedValue(mockResult)

      const data = {
        asset_recordcode: 'AR-001',
        disks: [{ harddisk_no: '1', harddisk_sn_code: 'SN001' }],
      } as any
      const result = await saveHardDiskSNBatch(data)

      expect(harddiskSnAPI.saveHardDiskSNBatch).toHaveBeenCalledWith(data)
      expect(result.total).toBe(1)
    })

    it('saveHardDiskSNBatch API失败时应抛出异常', async () => {
      const { harddiskSnAPI } = await import('@/api/harddiskSn')
      vi.mocked(harddiskSnAPI.saveHardDiskSNBatch).mockRejectedValue(new Error('保存失败'))

      await expect(
        saveHardDiskSNBatch({ asset_recordcode: 'AR-001', disks: [] } as any),
      ).rejects.toThrow('保存失败')
    })
  })
})
