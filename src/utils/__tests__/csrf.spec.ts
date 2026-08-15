import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getCsrfToken } from '../csrf'

describe('getCsrfToken', () => {
  beforeEach(() => {
    document.cookie = 'csrftoken=; path=/; Max-Age=-999999'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should return csrftoken value', () => {
    document.cookie = 'csrftoken=abc123; path=/'
    expect(getCsrfToken()).toBe('abc123')
  })

  it('should return null when csrftoken cookie absent', () => {
    document.cookie = 'session=xyz; path=/'
    expect(getCsrfToken()).toBeNull()
  })

  it('should return null outside browser environment', () => {
    vi.stubGlobal('document', undefined)
    expect(getCsrfToken()).toBeNull()
  })

  it('should decode percent-encoded token', () => {
    document.cookie = 'csrftoken=abc%2Bdef%2Fghi; path=/'
    expect(getCsrfToken()).toBe('abc+def/ghi')
  })

  it('should extract token when mixed with other cookies', () => {
    document.cookie = 'pre=1; path=/'
    document.cookie = 'csrftoken=token123; path=/'
    document.cookie = 'post=2; path=/'
    expect(getCsrfToken()).toBe('token123')
  })
})
