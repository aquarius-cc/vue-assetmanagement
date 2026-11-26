/**
 * 前端错误日志上报队列（B1）
 *
 * 降级链: navigator.sendBeacon → IndexedDB → 内存队列。
 * 刷写使用 fetch(keepalive) 以识别非 2xx；失败项保留待下次 flush。
 */

import { BASE_URL } from '@/api/baseUrl'
import type { LogContext } from '@/utils/logger'
import { deepClone } from '@/utils/deepClone'

const ENDPOINT = `${BASE_URL}/frontend-logs/`
const MAX_QUEUE_ITEMS = 100
const MAX_QUEUE_BYTES = 256 * 1024
const MAX_PAYLOAD_BYTES = 16 * 1024
const LOG_TTL_MS = 24 * 60 * 60 * 1000
const DB_NAME = 'frontend-logs'
const STORE_NAME = 'logs'

export type FrontendLogEntry = {
  level: 'warn' | 'error'
  message: string
  client_trace_id: string
  client_time: string
  release: string
  env: string
  route: string
  frontend_module: string
  error_type?: string
  error_message?: string
  frontend_context?: LogContext
}

type PersistedLog = { id: string; payload: FrontendLogEntry; at: number }

let listenersInstalled = false
const memoryQueue: PersistedLog[] = []
let persistenceChain: Promise<void> = Promise.resolve()

function id(): string {
  const cryptoRef = globalThis.crypto
  if (typeof cryptoRef?.randomUUID === 'function') return cryptoRef.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function payloadBytes(payload: FrontendLogEntry): number {
  return JSON.stringify(payload).length
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('indexedDB open failed'))
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode)
      const request = operation(transaction.objectStore(STORE_NAME))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('indexedDB request failed'))
    })
  } finally {
    database.close()
  }
}

async function runWriteStore(operation: (store: IDBObjectStore) => void): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      operation(transaction.objectStore(STORE_NAME))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('indexedDB write failed'))
      transaction.onabort = () => reject(transaction.error ?? new Error('indexedDB write aborted'))
    })
  } finally {
    database.close()
  }
}

async function readPersistedLogs(): Promise<PersistedLog[]> {
  try {
    const records = await withStore<PersistedLog[]>('readonly', (store) => store.getAll())
    return records.filter((record) => isPersistedLog(record))
  } catch {
    return []
  }
}

function isPersistedLog(value: unknown): value is PersistedLog {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<PersistedLog>
  return typeof record.id === 'string' && typeof record.at === 'number' && !!record.payload
}

async function clearPersistedLogs(): Promise<void> {
  try {
    await runWriteStore((store) => store.clear())
  } catch {
    return
  }
}

async function clearQueuedFrontendLogs(): Promise<void> {
  await persistenceChain
  memoryQueue.length = 0
  await clearPersistedLogs()
}

async function deletePersistedLogs(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  try {
    await runWriteStore((store) => {
      for (const idValue of ids) {
        store.delete(idValue)
      }
    })
  } catch {
    return
  }
}

function isExpired(item: PersistedLog, now: number): boolean {
  return now - item.at > LOG_TTL_MS
}

async function enforcePersistedLimits(): Promise<void> {
  const now = Date.now()
  let records = await readPersistedLogs()
  await deletePersistedLogs(records.filter((item) => isExpired(item, now)).map((item) => item.id))
  records = records.filter((item) => !isExpired(item, now))

  let totalBytes = records.reduce((sum, item) => sum + payloadBytes(item.payload), 0)
  while (records.length > MAX_QUEUE_ITEMS || totalBytes > MAX_QUEUE_BYTES) {
    const removed = records.shift()
    if (!removed) break
    await deletePersistedLogs([removed.id])
    totalBytes -= payloadBytes(removed.payload)
  }
}

function enforceMemoryLimits(): void {
  const now = Date.now()
  while (memoryQueue.length > 0 && isExpired(memoryQueue[0], now)) {
    memoryQueue.shift()
  }
  while (memoryQueue.length > MAX_QUEUE_ITEMS) {
    memoryQueue.shift()
  }
  let totalBytes = memoryQueue.reduce((sum, item) => sum + payloadBytes(item.payload), 0)
  while (totalBytes > MAX_QUEUE_BYTES && memoryQueue.length > 0) {
    const removed = memoryQueue.shift()
    if (!removed) break
    totalBytes -= payloadBytes(removed.payload)
  }
}

function persistFallback(payload: FrontendLogEntry): void {
  persistenceChain = persistenceChain.then(() => persistOne(payload))
}

