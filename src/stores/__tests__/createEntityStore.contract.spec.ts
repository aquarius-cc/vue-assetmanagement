/**
 * @file createEntityStore P2 批次 A 契约修复回归测试（先红后绿）
 * @module stores/__tests__/createEntityStore.contract
 * @description 覆盖五条契约缺陷的回归锁：
 *   M-15 remove 后 pagination.total 同步递减
 *   M-16 seq 过期返回 undefined（非 []），视图可判空
 *   M-18 超界页自动以修正页码补发一次 getList（非空表）
 *   M-20 getById 不污染 ids（仅写 entities 映射）
 *   M-21 create 后 pagination.total 同步递增
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
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

const makeApi = () => ({
  getList: vi.fn<() => Promise<ListResponse<TestEntity>>>(),
  getById: vi.fn<() => Promise<TestEntity | null>>(),
  create: vi.fn<() => Promise<TestEntity | TestEntity[]>>(),
  update: vi.fn<() => Promise<TestEntity>>(),
  delete: vi.fn<() => Promise<void>>(),
  batchDelete: vi.fn(),
})

const makeStore = (storeId: string, api: ReturnType<typeof makeApi>, extra: object = {}) =>
  createEntityStore<TestEntity>(storeId, {
    idKey: 'id',
    displayName: '契约测试',
    api: api as never,
    message: mockElMessage as never,
    enableCache: false,
    enableDebounce: false,
    ...extra,
  })()

describe('createEntityStore 批次 A 契约修复', () => {
  let api: ReturnType<typeof makeApi>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    api = makeApi()
  })

  // ===== M-15：remove 后 total 递减 =====
  describe('M-15 remove 同步递减 pagination.total', () => {
    it('删除成功后 total 应减 1', async () => {
      const store = makeStore('m15-remove-total', api)
      api.getList.mockResolvedValue({
        count: 3,
        results: [
          { id: '1', name: 'A', value: 1 },
          { id: '2', name: 'B', value: 2 },
          { id: '3', name: 'C', value: 3 },
        ],
      })
      await store.getList()
      expect(store.pagination.total).toBe(3)

      api.delete.mockResolvedValue()
      await store.remove('1')

      expect(store.pagination.total).toBe(2)
      expect(store.list).toHaveLength(2)
    })

    it('删除不存在于本地列表的实体时 total 不应变为负数', async () => {
      const store = makeStore('m15-remove-neg', api)
      api.getList.mockResolvedValue({
        count: 1,
        results: [{ id: '1', name: 'A', value: 1 }],
      })
      await store.getList()
      expect(store.pagination.total).toBe(1)

      api.delete.mockResolvedValue()
      await store.remove('ghost')

      expect(store.pagination.total).toBe(1)
    })
  })

  // ===== M-16：seq 过期返回 undefined =====
  describe('M-16 seq 过期返回 undefined（非 []）', () => {
    const deferred = <T>() => {
      let resolve!: (v: T) => void
      let reject!: (e: unknown) => void
      const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
      })
      return { promise, resolve, reject }
    }

    it('慢响应过期时应返回 undefined 而非 []', async () => {
      const store = makeStore('m16-stale-undefined', api)
      const slow = deferred<ListResponse<TestEntity>>()
      const fast = deferred<ListResponse<TestEntity>>()

      api.getList.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)
      const promiseA = store.getList({ page: 1, page_size: 20 })
      const promiseB = store.getList({ page: 2, page_size: 20 })

      fast.resolve({
        count: 40,
        page: 2,
        page_size: 20,
        results: [{ id: '3', name: 'C', value: 3 }],
      })
      const resultB = await promiseB
      expect(resultB).toEqual([{ id: '3', name: 'C', value: 3 }])

      slow.resolve({
        count: 40,
        page: 1,
        page_size: 20,
        results: [{ id: '1', name: 'A', value: 1 }],
      })
      const resultA = await promiseA

      // M-16 契约：seq 过期返回 undefined（视图可判空），不再返回 [] 被误当权威镜像
      expect(resultA).toBeUndefined()
      expect(store.list).toEqual([{ id: '3', name: 'C', value: 3 }])
    })
  })

  // ===== M-18：超界页自动补发 =====
  describe('M-18 超界页以修正页码补发一次 getList', () => {
    it('请求超出末页时应自动以末页页码补发并返回数据（非空表）', async () => {
      const store = makeStore('m18-refetch', api)

      // 第一次请求 page=5，后端返回 count=40 → totalPages=2（page 5 超界）
      // 修正后应以 page=2 补发，后端返回 page=2 的数据
      api.getList
        .mockResolvedValueOnce({
          count: 40,
          page: 5,
          page_size: 20,
          results: [],
        })
        .mockResolvedValueOnce({
          count: 40,
          page: 2,
          page_size: 20,
          results: [
            { id: '3', name: 'C', value: 3 },
            { id: '4', name: 'D', value: 4 },
          ],
        })

      const result = await store.getList({ page: 5, page_size: 20 })

      // 应补发一次（共 2 次调用）
      expect(api.getList).toHaveBeenCalledTimes(2)
      // 补发参数应为修正后的末页
      expect(api.getList).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 2 }))
      // 返回修正页的数据而非空数组
      expect(result).toHaveLength(2)
      expect(store.list).toHaveLength(2)
      expect(store.pagination.page).toBe(2)
      expect(store.pagination.total).toBe(40)
    })

    it('silent 超界页请求应零副作用返回 []（不触发补发）', async () => {
      const store = makeStore('m18-silent-nofetch', api)
      api.getList.mockResolvedValue({ count: 20, results: [] })

      const result = await store.getList({ page: 10, page_size: 20 }, { silent: true })

      expect(api.getList).toHaveBeenCalledTimes(1)
      expect(result).toEqual([])
      expect(store.list).toEqual([])
      expect(store.pagination.page).toBe(1)
    })
  })

  // ===== M-20：getById 不污染 ids =====
  describe('M-20 getById 不污染 ids', () => {
    it('getById 获取非当前页实体时不应写入 ids', async () => {
      const store = makeStore('m20-nopollute', api)

      // 先加载第一页（2 条）
      api.getList.mockResolvedValue({
        count: 25,
        page: 1,
        page_size: 20,
        results: [
          { id: '1', name: 'A', value: 1 },
          { id: '2', name: 'B', value: 2 },
        ],
      })
      await store.getList({ page: 1, page_size: 20 })
      expect(store.list).toHaveLength(2)

      // getById 获取不在当前页的实体 id=99
      api.getById.mockResolvedValue({ id: '99', name: '详情99', value: 99 })
      const detail = await store.getById('99')

      // 详情应正常返回并写入 entities 映射
      expect(detail).toEqual({ id: '99', name: '详情99', value: 99 })
      // 但不应污染 ids（列表不出现第 3 行）
      expect(store.list).toHaveLength(2)
      expect(store.list.map((e) => e.id)).toEqual(['1', '2'])
    })

    it('getById 获取当前页已存在实体时行为不变', async () => {
      const store = makeStore('m20-existing', api)
      api.getList.mockResolvedValue({
        count: 2,
        results: [
          { id: '1', name: 'A', value: 1 },
          { id: '2', name: 'B', value: 2 },
        ],
      })
      await store.getList()

      api.getById.mockResolvedValue({ id: '1', name: 'A-updated', value: 10 })
      const detail = await store.getById('1')

      expect(detail?.name).toBe('A-updated')
      expect(store.list).toHaveLength(2)
      // entities 映射已更新
      expect(store.currentEntityId).toBeNull()
    })
  })

  // ===== M-21：create 后 total 递增 =====
  describe('M-21 create 同步递增 pagination.total', () => {
    it('单条创建后 total 应加 1', async () => {
      const store = makeStore('m21-create-total', api)
      api.getList.mockResolvedValue({
        count: 5,
        results: [
          { id: '1', name: 'A', value: 1 },
          { id: '2', name: 'B', value: 2 },
        ],
      })
      await store.getList()
      expect(store.pagination.total).toBe(5)

      api.create.mockResolvedValue({ id: '3', name: '新', value: 3 })
      await store.create({ name: '新', value: 3 })

      expect(store.pagination.total).toBe(6)
      expect(store.list).toHaveLength(3)
    })

    it('数组创建（多条返回）后 total 应加条数', async () => {
      const store = makeStore('m21-create-array', api)
      api.getList.mockResolvedValue({
        count: 2,
        results: [{ id: '1', name: 'A', value: 1 }],
      })
      await store.getList()
      expect(store.pagination.total).toBe(2)

      api.create.mockResolvedValue([
        { id: '2', name: 'B', value: 2 },
        { id: '3', name: 'C', value: 3 },
      ])
      await store.create({ name: 'B', value: 2 })

      expect(store.pagination.total).toBe(4)
      expect(store.list).toHaveLength(3)
    })
  })
})
