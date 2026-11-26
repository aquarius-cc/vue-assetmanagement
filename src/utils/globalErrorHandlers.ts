/**
 * Vue / 全局未处理 Promise 错误的统一接线（B1）
 * mount 前调用一次；避免在业务代码里散落 window.onerror。
 */

import type { App } from 'vue'

import { logError } from './logger'

let globalRejectionListenerInstalled = false
let unhandledRejectionListener: ((event: Event) => void) | null = null

export function registerGlobalErrorHandlers(app: App): void {
  const previousHandler = app.config.errorHandler
  app.config.errorHandler = (error, instance, info) => {
    logError('vue', info, error, {
      component: typeof instance?.$options?.name === 'string' ? instance.$options.name : undefined,
    })
    previousHandler?.(error, instance, info)
  }

  if (globalRejectionListenerInstalled) return
  globalRejectionListenerInstalled = true
  unhandledRejectionListener = (event) => {
    const reason = (event as unknown as { reason?: unknown }).reason
    logError('window', 'unhandled promise rejection', reason)
  }
  window.addEventListener('unhandledrejection', unhandledRejectionListener)
}

/** 卸载全局监听器；与 registerGlobalErrorHandlers 对称，供测试/HMR/微前端调用 */
export function cleanupGlobalErrorHandlers(): void {
  if (!unhandledRejectionListener) return
  window.removeEventListener('unhandledrejection', unhandledRejectionListener)
  unhandledRejectionListener = null
  globalRejectionListenerInstalled = false
}
