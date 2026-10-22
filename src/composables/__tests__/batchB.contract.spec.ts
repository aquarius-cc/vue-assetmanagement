/**
 * 批次 B 契约测试（M-12 / M-14 / M-17 / M-19 / M-22 / M-25）
 *
 * M-12: GET 失败降级需标记 degraded（request.ts tryFallbackCache）
 * M-14: usePagedList.fetchList 需 seq 守卫（竞态防旧覆新）
 * M-17: auditLogStore.loadData 需 seq 守卫
 * M-19: markAssetAsBroken / batchDeleteAssets 需失效 getAssetByCode 5min 缓存
 * M-22: useGroupedAssetList.fetchSummaries 需 seq 守卫
 * M-25: UserForm / UserBatchImport 需 silent 模式拉部门（不污染 departmentStore.list）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// ======================== M-14 usePagedList seq 守卫 ========================

describe('M-14 usePagedList seq 守卫', () => {
  let usePagedList: typeof import('@/composables/usePagedList').usePagedList

  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('element-plus', () => ({ ElMessage: { error: vi.fn() } }))
    vi.doMock('@/utils/logger', () => ({ logError: vi.fn(), logWarn: vi.fn() }))
    const mod = await import('@/composables/usePagedList')
    usePagedList = mod.usePagedList
  })

  it('快速连续 search 时旧响应不得覆盖新响应（seq 守卫）', async () => {
    // 延迟解析器：控制响应到达顺序
    let resolveFirst!: (v: { results: string[]; count: number }) => void
    let resolveSecond!: (v: { results: string[]; count: number }) => void
    const callCount = { n: 0 }

    const fetcher = vi.fn(() => {
      callCount.n++
      if (callCount.n === 1) {
        return new Promise<{ results: string[]; count: number }>((r) => {
          resolveFirst = r
        })
      }
      return new Promise<{ results: string[]; count: number }>((r) => {
        resolveSecond = r
      })
    })

    const { list, total, search } = usePagedList<string>({
      fixedParams: {},
      fetcher,
      errorMessage: 'fail',
      tag: 'test',
    })

    // 发起两次快速调用（不 await）
    const p1 = search({ keyword: 'a' })
    const p2 = search({ keyword: 'b' })

    // 先让第二次（新）响应到达
    resolveSecond({ results: ['B'], count: 10 })
    await p2
    expect(list.value).toEqual(['B'])
    expect(total.value).toBe(10)

    // 再让第一次（旧）响应到达 —— seq 已过期，不得覆盖
    resolveFirst({ results: ['A'], count: 99 })
    await p1
    expect(list.value).toEqual(['B'])
    expect(total.value).toBe(10)
  })
})

// ======================== M-17 auditLogStore seq 守卫 ========================

describe('M-17 auditLogStore seq 守卫', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doMock('@/api/auditLog', () => ({
      auditLogAPI: {
        getAuditLogs: vi.fn(),
        getAuditLogByLoggingId: vi.fn(),
        exportExcel: vi.fn(),
      },
    }))
  })

  it('快速连续 loadData 时旧响应不得覆盖新响应', async () => {
    const { auditLogAPI } = await import('@/api/auditLog')
    const mockGetAuditLogs = vi.mocked(auditLogAPI.getAuditLogs)

    let resolveFirst!: (v: { results: unknown[]; count: number }) => void
    let resolveSecond!: (v: { results: unknown[]; count: number }) => void
    let call = 0

    mockGetAuditLogs.mockImplementation(() => {
      call++
      if (call === 1) {
        return new Promise((r) => {
          resolveFirst = r
        })
      }
      return new Promise((r) => {
        resolveSecond = r
      })
    })

    setActivePinia(createPinia())
    const { useAuditLogStore } = await import('@/stores/auditLogStore')
    const store = useAuditLogStore()

    // 两次快速调用
    const p1 = store.loadData()
    const p2 = store.loadData()

    // 新响应先到
    resolveSecond({ results: [{ id: 2, logging_id: 'LOG-NEW' }], count: 5 })
    await p2
    expect(store.tableData).toHaveLength(1)
    expect(store.total).toBe(5)

    // 旧响应后到 —— seq 过期，不得覆盖
    resolveFirst({ results: [{ id: 1, logging_id: 'LOG-OLD' }], count: 99 })
    await p1
    expect(store.tableData).toHaveLength(1)
    expect(store.tableData[0].logging_id).toBe('LOG-NEW')
    expect(store.total).toBe(5)
  })
})

// ======================== M-22 useGroupedAssetList seq 守卫 ========================

describe('M-22 useGroupedAssetList seq 守卫', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doMock('@/api/asset', () => ({
      assetAPI: {
        getGroupedAssets: vi.fn(),
        getGroupChildren: vi.fn(),
      },
    }))
    vi.doMock('element-plus', () => ({ ElMessage: { error: vi.fn() } }))
    vi.doMock('@/utils/logger', () => ({ logError: vi.fn(), logWarn: vi.fn() }))
  })

  it('快速连续 changePage 时旧响应不得覆盖新响应', async () => {
    const { assetAPI } = await import('@/api/asset')
    const mockGetGroupedAssets = vi.mocked(assetAPI.getGroupedAssets)

    let resolveFirst!: (v: { results: unknown[]; count: number }) => void
    let resolveSecond!: (v: { results: unknown[]; count: number }) => void
    let call = 0

    mockGetGroupedAssets.mockImplementation(() => {
      call++
      if (call === 1) {
        return new Promise((r) => {
          resolveFirst = r
        })
      }
      return new Promise((r) => {
        resolveSecond = r
      })
    })

    const { useGroupedAssetList } = await import('@/composables/useGroupedAssetList')
    const { summaries, summaryTotal, search, changePage } = useGroupedAssetList()

    // 先 search 一次建立基准（第1页）
    mockGetGroupedAssets.mockResolvedValueOnce({
      results: [{ group_key: 'g0', asset_count: 1 }],
      count: 1,
    } as never)
    await search()
    call = 0 // 重置计数器

    // 两次快速翻页（不 await）
    const p1 = changePage(2)
    const p2 = changePage(3)

    // 新响应（第3页）先到
    resolveSecond({ results: [{ group_key: 'g3', asset_count: 3 }], count: 30 })
    await p2
    expect(summaries.value).toEqual([{ group_key: 'g3', asset_count: 3 }])
    expect(summaryTotal.value).toBe(30)

    // 旧响应（第2页）后到 —— seq 过期，不得覆盖
    resolveFirst({ results: [{ group_key: 'g2', asset_count: 2 }], count: 30 })
    await p1
    expect(summaries.value).toEqual([{ group_key: 'g3', asset_count: 3 }])
    expect(summaryTotal.value).toBe(30)
  })
})

// ======================== M-12 / M-19 request.ts 缓存契约 ========================
// 需要 axios mock，单独 describe

describe('M-12/M-19 request.ts 缓存契约', () => {
  // 延迟初始化，避免顶层副作用
  let get: typeof import('@/api/request').get
  let clearCacheByPattern: typeof import('@/api/request').clearCacheByPattern

  const mocks = vi.hoisted(() => ({
    instanceGet: vi.fn(),
    instancePost: vi.fn(),
  }))

  const handlers = vi.hoisted(() => ({
    resErr: null as ((e: unknown) => unknown) | null,
    reqOk: null as
      | ((c: { method?: string; url?: string; headers: Record<string, string> }) => {
          headers: Record<string, string>
        })
      | null,
  }))

  vi.mock('axios', () => {
    const mockInstance = Object.assign(
      vi.fn((config: { method?: string }) => {
        const m = config?.method?.toLowerCase()
        if (m === 'get') return mocks.instanceGet(config)
        if (m === 'post') return mocks.instancePost(config)
        return Promise.resolve({ data: {} })
      }),
      {
        interceptors: {
          request: {
            use: vi.fn((ok: unknown) => {
              handlers.reqOk = ok as typeof handlers.reqOk
            }),
            eject: vi.fn(),
          },
          response: {
            use: vi.fn((_ok: unknown, err: unknown) => {
              handlers.resErr = err as typeof handlers.resErr
            }),
            eject: vi.fn(),
          },
        },
        get: mocks.instanceGet,
        post: mocks.instancePost,
      },
    )
    return {
      default: { create: vi.fn(() => mockInstance) },
      isAxiosError: vi.fn((e: unknown) => (e as { isAxiosError?: boolean })?.isAxiosError === true),
    }
  })

  vi.mock('element-plus', () => ({
    ElMessage: { error: vi.fn(), success: vi.fn() },
  }))

  vi.mock('@/utils/tokenObfuscator', () => ({
    decodeToken: vi.fn(),
    clearAllAuthTokens: vi.fn(),
  }))

  vi.mock('@/utils/tokenRefresh', () => ({
    refreshAccessToken: vi.fn(),
    MissingRefreshTokenError: class MissingRefreshTokenError extends Error {},
  }))

  vi.mock('@/utils/requestErrors', () => ({
    isTransientError: vi.fn(() => false),
  }))

  vi.mock('@/utils/device', () => ({
    detectAuthChannel: vi.fn(() => 'cookie'),
  }))

  vi.mock('@/utils/csrf', () => ({
    getCsrfToken: vi.fn(() => 'csrf-token'),
  }))

  vi.mock('@/utils/traceId', () => ({
    generateTraceId: vi.fn(() => 'trace-1'),
  }))

  vi.mock('@/api/config', () => ({
    BASE_URL: '/api',
    TIMEOUT: 5000,
    MAX_REFRESH_RETRY_COUNT: 2,
    EXPORT_TIMEOUT: 30000,
  }))

  beforeEach(async () => {
    vi.resetModules()
    mocks.instanceGet.mockReset()
    mocks.instancePost.mockReset()
    handlers.resErr = null
    handlers.reqOk = null

    const mod = await import('@/api/request')
    get = mod.get
    clearCacheByPattern = mod.clearCacheByPattern
  })

  it('M-12: GET 失败降级时返回值应带 _degraded 标记（并发竞态路径）', async () => {
    const url = '/test/degraded/'
    // 并发竞态：两个相同 GET 同时发出（都未命中缓存）；
    // 请求 B 先成功写入缓存 → 请求 A 后失败 → A 降级命中 B 写入的缓存
    let rejectA!: (e: Error) => void
    let resolveB!: (v: unknown) => void

    mocks.instanceGet
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectA = reject
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveB = resolve
          }),
      )

    const pA = get<{ v: number }>(url, undefined, true, 300000)
    const pB = get<{ v: number }>(url, undefined, true, 300000)

    // B 先成功 → 写入缓存
    resolveB({ data: { code: 0, message: 'ok', data: { v: 1 } } })
    await pB

    // A 后失败 → 降级命中 B 的缓存，需带 _degraded: true
    rejectA(new Error('network down'))
    const rA = await pA
    expect(rA.data).toEqual({ v: 1 })
    expect((rA as { _degraded?: boolean })._degraded).toBe(true)
  })

  it('M-12: 无缓存时 GET 失败仍应抛出（不降级）', async () => {
    mocks.instanceGet.mockRejectedValueOnce(new Error('network down'))
    await expect(get('/test/no-cache-fail/', undefined, true, 300000)).rejects.toThrow(
      'network down',
    )
  })

  it('M-19: clearCacheByPattern 应清除匹配的缓存条目', async () => {
    const detailUrl = '/assets/assets/ZC001/'
    // 写入缓存
    mocks.instanceGet.mockResolvedValueOnce({
      data: { code: 0, message: 'ok', data: { recordcode: 'ZC001', status: 'in_use' } },
    })
    await get(detailUrl, undefined, true, 300000)

    // 模拟 mark-broken 后调用 clearCacheByPattern
    clearCacheByPattern(detailUrl)

    // 再次 GET 应重新请求（缓存已清除）
    mocks.instanceGet.mockResolvedValueOnce({
      data: { code: 0, message: 'ok', data: { recordcode: 'ZC001', status: 'damaged' } },
    })
    const r = await get(detailUrl, undefined, true, 300000)
    expect(r.data).toEqual({ recordcode: 'ZC001', status: 'damaged' })
    expect(mocks.instanceGet).toHaveBeenCalledTimes(2)
  })
})

// ======================== M-25 departmentStore silent 模式 ========================

/** 部门 API mock（departmentStore 的 api.getList 走 departmentAPI.getDepartmentList） */
function mockDepartmentApi() {
  vi.doMock('@/api/department', () => ({
    departmentAPI: {
      getDepartmentList: vi.fn().mockResolvedValue({
        count: 2,
        results: [{ department_code: 'D1', department_name: '部门1' }],
      }),
      getDepartment: vi.fn(),
      createDepartment: vi.fn(),
      updateDepartment: vi.fn(),
      deleteDepartment: vi.fn(),
      batchDeleteDepartments: vi.fn(),
    },
  }))
}

describe('M-25 departmentStore silent 模式不污染共享状态', () => {
  beforeEach(() => {
    vi.resetModules()
    setActivePinia(createPinia())
  })

  it('silent getList 不写 departmentStore.list（M-05 模式）', async () => {
    mockDepartmentApi()
    const { useDepartmentStore } = await import('@/stores/departmentStore')
    const store = useDepartmentStore()

    // silent 模式调用
    await store.getList({ page: 1, page_size: 100 }, { silent: true })

    // store.list 应保持初始状态（不被污染）
    expect(store.list).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('非 silent getList 正常写入 departmentStore.list', async () => {
    mockDepartmentApi()
    const { useDepartmentStore } = await import('@/stores/departmentStore')
    const store = useDepartmentStore()

    await store.getList({ page: 1, page_size: 100 })
    expect(store.list).toHaveLength(1)
    expect(store.list[0].department_code).toBe('D1')
  })
})
