// B1 前端错误日志测试依赖 fake-indexeddb 提供 DOM IndexedDB 实现
import 'fake-indexeddb/auto'

import { beforeEach, vi } from 'vitest'

// sink 的默认 sendBeacon 一律成功，避免既有用例 logger.warn/error 触发真实网络请求
beforeEach(() => {
  Object.defineProperty(window.navigator, 'sendBeacon', {
    value: vi.fn(() => true),
    configurable: true,
    writable: true,
  })
})
