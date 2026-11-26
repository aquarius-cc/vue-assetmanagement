/**
 * 前端错误日志队列回归（B1）
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  cleanupFrontendLogFlushListeners,
  clearQueuedFrontendLogs,
  flushFrontendLogs,
  getQueuedFrontendLogCount,
  installFrontendLogFlushListeners,
  sendFrontendLog,
  type FrontendLogEntry,
} from '../frontendLogSink'

const ENDPOINT = '/api/v1/frontend-logs/'

function makeEntry(overrides: Partial<FrontendLogEntry> = {}): FrontendLogEntry {
  return {
    level: 'error',
    message: 'boom',
    client_trace_id: 'trace-1',
    client_time: new Date().toISOString(),
    release: 'v1.2.3',
    env: 'test',
    route: '/assets/',
    frontend_module: 'AssetDetail',
    ...overrides,
  }
}

function setSendBeacon(value: boolean | undefined) {
  const beacon = vi.fn(() => value)
  Object.defineProperty(window.navigator, 'sendBeacon', {
    value: beacon,
    configurable: true,
    writable: true,
  })
  return beacon
}

async function putExpiredLog() {
  const request = indexedDB.open('frontend-logs', 1)
  await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(undefined)
    request.onerror = () => reject(request.error)
  })
  const database = request.result
  const transaction = database.transaction('logs', 'readwrite')
  const store = transaction.objectStore('logs')
  store.put({
    id: 'expired-1',
    payload: makeEntry(),
    at: Date.now() - 25 * 60 * 60 * 1000,
  })
  await new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(undefined)
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

describe('frontendLogSink', () => {
  beforeEach(async () => {
    await clearQueuedFrontendLogs()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sendBeacon 成功时不入队', async () => {
    const beacon = setSendBeacon(true)
    sendFrontendLog(makeEntry())
    expect(beacon).toHaveBeenCalledWith(ENDPOINT, expect.any(String))
    expect(await getQueuedFrontendLogCount()).toBe(0)
  })

  it('sendBeacon 失败时落入 IndexedDB，flush 成功后删除', async () => {
    setSendBeacon(false)
    sendFrontendLog(makeEntry())
    expect(await getQueuedFrontendLogCount()).toBe(1)

    setSendBeacon(true)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ code: 0 }), { status: 200 })),
    )
    await flushFrontendLogs()
    expect(await getQueuedFrontendLogCount()).toBe(0)
  })

  it('flush 非 2xx 时保留队列', async () => {
    setSendBeacon(false)
    sendFrontendLog(makeEntry())
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500 })),
    )
    await flushFrontendLogs()
    expect(await getQueuedFrontendLogCount()).toBe(1)
  })

  it('IndexedDB 抛错时落入内存队列', async () => {
    setSendBeacon(false)
    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new Error('db down')
    })
    sendFrontendLog(makeEntry())
    expect(await getQueuedFrontendLogCount()).toBe(1)
  })

  it('单条上报载荷不超过 16KB', () => {
    const beacon = setSendBeacon(true)
    sendFrontendLog(
      makeEntry({
        message: 'x'.repeat(20000),
        error_message: 'e'.repeat(20000),
        frontend_context: { route: '/assets/', status: 'failed' },
      }),
    )
    const payload = JSON.parse(beacon.mock.calls[0][1] as string)
    expect((beacon.mock.calls[0][1] as string).length).toBeLessThanOrEqual(16 * 1024)
    expect(payload.message.length).toBe(2000)
  })

  it('超过 100 条丢弃最旧', async () => {
    setSendBeacon(false)
    for (let index = 0; index < 101; index += 1) {
      sendFrontendLog(makeEntry({ message: `m-${index}` }))
    }
    expect(await getQueuedFrontendLogCount()).toBe(100)
  })

  it('过期 24h 的日志在 flush 时清理且不发送', async () => {
    await putExpiredLog()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await flushFrontendLogs()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(await getQueuedFrontendLogCount()).toBe(0)
  })

  it('[M-HYG-01] install/cleanup 对称：注册 online/visibilitychange/pagehide，可对称卸载', () => {
    const windowAdd = vi.spyOn(window, 'addEventListener')
    const documentAdd = vi.spyOn(document, 'addEventListener')
    const windowRemove = vi.spyOn(window, 'removeEventListener')
    const documentRemove = vi.spyOn(document, 'removeEventListener')

    installFrontendLogFlushListeners()
    installFrontendLogFlushListeners() // 幂等：重复 install 不重复挂载
    expect(windowAdd.mock.calls.filter(([type]) => type === 'online')).toHaveLength(1)
    expect(windowAdd.mock.calls.filter(([type]) => type === 'pagehide')).toHaveLength(1)
    expect(documentAdd.mock.calls.filter(([type]) => type === 'visibilitychange')).toHaveLength(1)

    cleanupFrontendLogFlushListeners()
    expect(windowRemove.mock.calls.filter(([type]) => type === 'online')).toHaveLength(1)
    expect(windowRemove.mock.calls.filter(([type]) => type === 'pagehide')).toHaveLength(1)
    expect(documentRemove.mock.calls.filter(([type]) => type === 'visibilitychange')).toHaveLength(
      1,
    )
  })

  it('[M-HYG-01] cleanup 幂等：未安装时调用不报错', () => {
    expect(() => cleanupFrontendLogFlushListeners()).not.toThrow()
  })
})
