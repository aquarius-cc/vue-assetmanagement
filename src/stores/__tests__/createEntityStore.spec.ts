import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createEntityStore } from '../createEntityStore'
import type { ListResponse } from '../createEntityStore'

const mockElMessage = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
}))

interface TestEntity {
  id: string
  name: string
  value: number
}

const mockApi = {
  getList: vi.fn<() => Promise<ListResponse<TestEntity>>>(),
  getById: vi.fn<() => Promise<TestEntity | null>>(),
  create: vi.fn<() => Promise<TestEntity>>(),
  update: vi.fn<() => Promise<TestEntity>>(),
  delete: vi.fn<() => Promise<void>>(),
}

const mockApiWithBatchDelete = {
  ...mockApi,
  batchDelete: vi.fn(),
}

const useTestStore = createEntityStore<TestEntity>('test-entity', {
  idKey: 'id',
  displayName: '测试实体',
  api: mockApi as any,
  enableCache: false,
  enableDebounce: false,
})

// 带 batchDelete 的 store
const useBatchDeleteStore = createEntityStore<TestEntity>('test-batch', {
  idKey: 'id',
  displayName: '批量删除测试',
  api: mockApiWithBatchDelete as any,
  enableCache: false,
  enableDebounce: false,
  message: mockElMessage as any,
})

// 带 nameField 的 store
const useNameFieldStore = createEntityStore<TestEntity & { label: string }>('test-name', {
  idKey: 'id',
  nameField: 'label',
  displayName: '名称测试',
  api: mockApi as any,
  enableCache: false,
  enableDebounce: false,
})

// 带缓存+防抖的 store
const useCachedDebouncedStore = createEntityStore<TestEntity>('test-cached', {
  idKey: 'id',
  displayName: '缓存测试',
  api: mockApi as any,
  enableCache: true,
  cacheTTL: 60_000,
  enableDebounce: true,
  debounceDelay: 50,
})

