/**
 * @file createEntityStore 边界/防御性分支测试
 * @module stores/__tests__/createEntityStore.edge
 * @description 覆盖工厂函数的回退分支：默认 displayName、defaultPageSize 兜底、
 *   currentEntity 空值、缺失主键、缺失 getById API、单条/数组返回、批量删除文案分支。
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
    api: api as never,
    message: mockElMessage as never,
    enableCache: false,
    enableDebounce: false,
    ...extra,
  })()

describe('createEntityStore 边界分支', () => {
  let api: ReturnType<typeof makeApi>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    api = makeApi()
  })

  describe('配置回退', () => {
    it('defaultPageSize 为 null 时应回退到 20', () => {
      const store = makeStore('edge-null-pagesize', api, { defaultPageSize: null })
      expect(store.pagination.page_size).toBe(20)
    })

    it('未配置 displayName 时提示文案使用 storeId', async () => {
      const store = makeStore('edge-no-display', api)

      api.create.mockResolvedValue({ id: '1', name: 'A', value: 1 })
      await store.create({ name: 'A', value: 1 })
      expect(mockElMessage.success).toHaveBeenCalledWith('edge-no-display创建成功')

      api.update.mockResolvedValue({ id: '1', name: 'B', value: 2 })
      await store.update({ id: '1', name: 'B', value: 2 })
      expect(mockElMessage.success).toHaveBeenCalledWith('edge-no-display更新成功')

      api.delete.mockResolvedValue()
      await store.remove('1')
      expect(mockElMessage.success).toHaveBeenCalledWith('edge-no-display删除成功')
    })
  })

  describe('currentEntity', () => {
    it('命中实体时返回实体，未命中或未选中时返回 null', async () => {
      const store = makeStore('edge-current', api)
      api.getList.mockResolvedValue({
        count: 1,
        results: [{ id: '1', name: 'A', value: 1 }],
      })
      await store.getList()

      store.currentEntityId = '1'
      expect(store.currentEntity?.name).toBe('A')

      store.currentEntityId = 'missing'
      expect(store.currentEntity).toBeNull()

      store.currentEntityId = null
      expect(store.currentEntity).toBeNull()
    })

    it('列表项缺失主键时应抛出异常', async () => {
      const store = makeStore('edge-no-id', api)
      api.getList.mockResolvedValue({
        count: 1,
        results: [{ name: '无主键', value: 1 } as never],
      })

      await expect(store.getList()).rejects.toThrow('Entity missing "id" field')
    })
  })

  describe('create 返回形态', () => {
    it('返回数组时应全部同步到列表', async () => {
      const store = makeStore('edge-create-array', api)
      api.create.mockResolvedValue([
        { id: '1', name: 'A', value: 1 },
        { id: '2', name: 'B', value: 2 },
      ])

      await store.create({ name: 'A', value: 1 })

      expect(store.list).toHaveLength(2)
    })
  })

  describe('getNameByCode 缺少 getById API', () => {
    it('未配置 getById 时应返回 null 并告警', async () => {
      const partialApi = {
        getList: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      }
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const store = createEntityStore<TestEntity>('edge-no-getbyid-name', {
        idKey: 'id',
        nameField: 'name',
        api: partialApi as never,
        enableCache: false,
      })()

      expect(await store.getNameByCode('1')).toBeNull()
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })
  })

  describe('autoSync=false', () => {
    it('不写入实体状态但仍返回结果', async () => {
      const store = makeStore('edge-nosync', api, { autoSync: false })

      api.getList.mockResolvedValue({
        count: 1,
        results: [{ id: '1', name: 'A', value: 1 }],
      })
      expect(await store.getList()).toHaveLength(1)
      expect(store.list).toHaveLength(0)

      api.getById.mockResolvedValue({ id: '1', name: 'A', value: 1 })
      await store.getById('1')
      expect(store.list).toHaveLength(0)

      api.create.mockResolvedValue({ id: '2', name: 'B', value: 2 })
      await store.create({ name: 'B', value: 2 })
      expect(store.list).toHaveLength(0)

      api.update.mockResolvedValue({ id: '1', name: 'C', value: 3 })
      await store.update({ id: '1', name: 'C', value: 3 })
      expect(store.list).toHaveLength(0)

      api.delete.mockResolvedValue()
      await store.remove('1')
      expect(store.list).toHaveLength(0)

      api.batchDelete.mockResolvedValue({
        total: 1,
        success_count: 1,
        fail_count: 0,
        success_ids: ['1'],
        fail_items: [],
      })
      await store.removeBatch(['1'])
      expect(store.list).toHaveLength(0)
    })
  })

  describe('removeBatch 文案分支', () => {
    it('部分失败超过 3 条时应追加省略计数', async () => {
      const store = makeStore('edge-batch-partial', api)
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

      expect(mockElMessage.warning).toHaveBeenCalledWith(expect.stringContaining('等4条'))
    })

    it('全部失败超过 3 条时应追加省略计数', async () => {
      const store = makeStore('edge-batch-allfail', api)
      api.batchDelete.mockResolvedValue({
        total: 4,
        success_count: 0,
        fail_count: 4,
        success_ids: [],
        fail_items: [
          { id: '1', error_message: 'e1' },
          { id: '2', error_message: 'e2' },
          { id: '3', error_message: 'e3' },
          { id: '4', error_message: 'e4' },
        ],
      })

      await store.removeBatch(['1', '2', '3', '4'])

      expect(mockElMessage.error).toHaveBeenCalledWith(expect.stringContaining('等4条'))
    })
  })
})