async function persistOne(payload: FrontendLogEntry): Promise<void> {
  const item: PersistedLog = { id: id(), payload, at: Date.now() }
  try {
    await runWriteStore((store) => store.put(item))
    await enforcePersistedLimits()
  } catch {
    memoryQueue.push(item)
    enforceMemoryLimits()
  }
}

function safeErrorFields(error: unknown): Pick<FrontendLogEntry, 'error_type' | 'error_message'> {
  if (error instanceof Error) {
    return {
      error_type: error.name.slice(0, 128),
      error_message: error.message.slice(0, 1000),
    }
  }
  if (error === undefined || error === null) return {}
  const text = String(error).slice(0, 1000)
  return { error_type: typeof error, error_message: text }
}

function safeRoute(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.pathname}${window.location.search}`.slice(0, 512)
}

function safeContext(context?: LogContext): LogContext | undefined {
  if (!context || Object.keys(context).length === 0) return undefined
  try {
    return deepClone(context) as LogContext
  } catch {
    return undefined
  }
}

export type FrontendLogInput = {
  level: 'warn' | 'error'
  message: string
  client_trace_id: string
  frontend_module: string
  route?: string
  frontend_context?: LogContext
  error?: unknown
}

export function sendFrontendLog(entry: FrontendLogInput): void {
  const fields = safeErrorFields(entry.error)
  const payload: FrontendLogEntry = {
    level: entry.level,
    message: entry.message.slice(0, 2000),
    client_trace_id: entry.client_trace_id,
    client_time: new Date().toISOString(),
    release: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev',
    env: import.meta.env.MODE || 'production',
    route: entry.route || safeRoute(),
    frontend_module: entry.frontend_module.slice(0, 128),
    frontend_context: safeContext(entry.frontend_context),
    ...fields,
  }
  if (payloadBytes(payload) > MAX_PAYLOAD_BYTES) {
    payload.frontend_context = undefined
  }

  const encoded = JSON.stringify(payload)
  try {
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(ENDPOINT, encoded)) {
      return
    }
  } catch {
    void persistFallback(payload)
    return
  }
  void persistFallback(payload)
}

async function postChunk(items: PersistedLog[]): Promise<boolean> {
  if (typeof fetch !== 'function') return false
  const payloadBytesOfChunk = items.reduce((sum, item) => sum + payloadBytes(item.payload), 0)
  if (payloadBytesOfChunk > MAX_PAYLOAD_BYTES) return false
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items[0]?.payload),
      keepalive: true,
    })
    return response.ok
  } catch {
    return false
  }
}

export async function flushFrontendLogs(): Promise<void> {
  await persistenceChain
  const now = Date.now()
  const persisted = await readPersistedLogs()
  await deletePersistedLogs(persisted.filter((item) => isExpired(item, now)).map((item) => item.id))
  const activePersisted = persisted.filter((item) => !isExpired(item, now))
  const persistedIds = new Set(activePersisted.map((item) => item.id))
  const memoryItems = memoryQueue.filter((item) => !isExpired(item, now))
  const pending = [...activePersisted, ...memoryItems]
  for (const item of pending) {
    if (await postChunk([item])) {
      await deletePersistedLogs([item.id])
      const memoryIndex = memoryQueue.findIndex((entry) => entry.id === item.id)
      if (memoryIndex >= 0) memoryQueue.splice(memoryIndex, 1)
    }
  }
  memoryQueue.length = 0
  memoryQueue.push(...memoryItems.filter((item) => !persistedIds.has(item.id)))
}

export async function getQueuedFrontendLogCount(): Promise<number> {
  await persistenceChain
  const persisted = await readPersistedLogs()
  return persisted.length + memoryQueue.length
}

let onOnline: (() => void) | null = null
let onVisibilityChange: (() => void) | null = null
let onPageHide: (() => void) | null = null

export function installFrontendLogFlushListeners(): void {
  if (listenersInstalled || typeof window === 'undefined') return
  listenersInstalled = true
  onOnline = () => void flushFrontendLogs()
  onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') void flushFrontendLogs()
  }
  onPageHide = () => void flushFrontendLogs()
  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', onPageHide)
}

/** 卸载三个 flush 触发器；与 installFrontendLogFlushListeners 对称 */
export function cleanupFrontendLogFlushListeners(): void {
  if (!listenersInstalled) return
  if (onOnline) window.removeEventListener('online', onOnline)
  if (onVisibilityChange) document.removeEventListener('visibilitychange', onVisibilityChange)
  if (onPageHide) window.removeEventListener('pagehide', onPageHide)
  onOnline = null
  onVisibilityChange = null
  onPageHide = null
  listenersInstalled = false
}

export { clearQueuedFrontendLogs }
