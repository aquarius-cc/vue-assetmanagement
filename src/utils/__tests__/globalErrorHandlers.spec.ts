/**
 * Vue / 全局错误接线回归（B1）
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, type App } from 'vue'

import { cleanupGlobalErrorHandlers, registerGlobalErrorHandlers } from '../globalErrorHandlers'
import { logError } from '../logger'

vi.mock('../logger', () => ({ logError: vi.fn() }))

function createRegisteredApp(): App {
  const app = createApp({ render: () => h('div') })
  registerGlobalErrorHandlers(app)
  return app
}

function createUnhandledRejection(reason: unknown): Event {
  const event = new Event('unhandledrejection')
  Object.defineProperty(event, 'reason', { value: reason, configurable: true })
  return event
}

describe('globalErrorHandlers', () => {
  beforeEach(() => {
    vi.mocked(logError).mockClear()
  })

  afterEach(() => {
    cleanupGlobalErrorHandlers()
    vi.restoreAllMocks()
  })

  it('app.errorHandler 记录并保留既有处理器', () => {
    const fallback = vi.fn()
    const app = createApp({ render: () => h('div') })
    app.config.errorHandler = fallback
    registerGlobalErrorHandlers(app)

    const error = new Error('vue boom')
    app.config.errorHandler?.(error, null, 'setup')
    expect(logError).toHaveBeenCalledWith(
      'vue',
      'setup',
      error,
      expect.objectContaining({ component: undefined }),
    )
    expect(fallback).toHaveBeenCalledWith(error, null, 'setup')
  })

  it('unhandledrejection 记录 reason', () => {
    createRegisteredApp()
    const error = new Error('promise boom')
    window.dispatchEvent(createUnhandledRejection(error))
    expect(logError).toHaveBeenCalledWith('window', 'unhandled promise rejection', error)
  })

  it('重复注册不重复挂 unhandledrejection', () => {
    const app1 = createRegisteredApp()
    const app2 = createRegisteredApp()
    window.dispatchEvent(createUnhandledRejection(new Error('twice')))
    expect(logError).toHaveBeenCalledTimes(1)
    app1.unmount()
    app2.unmount()
  })

  it('[M-HYG-01] cleanup 后 unhandledrejection 不再记录；再次 register 恢复记录', () => {
    createRegisteredApp()
    cleanupGlobalErrorHandlers()

    window.dispatchEvent(createUnhandledRejection(new Error('after-cleanup')))
    expect(logError).not.toHaveBeenCalled()

    createRegisteredApp()
    window.dispatchEvent(createUnhandledRejection(new Error('after-restore')))
    expect(logError).toHaveBeenCalledTimes(1)
    expect(logError).toHaveBeenCalledWith(
      'window',
      'unhandled promise rejection',
      expect.any(Error),
    )
  })

  it('[M-HYG-01] cleanup 幂等：未注册时调用不报错', () => {
    cleanupGlobalErrorHandlers()
    cleanupGlobalErrorHandlers()
    expect(logError).not.toHaveBeenCalled()
  })
})
