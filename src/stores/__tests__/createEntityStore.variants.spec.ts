/**
 * @file createEntityStore 变异杀灭补测（D 批）
 * @module stores/__tests__/createEntityStore.variants
 * @description 针对 stryker 存活突变体的定向补充测试：默认配置语义（autoSync/refreshFlag/
 *   cacheTTL）、idToString 分支、getList 防重键唯一性、页码钳制、批量删除分页钳制与
 *   逐字段防御校验、批量删除三段文案精确断言、disableAutoMessage 抑制。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createEntityStore } from '../createEntityStore'
import type { ListResponse } from '../createEntityStore'

const { mockLogError, mockLogWarn } = vi.hoisted(() => ({
  mockLogError: vi.fn(),
  mockLogWarn: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logError: mockLogError,
  logWarn: mockLogWarn,
}))

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
  getByName: vi.fn<() => Promise<TestEntity[]>>(),
  create: vi.fn<() => Promise<TestEntity>>(),
  update: vi.fn<() => Promise<TestEntity>>(),
  delete: vi.fn<() => Promise<void>>(),
  batchDelete: vi.fn<() => Promise<unknown>>(),
})

const makeStore = <T extends object>(
  storeId: string,
  api: ReturnType<typeof makeApi>,
  extra: object = {},
) =>
  createEntityStore<T>(storeId, {
    idKey: 'id',
    api: api as never,
    message: mockElMessage as never,
    ...extra,
  })()

describe('createEntityStore 变异杀灭补测', () => {
  let api: ReturnType<typeof makeApi>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    api = makeApi()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    mockLogError.mockClear()
    mockLogWarn.mockClear()
  })

  describe('默认配置语义', () => {
    it('refreshFlag 应默认为 false', () => {
      const store = makeStore('var-refresh-default', api)
      expect(store.refreshFlag).toBe(false)
    })

    it('setRefreshFlag 应实际写入 refreshFlag', () => {
      const store = makeStore('var-refresh-set', api)
      store.setRefreshFlag(true)
      expect(store.refreshFlag).toBe(true)
    })

    it('默认 autoSync=true 时 create 应同步进入列表', async () => {
      const store = makeStore<TestEntity>('var-autosync-default', api)
      api.create.mockResolvedValue({ id: '1', name: 'A', value: 1 })
      await store.create({ name: 'A', value: 1 })
      expect(store.list).toHaveLength(1)
    })

    it('默认 cacheTTL 下翻转时间后 getById 仍应命中缓存', async () => {
      const store = makeStore<TestEntity>('var-ttl-default', api, {
        enableCache: true,
        enableDebounce: false,
      })
      api.getById.mockResolvedValueOnce({ id: '1', name: 'A', value: 1 })
      const first = await store.getById('1')
      expect(first?.name).toBe('A')

      await vi.advanceTimersByTimeAsync(60_000)

      api.getById.mockResolvedValueOnce({ id: '1', name: 'B', value: 2 })
      const second = await store.getById('1')
      expect(second?.name).toBe('A')
      expect(api.getById).toHaveBeenCalledTimes(1)
    })
  })

  describe('idToString 分支', () => {
    it('配置 idToString 时应以其结果作为存储键（同键碰撞去重）', async () => {
      const store = makeStore<TestEntity>('var-idstring', api, {
        idToString: () => 'single-key',
      })
      api.create
        .mockResolvedValueOnce({ id: '1', name: 'A', value: 1 })
        .mockResolvedValueOnce({ id: '2', name: 'B', value: 2 })
      await store.create({ name: 'A', value: 1 })
      await store.create({ name: 'B', value: 2 })
      expect(store.list).toHaveLength(1)
    })
  })

  describe('getList 防重键唯一性', () => {
    it('不同分页参数的并发请求不应互相复用 Promise', async () => {
      const store = makeStore<TestEntity>('var-key-distinct', api)
      let resolve1!: (v: ListResponse<TestEntity>) => void
      let resolve2!: (v: ListResponse<TestEntity>) => void
      const makeListPromise = (runtime: (v: ListResponse<TestEntity>) => void) =>
        new Promise<ListResponse<TestEntity>>((r) => runtime(r))
      api.getList
        .mockReturnValueOnce(makeListPromise((r) => (resolve1 = r)))
        .mockReturnValueOnce(makeListPromise((r) => (resolve2 = r)))

      const p1 = store.getList({ page: 1, page_size: 10 })
      const p2 = store.getList({ page: 2, page_size: 10 })

      expect(api.getList).toHaveBeenCalledTimes(2)

      resolve1!({ count: 2, results: [{ id: '1', name: 'A', value: 1 }] })
      resolve2!({ count: 2, results: [{ id: '2', name: 'B', value: 2 }] })
      await Promise.all([p1, p2])
    })

    it('无参与空对象请求应视为同一防重键', async () => {
      const store = makeStore<TestEntity>('var-key-same', api)
      let resolveFn!: (v: ListResponse<TestEntity>) => void
      api.getList.mockReturnValueOnce(
        new Promise<ListResponse<TestEntity>>((r) => (resolveFn = r)),
      )

      const p1 = store.getList()
      const p2 = store.getList({})

      resolveFn!({ count: 0, results: [] })
      await Promise.all([p1, p2])

      expect(api.getList).toHaveBeenCalledTimes(1)
    })
  })

  describe('页码钳制', () => {
    it('navigateToValidPage 超大页码应钳制到最后一页（getList 失败时可见钳制值）', async () => {
      const store = makeStore<TestEntity>('var-clamp-high', api)
      api.getList.mockResolvedValue({ count: 40, results: [] })
      await store.getList({ page: 1, page_size: 20 })
      expect(store.getTotalPages).toBe(2)

      api.getList.mockRejectedValueOnce(new Error('boom'))
      await expect(store.navigateToValidPage(99)).rejects.toThrow('boom')

      expect(store.pagination.page).toBe(2)
    })
  })

  describe('removeBatch 分页钳制与防御校验', () => {
    it('成功数大于当前 total 时 total 应钳制为 0', async () => {
      const store = makeStore<TestEntity>('var-batch-clamp', api, { displayName: '批量钳制' })
      api.getList.mockResolvedValue({
        count: 2,
        results: [
          { id: '1', name: 'A', value: 1 },
          { id: '2', name: 'B', value: 2 },
        ],
      })
      await store.getList()

      api.batchDelete.mockResolvedValue({
        total: 2,
        success_count: 5,
        fail_count: 0,
        success_ids: ['1', '2'],
        fail_items: [],
      })
      await store.removeBatch(['1', '2'])

      expect(store.pagination.total).toBe(0)
    })

    const invalidCases: Array<[string, unknown]> = [
      ['result 为 null', null],
      ['total 非数字', { total: 'x', success_count: 1, fail_count: 0, success_ids: [], fail_items: [] }],
      [
        'success_count 非数字',
        { total: 1, success_count: 'x', fail_count: 0, success_ids: [], fail_items: [] },
      ],
      ['fail_count 缺失', { total: 1, success_count: 1, success_ids: [], fail_items: [] }],
      ['success_ids 非数组', { total: 1, success_count: 1, fail_count: 0, success_ids: 'x', fail_items: [] }],
      ['fail_items 非数组', { total: 1, success_count: 1, fail_count: 0, success_ids: [], fail_items: 'x' }],
    ]

    invalidCases.forEach(([label, payload]) => {
      it(`响应格式无效时 ${label} 应抛出异常`, async () => {
        const store = makeStore<TestEntity>('var-batch-invalid', api)
        api.batchDelete.mockResolvedValue(payload)
        await expect(store.removeBatch(['1'])).rejects.toThrow(
          'Invalid batch delete response format',
        )
      })
    })
  })

  describe('removeBatch 消息文案精确断言', () => {
    it('全部成功时应输出成功文案', async () => {
      const store = makeStore<TestEntity>('var-msg-ok', api, { displayName: '批量实体' })
      api.batchDelete.mockResolvedValue({
        total: 2,
        success_count: 2,
        fail_count: 0,
        success_ids: ['1', '2'],
        fail_items: [],
      })
      await store.removeBatch(['1', '2'])
      expect(mockElMessage.success).toHaveBeenCalledWith('成功删除 2 条批量实体')
    })

    it('部分失败 3 条以内时应完整列出且不带省略计数', async () => {
      const store = makeStore<TestEntity>('var-msg-part3', api, { displayName: '批量实体' })
      api.batchDelete.mockResolvedValue({
        total: 4,
        success_count: 1,
        fail_count: 3,
        success_ids: ['1'],
        fail_items: [
          { id: '2', error_message: 'e2' },
          { id: '3', error_message: 'e3' },
          { id: '4', error_message: 'e4' },
        ],
      })
      await store.removeBatch(['1', '2', '3', '4'])
      expect(mockElMessage.warning).toHaveBeenCalledWith(
        '成功删除 1 条，3 条失败（2: e2; 3: e3; 4: e4）',
      )
    })

    it('部分失败超过 3 条时应追加省略计数（fail_count=3 边界不带后缀）', async () => {
      const store = makeStore<TestEntity>('var-msg-part4', api, { displayName: '批量实体' })
      api.batchDelete.mockResolvedValue({
        total: 5,
        success_count: 1,
        fail_count: 4,
        success_ids: ['1'],
        fail_items: [
          { id: '2', error_message: 'e2' },
          { id: '3', error_message: 'e3' },
          { id: '4', error_message: 'e4' },
          { id: '5', error_message: 'e5' },
        ],
      })
      await store.removeBatch(['1', '2', '3', '4', '5'])
      expect(mockElMessage.warning).toHaveBeenCalledWith('成功删除 1 条，4 条失败（2: e2; 3: e3; 4: e4 等4条）')
    })

    it('全部失败时应输出错误文案', async () => {
      const store = makeStore<TestEntity>('var-msg-fail', api, { displayName: '批量实体' })
      api.batchDelete.mockResolvedValue({
        total: 1,
        success_count: 0,
        fail_count: 1,
        success_ids: [],
        fail_items: [{ id: '1', error_message: '禁止删除' }],
      })
      await store.removeBatch(['1'])
      expect(mockElMessage.error).toHaveBeenCalledWith('删除失败：1: 禁止删除')
    })
  })

  describe('disableAutoMessage 抑制', () => {
    it('disableAutoMessage=true 时 create 不应弹成功提示', async () => {
      const store = makeStore<TestEntity>('var-no-msg', api, {
        displayName: '静默实体',
        disableAutoMessage: true,
        message: mockElMessage as never,
      })
      api.create.mockResolvedValue({ id: '1', name: 'A', value: 1 })
      await store.create({ name: 'A', value: 1 })
      expect(mockElMessage.success).not.toHaveBeenCalled()
    })
  })

  describe('第二轮：缓存/防重/日志/名称查询', () => {
    it('默认 enableCache=true 时重复 getById 应命中缓存仅调用一次', async () => {
      const store = makeStore<TestEntity>('var-cache-default', api)
      api.getById.mockResolvedValue({ id: '1', name: 'A', value: 1 })
      await store.getById('1')
      await store.getById('1')
      expect(api.getById).toHaveBeenCalledTimes(1)
    })

    it('请求超出有效页时应清空列表并给出精确告警日志', async () => {
      const store = makeStore<TestEntity>('var-log', api)
      api.getList.mockResolvedValue({ count: 40, results: [{ id: '1', name: 'A', value: 1 }] })
      const result = await store.getList({ page: 99, page_size: 20 })
      expect(result).toEqual([])
      expect(store.list).toHaveLength(0)
      expect(store.pagination).toMatchObject({ total: 40, page: 2 })
      expect(mockLogWarn).toHaveBeenCalledWith(
        'stores/createEntityStore',
        '[var-log] Invalid page: 99, total pages: 2, count: 40',
      )
    })

    it('count 为 0 时请求无效页不应进入钳制分支', async () => {
      const store = makeStore<TestEntity>('var-zero-count', api)
      api.getList.mockResolvedValue({ count: 0, results: [] })
      await store.getList({ page: 5, page_size: 20 })
      expect(store.pagination.page).toBe(5)
    })

    it('后端返回重复 id 时列表应去重', async () => {
      const store = makeStore<TestEntity>('var-dupe-list', api)
      api.getList.mockResolvedValue({
        count: 2,
        results: [
          { id: '1', name: 'A', value: 1 },
          { id: '1', name: 'A', value: 1 },
        ],
      })
      await store.getList()
      expect(store.list).toHaveLength(1)
    })

    it('getList 两次相同参数应分别请求（分页不缓存）', async () => {
      const store = makeStore<TestEntity>('var-list-no-cache', api)
      api.getList.mockResolvedValue({ count: 1, results: [{ id: '1', name: 'A', value: 1 }] })
      await store.getList({ page: 1 })
      await store.getList({ page: 1 })
      expect(api.getList).toHaveBeenCalledTimes(2)
    })

    it('enablePagination=false 时 getTotalPages 应为 0', async () => {
      const store = makeStore<TestEntity>('var-no-pag', api, { enablePagination: false })
      api.getList.mockResolvedValue({ count: 40, results: [] })
      await store.getList()
      expect(store.getTotalPages).toBe(0)
    })

    it('enablePagination=true 时 getTotalPages 应按总数计算', async () => {
      const store = makeStore<TestEntity>('var-pag', api)
      api.getList.mockResolvedValue({ count: 40, results: [] })
      await store.getList()
      expect(store.getTotalPages).toBe(2)
    })

    it('不同实体 getById 并发请求应各自执行', async () => {
      const store = makeStore<TestEntity>('var-get-distinct', api)
      api.getById
        .mockResolvedValueOnce({ id: '1', name: 'A', value: 1 })
        .mockResolvedValueOnce({ id: '2', name: 'B', value: 2 })
      const [a, b] = await Promise.all([store.getById('1'), store.getById('2')])
      expect(api.getById).toHaveBeenCalledTimes(2)
      expect(a?.name).toBe('A')
      expect(b?.name).toBe('B')
    })

    it('enableCache=false 时重复 getById 不应重复收录 id', async () => {
      const store = makeStore<TestEntity>('var-no-cache-push', api, { enableCache: false })
      api.getById.mockResolvedValue({ id: '1', name: 'A', value: 1 })
      await store.getById('1')
      await store.getById('1')
      expect(store.list).toHaveLength(1)
    })
  })

  describe('第二轮：名称查询与日志', () => {
    it('未配置 nameField 时应告警并返回 null', async () => {
      const store = makeStore<TestEntity>('var-name-nofield', api)
      await expect(store.getNameByCode('c1')).resolves.toBeNull()
      expect(mockLogWarn).toHaveBeenCalledWith(
        'stores/createEntityStore',
        '"nameField" not configured for store "var-name-nofield"',
      )
    })

    it('本地缓存命中时应直接返回名称', async () => {
      const store = makeStore<TestEntity>('var-name-cached', api, { nameField: 'name' })
      api.getById.mockResolvedValue({ id: 'c1', name: '从缓存来', value: 1 })
      await store.getById('c1')
      await expect(store.getNameByCode('c1')).resolves.toBe('从缓存来')
      expect(api.getById).toHaveBeenCalledTimes(1)
    })

    it('本地未命中时应回源 getById 获取名称', async () => {
      const store = makeStore<TestEntity>('var-name-fetch', api, { nameField: 'name' })
      api.getById.mockResolvedValue({ id: 'c1', name: '回源名', value: 1 })
      await expect(store.getNameByCode('c1')).resolves.toBe('回源名')
      expect(api.getById).toHaveBeenCalledTimes(1)
    })

    it('getById 返回 null 时名称查询应返回 null', async () => {
      const store = makeStore<TestEntity>('var-name-null', api, { nameField: 'name' })
      api.getById.mockResolvedValue(null)
      await expect(store.getNameByCode('c1')).resolves.toBeNull()
    })

    it('getById 抛出异常时应记录错误并返回 null', async () => {
      const store = makeStore<TestEntity>('var-name-error', api, { nameField: 'name' })
      api.getById.mockRejectedValueOnce(new Error('net'))
      await expect(store.getNameByCode('c1')).resolves.toBeNull()
      expect(mockLogError).toHaveBeenCalledWith(
        'stores/createEntityStore',
        'Failed to fetch entity by code "c1" for name lookup',
        expect.any(Error),
      )
    })

    it('getByName 不同名称并发请求应各自执行', async () => {
      const store = makeStore<TestEntity>('var-nb-distinct', api)
      api.getByName
        .mockResolvedValueOnce([{ id: '1', name: 'A', value: 1 }])
        .mockResolvedValueOnce([{ id: '2', name: 'B', value: 2 }])
      const [a, b] = await Promise.all([store.getByName('a'), store.getByName('b')])
      expect(api.getByName).toHaveBeenCalledTimes(2)
      expect(a).toHaveLength(1)
      expect(b).toHaveLength(1)
    })

    it('getByName 相同名称两次应命中缓存仅调用一次', async () => {
      const store = makeStore<TestEntity>('var-nb-cache', api)
      api.getByName.mockResolvedValue([{ id: '1', name: 'A', value: 1 }])
      await store.getByName('x')
      await store.getByName('x')
      expect(api.getByName).toHaveBeenCalledTimes(1)
    })
  })

  describe('第二轮：更新/删除互斥键与消息', () => {
    it('不同实体并发 update 应各自执行', async () => {
      const store = makeStore<TestEntity>('var-upd-distinct', api)
      api.update
        .mockResolvedValueOnce({ id: '1', name: 'A1', value: 1 })
        .mockResolvedValueOnce({ id: '2', name: 'B1', value: 2 })
      await Promise.all([store.update({ id: '1' }), store.update({ id: '2' })])
      expect(api.update).toHaveBeenCalledTimes(2)
    })

    it('不同实体并发 remove 应各自执行', async () => {
      const store = makeStore<TestEntity>('var-del-distinct', api)
      api.delete.mockResolvedValue(undefined)
      await Promise.all([store.remove('1'), store.remove('2')])
      expect(api.delete).toHaveBeenCalledTimes(2)
    })

    it('remove 应清除列表项与 currentEntityId', async () => {
      const store = makeStore<TestEntity>('var-del-state', api)
      api.getList.mockResolvedValue({
        count: 2,
        results: [
          { id: '1', name: 'A', value: 1 },
          { id: '2', name: 'B', value: 2 },
        ],
      })
      await store.getList()
      store.currentEntityId = '1'
      await store.remove('1')
      expect(store.list).toHaveLength(1)
      expect(store.currentEntityId).toBeNull()
    })

    it('create 应输出精确成功提示', async () => {
      const store = makeStore<TestEntity>('var-toast-create', api, { displayName: '精确实体' })
      api.create.mockResolvedValue({ id: '1', name: 'A', value: 1 })
      await store.create({ name: 'A', value: 1 })
      expect(mockElMessage.success).toHaveBeenCalledWith('精确实体创建成功')
    })

    it('update 应输出精确成功提示', async () => {
      const store = makeStore<TestEntity>('var-toast-update', api, { displayName: '精确实体' })
      api.update.mockResolvedValue({ id: '1', name: 'A', value: 1 })
      await store.update({ id: '1' })
      expect(mockElMessage.success).toHaveBeenCalledWith('精确实体更新成功')
    })

    it('remove 应输出精确成功提示', async () => {
      const store = makeStore<TestEntity>('var-toast-remove', api, { displayName: '精确实体' })
      api.delete.mockResolvedValue(undefined)
      await store.remove('1')
      expect(mockElMessage.success).toHaveBeenCalledWith('精确实体删除成功')
    })

    it('removeBatch 应清除 currentEntityId', async () => {
      const store = makeStore<TestEntity>('var-batch-ce', api)
      api.getList.mockResolvedValue({
        count: 2,
        results: [
          { id: '1', name: 'A', value: 1 },
          { id: '2', name: 'B', value: 2 },
        ],
      })
      await store.getList()
      store.currentEntityId = '1'
      api.batchDelete.mockResolvedValue({
        total: 2,
        success_count: 1,
        fail_count: 0,
        success_ids: ['1'],
        fail_items: [],
      })
      await store.removeBatch(['1'])
      expect(store.currentEntityId).toBeNull()
    })
  })
})