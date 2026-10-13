import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
vi.mock('node:url', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:url')>()
  return {
    ...actual,
    default: {
      ...actual,
      fileURLToPath: () => 'D:/CodeDemo/AssetManagementProgram/vue-assetmanagement/src',
    },
    fileURLToPath: () => 'D:/CodeDemo/AssetManagementProgram/vue-assetmanagement/src',
  }
})
import rawConfig from '../../vite.config'

describe('BF-087 vite.config customLogger (temp verification)', () => {
  let logger: {
    error: (msg: string, options?: unknown) => void
    warn: (msg: string, options?: unknown) => void
    info: (msg: string, options?: unknown) => void
    warnOnce: (msg: string, options?: unknown) => void
    clearScreen: (t: string) => void
    hasErrorLogged: (e: unknown) => boolean
    hasWarned: boolean
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const fn = rawConfig as unknown as (env: { command: string; mode: string }) => {
      customLogger: typeof logger
    }
    logger = fn({ command: 'serve', mode: 'development' }).customLogger
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  const errWith = (code: string) => Object.assign(new Error(`connect ${code}`), { code })

  it('downgrades whitelisted proxy error to single line, throttled per 10s window', () => {
    const msg = 'http proxy error: /api/x\n    Error: connect ECONNREFUSED stackline'
    logger.error(msg, { error: errWith('ECONNREFUSED') })
    logger.error(msg, { error: errWith('ECONNREFUSED') })
    logger.error(msg, { error: errWith('ECONNREFUSED') })
    const outputs = [
      ...(console.error as ReturnType<typeof vi.fn>).mock.calls,
      ...(console.warn as ReturnType<typeof vi.fn>).mock.calls,
    ]
      .flat()
      .join('\n')
    expect(outputs).toContain('代理连接中断')
    expect(outputs).toContain('ECONNREFUSED')
    expect(outputs).not.toContain('stackline')
    const lineCount = outputs.split('\n').filter((l) => l.includes('代理连接中断')).length
    expect(lineCount).toBe(1)
  })

  it('throttle window expires after 10s and logs again', () => {
    const msg = 'ws proxy socket error:\n    Error: write ECONNABORTED'
    logger.error(msg, { error: errWith('ECONNABORTED') })
    vi.advanceTimersByTime(11_000)
    logger.error(msg, { error: errWith('ECONNABORTED') })
    const outputs = [
      ...(console.error as ReturnType<typeof vi.fn>).mock.calls,
      ...(console.warn as ReturnType<typeof vi.fn>).mock.calls,
    ]
      .flat()
      .join('\n')
    expect(outputs.split('\n').filter((l) => l.includes('代理连接中断')).length).toBe(2)
  })

  it('passes through non-whitelisted errors with full stack (not swallowed)', () => {
    const stackMsg = 'some plugin error\n    at foo (x.js:1:1)'
    logger.error(stackMsg, { error: new Error('boom') })
    expect((console.error as ReturnType<typeof vi.fn>).mock.calls.flat().join('\n')).toContain(
      'at foo',
    )
  })

  it('passes through whitelisted code without proxy marker (not swallowed)', () => {
    logger.error('unrelated module ECONNRESET\n    at bar (y.js:2:2)', {
      error: errWith('ECONNRESET'),
    })
    expect((console.error as ReturnType<typeof vi.fn>).mock.calls.flat().join('\n')).toContain(
      'at bar',
    )
  })

  it('passes through proxy error with unknown code (not swallowed)', () => {
    logger.error('ws proxy error:\n    at baz (z.js:3:3)', {
      error: Object.assign(new Error('x'), { code: 'ETIMEDOUT' }),
    })
    expect((console.error as ReturnType<typeof vi.fn>).mock.calls.flat().join('\n')).toContain(
      'at baz',
    )
  })

  it('hasWarned delegates to base logger (getter/setter)', () => {
    expect(logger.hasWarned).toBe(false)
    logger.warnOnce('w1')
    expect(logger.hasWarned).toBe(true)
    logger.hasWarned = false
    expect(logger.hasWarned).toBe(false)
  })
})
