/**
 * logger trace_id 同步测试（M-RC-11）+ B1 上报接线
 * @module utils/logger
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { logInfo, logWarn, logError, syncTraceId, resetTraceId } from '../logger'
import { sendFrontendLog } from '@/utils/frontendLogSink'

vi.mock('@/utils/frontendLogSink', () => ({ sendFrontendLog: vi.fn() }))

describe('logger trace_id 同源（M-RC-11）', () => {
  beforeEach(() => {
    resetTraceId()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(sendFrontendLog).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('syncTraceId 使 console 日志 trace_id 与注入值同源（请求层闭环）', () => {
    syncTraceId('rid-from-request-header')

    logWarn('spec', 'hello')

    const line = (console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(JSON.parse(line).trace_id).toBe('rid-from-request-header')
  })

  it('每次 syncTraceId 覆写会话值（每请求唯一，OC-1 口径）', () => {
    syncTraceId('rid-1')
    logWarn('spec', 'first')
    syncTraceId('rid-2')
    logWarn('spec', 'second')

    const calls = (console.warn as ReturnType<typeof vi.fn>).mock.calls
    expect(JSON.parse(calls[0][0]).trace_id).toBe('rid-1')
    expect(JSON.parse(calls[1][0]).trace_id).toBe('rid-2')
  })

  it('resetTraceId 后回到懒生成路径（登出/登录重置语义）', () => {
    syncTraceId('rid-old')
    resetTraceId()

    logWarn('spec', 'after-reset')

    const line = JSON.parse((console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string)
    expect(line.trace_id).not.toBe('rid-old')
    expect(typeof line.trace_id).toBe('string')
  })

  it('warn/error 接线前端上报队列，info 不接线（B1）', () => {
    syncTraceId('trace-1')

    logInfo('spec', 'quiet')
    expect(sendFrontendLog).not.toHaveBeenCalled()

    logWarn('spec', 'warn message')
    expect(sendFrontendLog).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        message: 'warn message',
        client_trace_id: 'trace-1',
        frontend_module: 'spec',
      }),
    )

    logError('spec', 'error message', new Error('boom'))
    expect(sendFrontendLog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        level: 'error',
        message: 'error message',
        client_trace_id: 'trace-1',
        frontend_module: 'spec',
        error: expect.any(Error),
      }),
    )
  })
})
