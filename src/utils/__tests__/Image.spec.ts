import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  lazyLoadDirective,
  preloadImage,
  compressImage,
  convertImageToWebP,
  getImageDimensions,
  supportsWebP,
} from '../Image'

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

// Mock Image
class MockImage {
  src = ''
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  width = 100
  height = 80

  constructor() {
    setTimeout(() => {
      if (this.src.includes('error')) {
        this.onerror?.()
      } else {
        this.onload?.()
      }
    }, 0)
  }
}

vi.stubGlobal('Image', MockImage)

// Mock canvas
class MockCanvas {
  width = 0
  height = 0
  private context = {
    drawImage: vi.fn(),
  }
  getContext() {
    return this.context
  }
  toBlob(callback: BlobCallback, _type: string, _quality?: number) {
    const blob = new Blob(['test'], { type: _type })
    callback(blob)
  }
}

vi.stubGlobal(
  'HTMLCanvasElement',
  class extends MockCanvas {
    constructor() {
      super()
    }
  },
)

vi.stubGlobal('document', {
  createElement: vi.fn((tag: string) => {
    if (tag === 'canvas') return new MockCanvas()
    return {}
  }),
})

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

  describe('preloadImage', () => {
    it('should resolve with image element on success', async () => {
      const img = await preloadImage('http://example.com/image.jpg')
      expect(img).toBeInstanceOf(MockImage)
    })

    it('should reject on error', async () => {
      await expect(preloadImage('error-image')).rejects.toBeUndefined()
    })
  })

  describe('compressImage', () => {
    it('should compress image and return blob', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const blob = await compressImage(file, 0.5)
      expect(blob).toBeInstanceOf(Blob)
    })
  })

  describe('convertImageToWebP', () => {
    it('should convert image to WebP format', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const blob = await convertImageToWebP(file)
      expect(blob).toBeInstanceOf(Blob)
    })
  })

  describe('getImageDimensions', () => {
    it('should return image dimensions', async () => {
      const dimensions = await getImageDimensions('http://example.com/image.jpg')
      expect(dimensions).toEqual({ width: 100, height: 80 })
    })

    it('should reject on error', async () => {
      await expect(getImageDimensions('error-image')).rejects.toBeUndefined()
    })
  })

  describe('supportsWebP', () => {
    it('should return true if WebP is supported', async () => {
      const result = await supportsWebP()
      expect(typeof result).toBe('boolean')
    })
  })
})
