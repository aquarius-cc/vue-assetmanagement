import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPush = vi.hoisted(() => vi.fn())

vi.mock('@/router', () => ({
  default: {
    push: mockPush,
  },
}))

import { safeNavigate } from '@/utils/navigation'

describe('safeNavigate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('should allow internal paths', () => {
    it('allows root path', () => {
      safeNavigate('/')
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('allows nested path', () => {
      safeNavigate('/main/assetdetails/AST001')
      expect(mockPush).toHaveBeenCalledWith('/main/assetdetails/AST001')
    })

    it('allows path with query params', () => {
      safeNavigate('/main/dashboard?page=2')
      expect(mockPush).toHaveBeenCalledWith('/main/dashboard?page=2')
    })

    it('allows hash path', () => {
      safeNavigate('#/main/dashboard')
      expect(mockPush).toHaveBeenCalledWith('#/main/dashboard')
    })
  })

  describe('should block external URLs', () => {
    it('blocks http:// URLs', () => {
      safeNavigate('http://evil.com/phish')
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('blocks https:// URLs', () => {
      safeNavigate('https://evil.com/phish')
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('blocks protocol-relative URLs', () => {
      safeNavigate('//evil.com/phish')
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('should block dangerous protocols', () => {
    it('blocks javascript: protocol', () => {
      safeNavigate('javascript:alert(1)')
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('blocks javascript: with whitespace', () => {
      safeNavigate('  javascript:alert(1)')
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('blocks javascript: case-insensitive', () => {
      safeNavigate('JavaScript:alert(1)')
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('blocks data: protocol', () => {
      safeNavigate('data:text/html,<script>alert(1)</script>')
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('blocks vbscript: protocol', () => {
      safeNavigate('vbscript:MsgBox(1)')
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('should handle nullish values', () => {
    it('blocks null', () => {
      safeNavigate(null)
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('blocks undefined', () => {
      safeNavigate(undefined)
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('blocks empty string', () => {
      safeNavigate('')
      expect(mockPush).not.toHaveBeenCalled()
    })
  })
})
