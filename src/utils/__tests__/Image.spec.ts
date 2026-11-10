import { describe, it, expect, vi, beforeEach } from 'vitest'
import { lazyLoadDirective } from '../Image'

// Mock IntersectionObserver
const mockObserve = vi.fn()
const mockUnobserve = vi.fn()
const mockDisconnect = vi.fn()
let intersectionCallback: IntersectionObserverCallback | null = null

vi.stubGlobal(
  'IntersectionObserver',
  class MockIntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {
      intersectionCallback = callback
    }
    observe = mockObserve
    unobserve = mockUnobserve
    disconnect = mockDisconnect
  },
)

describe('Image utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    intersectionCallback = null
  })

  describe('lazyLoadDirective', () => {
    it('should observe element on mounted', () => {
      const el = document.createElement('img') as HTMLImageElement
      const binding = { value: 'http://example.com/image.jpg' } as any

      lazyLoadDirective.mounted(el, binding)

      expect(mockObserve).toHaveBeenCalledWith(el)
      expect(el.src).toContain('data:image/svg+xml')
    })

    it('should load image when intersecting', () => {
      const el = document.createElement('img') as HTMLImageElement
      const binding = { value: 'http://example.com/image.jpg' } as any

      lazyLoadDirective.mounted(el, binding)

      // Simulate intersection
      if (intersectionCallback) {
        intersectionCallback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        )
      }

      expect(el.src).toBe('http://example.com/image.jpg')
      expect(mockUnobserve).toHaveBeenCalledWith(el)
    })

    it('should update src when binding value changes', () => {
      const el = document.createElement('img') as HTMLImageElement
      const binding = {
        value: 'http://example.com/new.jpg',
        oldValue: 'http://example.com/old.jpg',
      } as any

      lazyLoadDirective.updated(el, binding)

      expect(el.src).toBe('http://example.com/new.jpg')
    })
  })
})
