/**
 * @file T16 变异补杀回归套件（BF-138 批次 F，先红后绿体系的组成）
 * @module stores/__tests__/createEntityStore.t16
 * @description 每个用例锚定 reports/mutation/mutation.json 中曾以 Survived 状态存活的
 *   至少一个变异体的行为分支（CT-4 回归屏障，均为当前真实代码下的行为锁）：
 *   - [208:52] silent 编入 key：与 list 同 params 并发走独立通道（不被去重吞并）
 *   - [241:17] 超界兜底 handleInvalidPage 生效：补发失败也保持页码/实体一致状态
 *   - [271:32] enablePagination=false 时 getTotalPages 恒 0（不计算 ceil）
 *   - [325:27] getNameByCode 本地缓存两分支：缺失回源 / 实体缺字段也回源（不误返回 undefined 串）
 *   - [333:11/334:11] getById 缺失时 logWarn 模块与文案精确锚定
 *   - [341:13/23] getNameByCode null/缺字段双分支返回 null（不崩溃、不输出 "undefined"）
 *   - [373:45] create 并发（跨毫秒）各走独立 key（Date.now 键不被同键去重吞并）
 *   - [404:13/417:13/515:15] autoSync=false 时 update/remove/removeBatch 不改写本地状态
 *   - [422:15/463:13] 误删他人 currentEntityId 不成立（非命中不清空选中）
 *   - [488:9/490:9/494:9] message 缺省时批量删除三档提示 null 安全（裸 message.x 变异体抛错）
 *   - [510:9/510:33] batchDelete 并发 key 隔离（不同 id 集合不互撞去重）
 *   - [524:22] batchDelete 结果不缓存（相同 ids 两次 = 2 次 API）
 *   - [529:7] clearCache 后 getById 回源（缓存被真正清空）
 *   - [530:7] clearCache 在途期间抹 pending 标记（后续同键不复用在途 Promise）
 *   - [536:61] clear() 将 loading 归零（在途请求期间执行）
 * 等价体（未纳入本套件，已在 BF-138 登记说明）：208:64 / 265:9 / 265:22 / 271:32（右操作数
 *   与 ceil(total/size) 在 total=0 处同值）/ 71:24 / 221:48 / 454:14 / 524:9 /
 *   392:11 / 409:9 / 429:9（仅移除第二段 ?. 的同型短路）/ 531:27 / 532:7（debounceMap
 *   恒空：createEntityStore 从不传 debounced:true）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createEntityStore } from '../createEntityStore'
import type { ListResponse } from '../createEntityStore'

const { logWarnMock, logErrorMock } = vi.hoisted(() => ({
  logWarnMock: vi.fn(),
  logErrorMock: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logWarn: logWarnMock,
  logError: logErrorMock,
  logInfo: vi.fn(),
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

interface BatchResult {
  total: number
  success_count: number
  fail_count: number
  success_ids: (string | number)[]
  fail_items: { id: string; error_message: string }[]
}

const makeApi = () => ({
  getList: vi.fn<() => Promise<ListResponse<TestEntity>>>(),
  getById: vi.fn<() => Promise<TestEntity | null>>(),
  create: vi.fn<() => Promise<TestEntity | TestEntity[]>>(),
  update: vi.fn<() => Promise<TestEntity>>(),
  delete: vi.fn<() => Promise<void>>(),
  batchDelete: vi.fn<() => Promise<BatchResult>>(),
})

const makeStore = (storeId: string, api: ReturnType<typeof makeApi>, extra: object = {}) =>
  createEntityStore<TestEntity>(storeId, {
    idKey: 'id',
    displayName: 'T16测试',
    api: api as never,
    message: mockElMessage as never,
    enableCache: false,
    enableDebounce: false,
    ...extra,
  })()

const deferred = <T>() => {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const entity = (id: string, name: string): TestEntity => ({ id, name, value: 1 })

const seedList = async (api: ReturnType<typeof makeApi>, store: ReturnType<typeof makeStore>) => {
  api.getList.mockResolvedValueOnce({
    count: 2,
    page: 1,
    page_size: 20,
    results: [entity('1', 'A'), entity('2', 'B')],
  })
  await store.getList()
  expect(store.list).toHaveLength(2)
}

const batchOk = (successIds: string[]): BatchResult => ({
  total: successIds.length,
  success_count: successIds.length,
  fail_count: 0,
  success_ids: successIds,
  fail_items: [],
})

describe('createEntityStore T16 变异补杀（BF-138 批次 F）', () => {
  let api: ReturnType<typeof makeApi>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    api = makeApi()
  })

  // ===== getList 请求控制 =====
  describe('getList 请求控制', () => {
    it('[208:52] silent 与 list 同 params 并发：各走独立通道，互不去重吞并', async () => {
      const store = makeStore('t16-silent-key', api)
      const listD = deferred<ListResponse<TestEntity>>()
      const silentD = deferred<ListResponse<TestEntity>>()
      api.getList.mockReturnValueOnce(listD.promise).mockReturnValueOnce(silentD.promise)

      const listP = store.getList({ page: 1, page_size: 20 })
      const silentP = store.getList({ page: 1, page_size: 20 }, { silent: true })

      silentD.resolve({ count: 5, page: 1, page_size: 20, results: [entity('s', 'S')] })
      listD.resolve({ count: 9, page: 1, page_size: 20, results: [entity('l', 'L')] })

      const silentR = await silentP
      const listR = await listP

      expect(silentR).toEqual([entity('s', 'S')])
      expect(listR).toEqual([entity('l', 'L')])
      expect(api.getList).toHaveBeenCalledTimes(2)
    })

    it('[241:17] 超界页补发失败：handleInvalidPage 已清空实体并修正页码（失败也保持一致状态）', async () => {
      const store = makeStore('t16-invalid-page', api)
      api.getList
        .mockResolvedValueOnce({
          count: 2,
          page: 1,
          page_size: 20,
          results: [entity('1', 'A'), entity('2', 'B')],
        })
        .mockResolvedValueOnce({ count: 40, page: 5, page_size: 20, results: [entity('9', 'X')] })
        .mockRejectedValueOnce(new Error('refetch boom'))

      await store.getList({ page: 1, page_size: 20 })
      expect(store.list).toHaveLength(2)

      await expect(store.getList({ page: 5, page_size: 20 })).rejects.toThrow('refetch boom')

      expect(store.list).toHaveLength(0)
      expect(store.pagination.page).toBe(2)
      expect(store.pagination.total).toBe(40)
    })

    it('[271:32] enablePagination=false 时 getTotalPages 恒 0（不计算 ceil）', async () => {
      const store = makeStore('t16-no-pagination', api, { enablePagination: false })
      api.getList.mockResolvedValue({ count: 40, page: 1, page_size: 20, results: [] })

      await store.getList()

      expect(store.getTotalPages).toBe(0)
    })
  })

  // ===== getNameByCode 分支 =====
  describe('getNameByCode 分支', () => {
    it('[325:27] 本地实体缺失时回源 getById（不误读 undefined 字段）', async () => {
      const store = makeStore('t16-name-cache-miss', api, { nameField: 'name' })
      api.getById.mockResolvedValue(entity('x', 'X'))

      const result = await store.getNameByCode('x')

      expect(result).toBe('X')
      expect(api.getById).toHaveBeenCalledTimes(1)
    })

    it('[325:27] 本地实体缺 nameField 字段：回源 getById 而非误返回 undefined 字符串', async () => {
      const store = makeStore('t16-name-cached-no-field', api, { nameField: 'name' })
      // 预载无 name 字段的实体：&& 右操作数在此为 false（短路覆盖不到右操作数的用例判不出此位）
      api.getList.mockResolvedValueOnce({
        count: 1,
        page: 1,
        page_size: 20,
        results: [{ id: 'x' } as TestEntity],
      })
      await store.getList()
      api.getById.mockResolvedValue(entity('x', 'X'))

      const result = await store.getNameByCode('x')

      expect(result).toBe('X')
      expect(api.getById).toHaveBeenCalledTimes(1)
    })

    it('[333:11/334:11] getById 未配置：logWarn 模块与文案精确锚定', async () => {
      const apiNoGet = { ...api, getById: undefined } as unknown as ReturnType<typeof makeApi>
      const store = makeStore('t16-name-no-get', apiNoGet, { nameField: 'name' })

      const result = await store.getNameByCode('x')

      expect(result).toBeNull()
      expect(logWarnMock).toHaveBeenCalledWith(
        'stores/createEntityStore',
        expect.stringContaining('"getById" API not provided'),
      )
    })

    it('[341:13] getById 返回 null：getNameByCode 返回 null（不崩溃、不误转字符串）', async () => {
      const store = makeStore('t16-name-null', api, { nameField: 'name' })
      api.getById.mockResolvedValue(null)

      const result = await store.getNameByCode('missing')

      expect(result).toBeNull()
    })

    it('[341:23] 实体缺 nameField 字段：返回 null（不输出 "undefined" 字符串）', async () => {
      const store = makeStore('t16-name-no-field', api, { nameField: 'name' })
      api.getById.mockResolvedValue({ id: 'x' } as TestEntity)

      const result = await store.getNameByCode('x')

      expect(result).toBeNull()
    })
  })

  // ===== autoSync 隔离与状态保护 =====
  describe('autoSync 隔离与状态保护', () => {
    it('[404:13] autoSync=false：update 不改写本地实体', async () => {
      const store = makeStore('t16-update-nosync', api, { autoSync: false })
      store.currentEntityId = '1'
      api.update.mockResolvedValue({ id: '1', name: 'updated', value: 2 })

      await store.update({ id: '1', name: 'updated' })

      // autoSync=false 全程不写本地状态：实体仍缺失 → currentEntity 为 null
      expect(store.currentEntity).toBeNull()
    })

    it('[417:13] autoSync=false：remove 不进入修剪分支（选中态保持）', async () => {
      const store = makeStore('t16-remove-nosync', api, { autoSync: false })
      store.currentEntityId = '1'
      api.delete.mockResolvedValue(undefined)

      await store.remove('1')

      expect(store.currentEntityId).toBe('1')
    })

    it('[422:15] remove 非当前选中 id：currentEntityId 保持不动', async () => {
      const store = makeStore('t16-remove-keep-current', api)
      await seedList(api, store)
      store.currentEntityId = '2'
      api.delete.mockResolvedValue(undefined)

      await store.remove('1')

      expect(store.currentEntityId).toBe('2')
    })

    it('[463:13] batchDelete 未命中选中 id：currentEntityId 保持不动', async () => {
      const store = makeStore('t16-batch-keep-current', api)
      await seedList(api, store)
      store.currentEntityId = '2'
      api.batchDelete.mockResolvedValue(batchOk(['1']))

      await store.removeBatch(['1'])

      expect(store.currentEntityId).toBe('2')
    })

    it('[515:15] autoSync=false：removeBatch 不进入 prune 分支（选中态保持）', async () => {
      const store = makeStore('t16-batch-nosync', api, { autoSync: false })
      store.currentEntityId = '1'
      api.batchDelete.mockResolvedValue(batchOk(['1']))

      await store.removeBatch(['1'])

      expect(store.currentEntityId).toBe('1')
    })
  })

  // ===== message null 安全 =====
  describe('message 缺省 null 安全（批量删除三档提示）', () => {
    it('[488:9] message 缺省 + 全成功批量删除：不抛错（裸 message.success 变异体抛 TypeError）', async () => {
      const store = makeStore('t16-msg-none-success', api, { message: undefined })
      api.batchDelete.mockResolvedValue(batchOk(['1']))

      await expect(store.removeBatch(['1'])).resolves.toBeTruthy()
    })

    it('[490:9] message 缺省 + 部分失败批量删除：warning 路径不抛错', async () => {
      const store = makeStore('t16-msg-none-warning', api, { message: undefined })
      api.batchDelete.mockResolvedValue({
        total: 2,
        success_count: 1,
        fail_count: 1,
        success_ids: ['1'],
        fail_items: [{ id: '2', error_message: 'boom' }],
      })

      await expect(store.removeBatch(['1', '2'])).resolves.toBeTruthy()
    })

    it('[494:9] message 缺省 + 全失败批量删除：error 路径不抛错', async () => {
      const store = makeStore('t16-msg-none-error', api, { message: undefined })
      api.batchDelete.mockResolvedValue({
        total: 2,
        success_count: 0,
        fail_count: 2,
        success_ids: [],
        fail_items: [
          { id: '1', error_message: 'a' },
          { id: '2', error_message: 'b' },
        ],
      })

      await expect(store.removeBatch(['1', '2'])).resolves.toBeTruthy()
    })
  })

  // ===== batchDelete key / 缓存 / 清理 =====
  describe('batchDelete key 隔离与缓存清理', () => {
    it('[510:9] batchDelete 并发不同 ids：各走独立通道（2 次 API）', async () => {
      const store = makeStore('t16-batch-concurrent', api)
      const d1 = deferred<BatchResult>()
      const d2 = deferred<BatchResult>()
      api.batchDelete.mockReturnValueOnce(d1.promise).mockReturnValueOnce(d2.promise)

      const p1 = store.removeBatch(['a'])
      const p2 = store.removeBatch(['b'])
      d1.resolve(batchOk(['a']))
      d2.resolve(batchOk(['b']))
      await Promise.all([p1, p2])

      expect(api.batchDelete).toHaveBeenCalledTimes(2)
    })

    it('[510:33] 多 id 拼接与单 id 字面量不互撞（多 id 组 与 拼接单 id 并发 = 2 次 API）', async () => {
      const store = makeStore('t16-batch-join', api)
      const d1 = deferred<BatchResult>()
      const d2 = deferred<BatchResult>()
      api.batchDelete.mockReturnValueOnce(d1.promise).mockReturnValueOnce(d2.promise)

      const p1 = store.removeBatch(['a', 'b'])
      const p2 = store.removeBatch(['ab'])
      d1.resolve(batchOk(['a', 'b']))
      d2.resolve(batchOk(['ab']))
      await Promise.all([p1, p2])

      expect(api.batchDelete).toHaveBeenCalledTimes(2)
    })

    it('[524:22] batchDelete 结果不缓存（相同 ids 两次 = 2 次 API）', async () => {
      const store = makeStore('t16-batch-nocache', api, { enableCache: true })
      api.batchDelete.mockResolvedValue(batchOk(['1']))

      await store.removeBatch(['1'])
      await store.removeBatch(['1'])

      expect(api.batchDelete).toHaveBeenCalledTimes(2)
    })

    it('[529:7] clearCache 后 getById 回源（缓存被真正清空）', async () => {
      const store = makeStore('t16-clear-cache', api, { enableCache: true })
      api.getById.mockResolvedValue(entity('x', 'X'))

      await store.getById('x')
      store.clearCache()
      await store.getById('x')

      expect(api.getById).toHaveBeenCalledTimes(2)
    })

    it('[530:7] clearCache 在途请求期间抹去 pending 标记（后续同键不再复用在途 Promise）', async () => {
      const store = makeStore('t16-clearcache-pending', api, { enableCache: true })
      const d1 = deferred<TestEntity>()
      api.getById.mockReturnValueOnce(d1.promise).mockResolvedValueOnce(entity('x', 'X2'))

      const p1 = store.getById('x') // 在途：pendingSet 置位
      store.clearCache() // 真码清 pendingSet；变异体保留 → 后续同键误走去重复用
      const p2 = store.getById('x')
      d1.resolve(entity('x', 'X'))
      await Promise.all([p1, p2])

      expect(api.getById).toHaveBeenCalledTimes(2)
    })

    it('[536:61] clear() 将 loading 归零（在途请求期间执行）', async () => {
      const store = makeStore('t16-clear-loading', api)
      const listD = deferred<ListResponse<TestEntity>>()
      api.getList.mockReturnValueOnce(listD.promise)

      const pending = store.getList()
      expect(store.loading).toBe(true)

      store.clear()
      expect(store.loading).toBe(false)

      listD.resolve({ count: 0, page: 1, page_size: 20, results: [] })
      await pending
      expect(store.loading).toBe(false)
    })
  })

  // ===== create 请求 key =====
  describe('create 请求 key', () => {
    it('[373:45] create 并发（跨毫秒）各走独立 key（Date.now 键不被缺省同键去重吞并）', async () => {
      const store = makeStore('t16-create-key', api)
      const d1 = deferred<TestEntity>()
      const d2 = deferred<TestEntity>()
      api.create.mockReturnValueOnce(d1.promise).mockReturnValueOnce(d2.promise)

      const p1 = store.create({ id: 'a' })
      await new Promise((resolve) => setTimeout(resolve, 5)) // 跨毫秒：真码键不同；变异体空键恒同
      const p2 = store.create({ id: 'b' })
      d1.resolve(entity('a', 'A'))
      d2.resolve(entity('b', 'B'))
      await Promise.all([p1, p2])

      expect(api.create).toHaveBeenCalledTimes(2)
    })
  })
})