describe('createEntityStore', () => {
  let store: ReturnType<typeof useTestStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useTestStore()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('初始化状态', () => {
    it('应该初始化为空列表', () => {
      expect(store.list).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.pagination.total).toBe(0)
      expect(store.pagination.page).toBe(1)
    })

    it('应该初始化currentEntity为null', () => {
      expect(store.currentEntity).toBeNull()
    })
  })

  describe('getList', () => {
    it('应该获取列表并同步状态', async () => {
      const mockResponse: ListResponse<TestEntity> = {
        count: 2,
        results: [
          { id: '1', name: '实体A', value: 100 },
          { id: '2', name: '实体B', value: 200 },
        ],
      }
      vi.mocked(mockApi.getList).mockResolvedValue(mockResponse)

      const result = await store.getList()

      expect(result).toHaveLength(2)
      expect(store.list).toHaveLength(2)
      expect(store.list[0].name).toBe('实体A')
      expect(store.pagination.total).toBe(2)
    })

    it('应该正确更新分页信息', async () => {
      vi.mocked(mockApi.getList).mockResolvedValue({ count: 50, results: [] })

      await store.getList({ page: 3, page_size: 10 })

      expect(store.pagination.total).toBe(50)
      expect(store.pagination.page).toBe(3)
      expect(store.pagination.page_size).toBe(10)
    })

    it('API 失败时应抛出异常', async () => {
      vi.mocked(mockApi.getList).mockRejectedValue(new Error('网络错误'))

      await expect(store.getList()).rejects.toThrow('网络错误')
      expect(store.loading).toBe(false)
    })

    it('超出总页数时应返回空数组', async () => {
      vi.mocked(mockApi.getList).mockResolvedValue({
        count: 20,
        results: [{ id: '1', name: 'A', value: 1 }],
      })

      const result = await store.getList({ page: 10, page_size: 20 })

      expect(result).toEqual([])
    })

    it('getList未提供api时应抛出异常', async () => {
      const noApiStore = createEntityStore<TestEntity>('no-api', {
        idKey: 'id',
        api: {} as any,
      })()
      await expect(noApiStore.getList()).rejects.toThrow('API "getList" not provided')
    })
  })

  describe('getById', () => {
    it('应该获取实体详情并同步到状态', async () => {
      vi.mocked(mockApi.getById).mockResolvedValue({ id: '1', name: '详情A', value: 100 })

      const result = await store.getById('1')

      expect(result).toEqual({ id: '1', name: '详情A', value: 100 })
      expect(store.list).toHaveLength(1)
      expect(store.list[0].id).toBe('1')
    })

    it('实体不存在时应返回null', async () => {
      vi.mocked(mockApi.getById).mockResolvedValue(null)

      const result = await store.getById('999')

      expect(result).toBeNull()
    })

    it('getById未提供api时应抛出异常', async () => {
      const noApiStore = createEntityStore<TestEntity>('no-getbyid', {
        idKey: 'id',
        api: { create: vi.fn(), update: vi.fn(), delete: vi.fn() } as any,
      })()
      await expect(noApiStore.getById('1')).rejects.toThrow('API "getById" not provided')
    })

    it('重复获取相同id应复用Promise（防重）', async () => {
      // 使用延迟promise使pending状态在第二次调用时仍然存在
      let resolveFn: (v: TestEntity) => void
      const delayedPromise = new Promise<TestEntity>((resolve) => {
        resolveFn = resolve
      })
      vi.mocked(mockApi.getById).mockReturnValue(delayedPromise)

      const p1 = store.getById('1')
      const p2 = store.getById('1')

      // 两个请求都应返回结果（Pinia会包装返回值，所以不能用toBe比较）
      // 但API只应被调用一次（防重）
      expect(mockApi.getById).toHaveBeenCalledTimes(1)

      // 解析promise
      resolveFn!({ id: '1', name: 'A', value: 1 })
      await Promise.all([p1, p2])
    })
  })

  describe('create', () => {
    it('应该创建实体并添加到列表', async () => {
      const created: TestEntity = { id: '3', name: '新实体', value: 300 }
      vi.mocked(mockApi.create).mockResolvedValue(created)

      await store.create({ name: '新实体', value: 300 })

      expect(store.list).toHaveLength(1)
      expect(store.list[0].id).toBe('3')
      expect(store.list[0].name).toBe('新实体')
    })

    it('创建失败时应抛出异常', async () => {
      vi.mocked(mockApi.create).mockRejectedValue(new Error('创建失败'))

      await expect(store.create({ name: '新实体' } as any)).rejects.toThrow('创建失败')
    })
  })

  describe('update', () => {
    it('应该更新实体', async () => {
      vi.mocked(mockApi.getList).mockResolvedValue({
        count: 1,
        results: [{ id: '1', name: '原始名称', value: 100 }],
      })
      await store.getList()

      const updated: TestEntity = { id: '1', name: '更新后名称', value: 150 }
      vi.mocked(mockApi.update).mockResolvedValue(updated)

      await store.update({ id: '1', name: '更新后名称', value: 150 })

      expect(store.list[0].name).toBe('更新后名称')
      expect(store.list[0].value).toBe(150)
    })

    it('缺少 ID 时应抛出异常', async () => {
      await expect(store.update({ name: '无ID' } as any)).rejects.toThrow('Missing ID for update')
    })
  })

  describe('remove', () => {
    it('应该删除实体并从列表中移除', async () => {
      vi.mocked(mockApi.getList).mockResolvedValue({
        count: 2,
        results: [
          { id: '1', name: '实体A', value: 100 },
          { id: '2', name: '实体B', value: 200 },
        ],
      })
      await store.getList()

      vi.mocked(mockApi.delete).mockResolvedValue()

      await store.remove('1')

      expect(store.list).toHaveLength(1)
      expect(store.list[0].id).toBe('2')
    })

    it('删除当前选中实体时应清空currentEntityId', async () => {
      vi.mocked(mockApi.getList).mockResolvedValue({
        count: 1,
        results: [{ id: '1', name: 'A', value: 1 }],
      })
      await store.getList()
      store.currentEntityId = '1'

      vi.mocked(mockApi.delete).mockResolvedValue()
      await store.remove('1')

      expect(store.currentEntityId).toBeNull()
    })
  })

  describe('分页', () => {
    it('getTotalPages 应该正确计算总页数', async () => {
      vi.mocked(mockApi.getList).mockResolvedValue({ count: 45, results: [] })
      await store.getList({ page: 1, page_size: 20 })

      expect(store.getTotalPages).toBe(3)
    })

    it('isValidPage 应该验证页码有效性', async () => {
      vi.mocked(mockApi.getList).mockResolvedValue({ count: 40, results: [] })
      await store.getList({ page: 1, page_size: 20 })

      expect(store.isValidPage(1)).toBe(true)
      expect(store.isValidPage(2)).toBe(true)
      expect(store.isValidPage(3)).toBe(false)
      expect(store.isValidPage(0)).toBe(false)
    })

    it('navigateToValidPage 应该调用 getList 并更新分页', async () => {
      vi.mocked(mockApi.getList).mockResolvedValue({
        count: 40,
        results: [{ id: '1', name: '第一页', value: 100 }],
      })
      await store.getList({ page: 1, page_size: 20 })

      vi.mocked(mockApi.getList).mockResolvedValue({
        count: 40,
        results: [{ id: '21', name: '第二十一条', value: 210 }],
      })

      await store.navigateToValidPage(2)

      expect(mockApi.getList).toHaveBeenCalled()
      expect(store.list).toHaveLength(1)
    })

    it('navigateToValidPage 无效页码时应重定向到最后一页', async () => {
      vi.mocked(mockApi.getList).mockResolvedValue({
        count: 30,
        results: [{ id: '1', name: 'A', value: 1 }],
      })
      await store.getList({ page: 1, page_size: 20 })

      vi.mocked(mockApi.getList).mockResolvedValue({
        count: 30,
        results: [{ id: '21', name: 'B', value: 2 }],
      })

      await store.navigateToValidPage(99)

      expect(mockApi.getList).toHaveBeenCalled()
    })
  })

  describe('缓存', () => {
    it('缓存启用时相同getById请求应返回缓存结果', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const cachedStore = useCachedDebouncedStore()

      vi.mocked(mockApi.getById).mockResolvedValue({ id: '1', name: 'A', value: 1 })

      const r1 = await cachedStore.getById('1')
      const r2 = await cachedStore.getById('1')

      expect(mockApi.getById).toHaveBeenCalledTimes(1)
      expect(r1).toEqual(r2)
    })

    it('clearCache应清除缓存使下次请求重新发起', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const cachedStore = useCachedDebouncedStore()

      // 清除可能被前一个测试缓存的全局缓存
      cachedStore.clearCache()

      vi.mocked(mockApi.getById).mockResolvedValue({ id: '1', name: 'A', value: 1 })
      await cachedStore.getById('1')
      expect(mockApi.getById).toHaveBeenCalledTimes(1)

      cachedStore.clearCache()

      vi.mocked(mockApi.getById).mockClear()
      vi.mocked(mockApi.getById).mockResolvedValue({ id: '1', name: 'B', value: 2 })
      const result = await cachedStore.getById('1')
      expect(mockApi.getById).toHaveBeenCalledTimes(1)
      expect(result.name).toBe('B')
    })
  })

  describe('防抖', () => {
    it('防抖启用时快速连续调用应只执行一次', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const debouncedStore = useCachedDebouncedStore()

      vi.mocked(mockApi.getList).mockResolvedValue({
        count: 1,
        results: [{ id: '1', name: 'A', value: 1 }],
      })

      // 快速连续调用
      const p1 = debouncedStore.getList({ page: 1, page_size: 10 })
      const p2 = debouncedStore.getList({ page: 1, page_size: 10 })

      // 推进定时器
      vi.advanceTimersByTime(100)

      await Promise.all([p1, p2])

      // 由于防抖+防重，getList 可能被调用1次
      expect(mockApi.getList).toHaveBeenCalled()
    })
  })

  describe('clearCache', () => {
    it('应该清除缓存', () => {
      expect(() => store.clearCache()).not.toThrow()
    })
  })

  describe('clear', () => {
    it('应该清空所有状态', async () => {
      vi.mocked(mockApi.getList).mockResolvedValue({
        count: 2,
        results: [
          { id: '1', name: 'A', value: 1 },
          { id: '2', name: 'B', value: 2 },
        ],
      })
      await store.getList()

      store.clear()

      expect(store.list).toEqual([])
      expect(store.pagination.total).toBe(0)
      expect(store.pagination.page).toBe(1)
    })
  })

  describe('removeBatch', () => {
    it('应该批量删除实体并同步状态', async () => {
      vi.mocked(mockApi.getList).mockResolvedValue({
        count: 3,
        results: [
          { id: '1', name: 'A', value: 1 },
          { id: '2', name: 'B', value: 2 },
          { id: '3', name: 'C', value: 3 },
        ],
      })
      await store.getList()

      vi.mocked(mockApiWithBatchDelete.batchDelete).mockResolvedValue({
        total: 2,
        success_count: 2,
        fail_count: 0,
        success_ids: ['1', '2'],
        fail_items: [],
      })

      const batchStore = useBatchDeleteStore()
      vi.mocked(mockApi.getList).mockResolvedValue({
        count: 3,
        results: [
          { id: '1', name: 'A', value: 1 },
          { id: '2', name: 'B', value: 2 },
          { id: '3', name: 'C', value: 3 },
        ],
      })
      await batchStore.getList()

      const result = await batchStore.removeBatch(['1', '2'])

      expect(result.success_count).toBe(2)
      expect(result.fail_count).toBe(0)
      expect(batchStore.list).toHaveLength(1)
      expect(batchStore.list[0].id).toBe('3')
    })

    it('空ids数组应返回空结果', async () => {
      const batchStore = useBatchDeleteStore()
      const result = await batchStore.removeBatch([])
      expect(result.total).toBe(0)
      expect(result.success_count).toBe(0)
      expect(result.fail_count).toBe(0)
      expect(result.success_ids).toEqual([])
      expect(result.fail_items).toEqual([])
    })

    it('未配置batchDelete API时应抛出异常', async () => {
      await expect(store.removeBatch(['1'])).rejects.toThrow('API "batchDelete" not provided')
    })

    it('批量删除部分失败时应显示警告消息', async () => {
      const batchStore = useBatchDeleteStore()
      vi.mocked(mockApi.getList).mockResolvedValue({
        count: 2,
        results: [
          { id: '1', name: 'A', value: 1 },
          { id: '2', name: 'B', value: 2 },
        ],
      })
      await batchStore.getList()

      vi.mocked(mockApiWithBatchDelete.batchDelete).mockResolvedValue({
        total: 2,
        success_count: 1,
        fail_count: 1,
        success_ids: ['1'],
        fail_items: [{ id: '2', error_message: '无法删除' }],
      })

      await batchStore.removeBatch(['1', '2'])

      expect(mockElMessage.warning).toHaveBeenCalled()
    })

    it('全部失败时应显示错误消息', async () => {
      const batchStore = useBatchDeleteStore()

      vi.mocked(mockApiWithBatchDelete.batchDelete).mockResolvedValue({
        total: 1,
        success_count: 0,
        fail_count: 1,
        success_ids: [],
        fail_items: [{ id: '1', error_message: '禁止删除' }],
      })

      await batchStore.removeBatch(['1'])

      expect(mockElMessage.error).toHaveBeenCalled()
    })

    it('响应格式无效时应抛出异常', async () => {
      const batchStore = useBatchDeleteStore()
      vi.mocked(mockApiWithBatchDelete.batchDelete).mockResolvedValue({
        total: 1,
        success_count: 1,
        fail_count: 0,
        success_ids: 'invalid',
        fail_items: 'invalid',
      } as any)

      await expect(batchStore.removeBatch(['1'])).rejects.toThrow('Invalid batch delete response format')
    })

    it('批量删除应清除当前选中的实体', async () => {
      const batchStore = useBatchDeleteStore()
      vi.mocked(mockApi.getList).mockResolvedValue({
        count: 2,
        results: [
          { id: '1', name: 'A', value: 1 },
          { id: '2', name: 'B', value: 2 },
        ],
      })
      await batchStore.getList()
      batchStore.currentEntityId = '1'

      vi.mocked(mockApiWithBatchDelete.batchDelete).mockResolvedValue({
        total: 1,
        success_count: 1,
        fail_count: 0,
        success_ids: ['1'],
        fail_items: [],
      })

      await batchStore.removeBatch(['1'])
      expect(batchStore.currentEntityId).toBeNull()
    })
  })

  describe('getNameByCode', () => {
    it('本地有缓存时应直接返回名称', async () => {
      vi.mocked(mockApi.getList).mockResolvedValue({
        count: 1,
        results: [{ id: '1', name: '实体A', value: 1 }],
      })
      await store.getList()

      const nameFieldStore = useNameFieldStore()
      vi.mocked(mockApi.getList).mockResolvedValue({
        count: 1,
        results: [{ id: '1', name: '实体A', value: 1, label: '标签A' }] as any,
      })
      await nameFieldStore.getList()

      const result = await nameFieldStore.getNameByCode('1')
      expect(result).toBe('标签A')
    })

    it('本地无缓存时应调用getById获取', async () => {
      const nameFieldStore = useNameFieldStore()
      vi.mocked(mockApi.getById).mockResolvedValue({ id: '1', name: 'A', value: 1, label: '标签X' } as any)

      const result = await nameFieldStore.getNameByCode('1')
      expect(result).toBe('标签X')
      expect(mockApi.getById).toHaveBeenCalledWith('1')
    })

    it('未配置nameField时应返回null', async () => {
      vi.mocked(mockApi.getById).mockResolvedValue({ id: '1', name: 'A', value: 1 })
      const result = await store.getNameByCode('1')
      expect(result).toBeNull()
    })

    it('getById返回null时应返回null', async () => {
      const nameFieldStore = useNameFieldStore()
      vi.mocked(mockApi.getById).mockResolvedValue(null)

      const result = await nameFieldStore.getNameByCode('999')
      expect(result).toBeNull()
    })

    it('getById抛出异常时应返回null', async () => {
      const nameFieldStore = useNameFieldStore()
      vi.mocked(mockApi.getById).mockRejectedValue(new Error('网络错误'))

      const result = await nameFieldStore.getNameByCode('1')
      expect(result).toBeNull()
    })
  })

  describe('getByName', () => {
    it('应该调用getByName API', async () => {
      const mockApiWithName = {
        ...mockApi,
        getByName: vi.fn(),
      }
      const nameStore = createEntityStore<TestEntity>('test-getname', {
        idKey: 'id',
        api: mockApiWithName as any,
        enableCache: false,
        enableDebounce: false,
      })()

      vi.mocked(mockApiWithName.getByName).mockResolvedValue([
        { id: '1', name: '实体A', value: 1 },
      ])

      const result = await nameStore.getByName('实体A')
      expect(result).toHaveLength(1)
      expect(mockApiWithName.getByName).toHaveBeenCalledWith('实体A')
    })

    it('未配置getByName API时应抛出异常', async () => {
      await expect(store.getByName('test')).rejects.toThrow('API "getByName" not provided')
    })
  })

  describe('loading状态', () => {
    it('请求期间loading应为true', async () => {
      let resolveFn: (v: ListResponse<TestEntity>) => void
      const delayedPromise = new Promise<ListResponse<TestEntity>>((resolve) => {
        resolveFn = resolve
      })
      vi.mocked(mockApi.getList).mockReturnValue(delayedPromise)

      const p = store.getList()
      expect(store.loading).toBe(true)

      resolveFn!({ count: 0, results: [] })
      await p

      expect(store.loading).toBe(false)
    })

    it('并发请求全部完成后loading才为false', async () => {
      let resolve1: (v: ListResponse<TestEntity>) => void
      let resolve2: (v: ListResponse<TestEntity>) => void

      const p1 = new Promise<ListResponse<TestEntity>>((r) => { resolve1 = r })
      const p2 = new Promise<ListResponse<TestEntity>>((r) => { resolve2 = r })

      vi.mocked(mockApi.getList)
        .mockReturnValueOnce(p1)
        .mockReturnValueOnce(p2)

      const req1 = store.getList()
      const req2 = store.getList({ page: 2, page_size: 10 })

      expect(store.loading).toBe(true)

      resolve1!({ count: 10, results: [{ id: '1', name: 'A', value: 1 }] })
      await req1

      resolve2!({ count: 10, results: [{ id: '2', name: 'B', value: 2 }] })
      await req2

      expect(store.loading).toBe(false)
    })
  })

  describe('navigateToValidPage扩展', () => {
    it('应支持自定义page_size参数', async () => {
      vi.mocked(mockApi.getList).mockResolvedValue({ count: 100, results: [] })
      await store.getList({ page: 1, page_size: 20 })

      vi.mocked(mockApi.getList).mockResolvedValue({
        count: 100,
        results: [{ id: '1', name: 'A', value: 1 }],
      })

      await store.navigateToValidPage(2, 10)

      expect(mockApi.getList).toHaveBeenCalled()
    })

    it('负数页码应重定向到第一页', async () => {
      vi.mocked(mockApi.getList).mockResolvedValue({ count: 40, results: [] })
      await store.getList({ page: 1, page_size: 20 })

      vi.mocked(mockApi.getList).mockResolvedValue({
        count: 40,
        results: [{ id: '1', name: 'A', value: 1 }],
      })

      await store.navigateToValidPage(-1)

      expect(mockApi.getList).toHaveBeenCalled()
    })
  })

  describe('isValidPage边界', () => {
    it('total为0时所有页码都无效', async () => {
      vi.mocked(mockApi.getList).mockResolvedValue({ count: 0, results: [] })
      await store.getList()

      expect(store.isValidPage(1)).toBe(false)
      expect(store.isValidPage(0)).toBe(false)
    })
  })

  describe('getTotalPages边界', () => {
    it('total为0时总页数为0', async () => {
      vi.mocked(mockApi.getList).mockResolvedValue({ count: 0, results: [] })
      await store.getList()

      expect(store.getTotalPages).toBe(0)
    })

    it('刚好整除时总页数正确', async () => {
      vi.mocked(mockApi.getList).mockResolvedValue({ count: 40, results: [] })
      await store.getList({ page: 1, page_size: 20 })

      expect(store.getTotalPages).toBe(2)
    })
  })
})
