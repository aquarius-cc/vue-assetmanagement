import { describe, it, expect, vi, afterEach } from 'vitest'
import { isMobileDevice, detectAuthChannel } from '../device'

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0'

function stubEnvAndNav(channel: string, ua: string): void {
  vi.stubEnv('VITE_AUTH_CHANNEL', channel)
  vi.stubGlobal('navigator', { userAgent: ua })
}

describe('isMobileDevice', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('should detect iPhone UA as mobile', () => {
    vi.stubGlobal('navigator', { userAgent: MOBILE_UA })
    expect(isMobileDevice()).toBe(true)
  })

  it('should detect Android UA as mobile', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) Mobile' })
    expect(isMobileDevice()).toBe(true)
  })

  it('should treat desktop UA as non-mobile', () => {
    vi.stubGlobal('navigator', { userAgent: DESKTOP_UA })
    expect(isMobileDevice()).toBe(false)
  })
})

describe('detectAuthChannel', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('should honor env override to cookie even on mobile', () => {
    stubEnvAndNav('cookie', MOBILE_UA)
    expect(detectAuthChannel()).toBe('cookie')
  })

  it('should honor env override to bearer even on PC', () => {
    stubEnvAndNav('bearer', DESKTOP_UA)
    expect(detectAuthChannel()).toBe('bearer')
  })

  it('should default PC to cookie channel', () => {
    stubEnvAndNav('', DESKTOP_UA)
    expect(detectAuthChannel()).toBe('cookie')
  })

  it('should default mobile to bearer channel', () => {
    stubEnvAndNav('', MOBILE_UA)
    expect(detectAuthChannel()).toBe('bearer')
  })
})
