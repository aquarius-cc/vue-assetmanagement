import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAssetStore } from '../assetStore'

vi.mock('@/api/asset', () => ({
  assetAPI: {
    getAssets: vi.fn(),
    getAssetByCode: vi.fn(),
    getAssetByName: vi.fn(),
    createAsset: vi.fn(),
    updateAsset: vi.fn(),
    deleteAsset: vi.fn(),
    batchDeleteAssets: vi.fn(),
    searchAssets: vi.fn(),
    combineSearch: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('AssetStore', () => {
  let store: ReturnType<typeof useAssetStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useAssetStore()
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
    it('应该调用API获取资产列表', async () => {
      const mockResponse = {
        count: 1,
        results: [
          {
            asset_code: 'AS-001',
            asset_name: '笔记本电脑',
            asset_current_status: 'in_store',
          },
        ],
      }

      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.getAssets).mockResolvedValue(mockResponse)

      await store.getList()

      expect(store.list).toHaveLength(1)
      expect(store.list[0].asset_code).toBe('AS-001')
      expect(store.list[0].asset_name).toBe('笔记本电脑')
    })

    it('应该更新分页状态', async () => {
      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.getAssets).mockResolvedValue({
        count: 200,
        results: [],
      })

      await store.getList({ page: 5, page_size: 20 })

      expect(store.pagination.total).toBe(200)
      expect(store.pagination.page).toBe(5)
    })

    it('应该处理API错误', async () => {
      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.getAssets).mockRejectedValue(new Error('网络错误'))

      await expect(store.getList()).rejects.toThrow('网络错误')
    })
  })

  describe('创建记录', () => {
    it('应该调用API创建资产', async () => {
      const mockCreated = {
        asset_code: 'AS-001',
        asset_name: '笔记本电脑',
        asset_current_status: 'in_store',
      }

      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.createAsset).mockResolvedValue(mockCreated)

      await store.create({
        asset_name: '笔记本电脑',
        asset_current_status: 'in_store',
      } as any)

      expect(store.list).toHaveLength(1)
      expect(store.list[0].asset_code).toBe('AS-001')
    })

    it('应该处理创建失败', async () => {
      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.createAsset).mockRejectedValue(new Error('创建失败'))

      await expect(store.create({ asset_name: '笔记本电脑' } as any)).rejects.toThrow('创建失败')
    })
  })

  describe('删除记录', () => {
    it('应该调用API删除资产', async () => {
      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.deleteAsset).mockResolvedValue()

      await store.remove('AS-001')

      expect(assetAPI.deleteAsset).toHaveBeenCalledWith('AS-001')
    })
  })

  describe('扩展方法', () => {
    it('searchAssets应该调用searchAssets API', async () => {
      const mockResponse = {
        count: 1,
        results: [{ asset_code: 'AS-001', asset_name: '笔记本电脑' }],
      }

      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.searchAssets).mockResolvedValue(mockResponse as any)

      const result = await store.searchAssets({
        page: 1,
        page_size: 10,
        keyword: '笔记本',
      } as any)

      expect(assetAPI.searchAssets).toHaveBeenCalled()
      expect(result.count).toBe(1)
    })

    it('searchAssets应将search参数映射为keyword', async () => {
      const mockResponse = { count: 1, results: [] }
      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.searchAssets).mockResolvedValue(mockResponse as any)

      await store.searchAssets({
        page: 1,
        page_size: 10,
        search: '测试关键词',
      } as any)

      expect(assetAPI.searchAssets).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: '测试关键词' }),
      )
    })

    it('searchAssets无search参数时直接传递原有参数', async () => {
      const mockResponse = { count: 0, results: [] }
      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.searchAssets).mockResolvedValue(mockResponse as any)

      await store.searchAssets({
        page: 1,
        page_size: 5,
        keyword: '直接参数',
      } as any)

      expect(assetAPI.searchAssets).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: '直接参数' }),
      )
    })

    it('searchAssets API失败时应抛出异常', async () => {
      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.searchAssets).mockRejectedValue(new Error('搜索失败'))

      await expect(store.searchAssets({ page: 1, page_size: 10 } as any)).rejects.toThrow(
        '搜索失败',
      )
    })

    it('combineSearch应该调用combineSearch API', async () => {
      const mockResponse = {
        count: 2,
        results: [
          { asset_code: 'AS-001', asset_name: '笔记本电脑' },
          { asset_code: 'AS-002', asset_name: '台式电脑' },
        ],
      }

      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.combineSearch).mockResolvedValue(mockResponse as any)

      const result = await store.combineSearch({
        asset_name: '电脑',
      })

      expect(assetAPI.combineSearch).toHaveBeenCalled()
      expect(result.count).toBe(2)
    })

    it('combineSearch应过滤空值参数', async () => {
      const mockResponse = { count: 0, results: [] }
      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.combineSearch).mockResolvedValue(mockResponse as any)

      await store.combineSearch({
        asset_name: '电脑',
        asset_specification: '',
        asset_brand: null as any,
        asset_current_status: undefined as any,
        asset_type: '笔记本',
      })

      expect(assetAPI.combineSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          asset_name: '电脑',
          asset_type: '笔记本',
        }),
      )
      const calledWith = vi.mocked(assetAPI.combineSearch).mock.calls[0][0]
      expect(calledWith).not.toHaveProperty('asset_specification')
      expect(calledWith).not.toHaveProperty('asset_brand')
      expect(calledWith).not.toHaveProperty('asset_current_status')
    })

    it('combineSearch所有参数为空时应传递空对象', async () => {
      const mockResponse = { count: 0, results: [] }
      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.combineSearch).mockResolvedValue(mockResponse as any)

      await store.combineSearch({
        asset_name: '',
        asset_brand: null as any,
      })

      expect(assetAPI.combineSearch).toHaveBeenCalledWith({})
    })

    it('combineSearch API失败时应抛出异常', async () => {
      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.combineSearch).mockRejectedValue(new Error('联合搜索失败'))

      await expect(store.combineSearch({ asset_name: '电脑' })).rejects.toThrow('联合搜索失败')
    })

    it('combineSearch应支持多条件组合', async () => {
      const mockResponse = { count: 1, results: [{ asset_code: 'AS-001' }] }
      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.combineSearch).mockResolvedValue(mockResponse as any)

      await store.combineSearch({
        asset_name: '电脑',
        asset_current_status: 'in_store',
        asset_type: 'IT设备',
      })

      expect(assetAPI.combineSearch).toHaveBeenCalledWith({
        asset_name: '电脑',
        asset_current_status: 'in_store',
        asset_type: 'IT设备',
      })
    })
  })

  describe('获取详情', () => {
    it('应该调用getById获取资产详情', async () => {
      const mockAsset = { asset_code: 'AS-001', asset_name: '笔记本电脑' }
      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.getAssetByCode).mockResolvedValue(mockAsset as any)

      const result = await store.getById('AS-001')

      expect(result).toEqual(mockAsset)
      expect(assetAPI.getAssetByCode).toHaveBeenCalledWith('AS-001')
    })

    it('资产不存在时应返回null', async () => {
      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.getAssetByCode).mockResolvedValue(null)

      const result = await store.getById('NONEXIST')
      expect(result).toBeNull()
    })
  })

  describe('批量删除', () => {
    it('应该调用batchDelete API删除多条资产', async () => {
      const mockResult = {
        total: 2,
        success_count: 2,
        fail_count: 0,
        success_ids: ['AS-001', 'AS-002'],
        fail_items: [],
      }
      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.batchDeleteAssets).mockResolvedValue(mockResult as any)

      const result = await store.removeBatch(['AS-001', 'AS-002'])

      expect(result.success_count).toBe(2)
      expect(assetAPI.batchDeleteAssets).toHaveBeenCalledWith(['AS-001', 'AS-002'])
    })

    it('空ids数组应直接返回空结果', async () => {
      const result = await store.removeBatch([])
      expect(result.total).toBe(0)
      expect(result.success_count).toBe(0)
    })

    it('批量删除部分失败时应返回混合结果', async () => {
      const mockResult = {
        total: 2,
        success_count: 1,
        fail_count: 1,
        success_ids: ['AS-001'],
        fail_items: [{ id: 'AS-002', error_message: '资产已领用' }],
      }
      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.batchDeleteAssets).mockResolvedValue(mockResult as any)

      const result = await store.removeBatch(['AS-001', 'AS-002'])

      expect(result.success_count).toBe(1)
      expect(result.fail_count).toBe(1)
    })

    it('批量删除API失败时应抛出异常', async () => {
      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.batchDeleteAssets).mockRejectedValue(new Error('批量删除失败'))

      await expect(store.removeBatch(['AS-001'])).rejects.toThrow('批量删除失败')
    })
  })

  describe('按名称查询', () => {
    it('应该调用API按名称搜索资产', async () => {
      const mockResponse = {
        results: [{ asset_code: 'AS-001', asset_name: '笔记本电脑' }],
      }

      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.getAssetByName).mockResolvedValue(mockResponse as any)

      const result = await store.getByName('笔记本电脑')

      expect(result).toHaveLength(1)
      expect(result[0].asset_name).toBe('笔记本电脑')
    })

    it('应该处理空响应', async () => {
      const { assetAPI } = await import('@/api/asset')
      vi.mocked(assetAPI.getAssetByName).mockResolvedValue(null as any)

      const result = await store.getByName('不存在')

      expect(result).toEqual([])
    })
  })
})
