import { describe, it, expect, vi, beforeEach } from 'vitest'
import { lazyLoadDirective } from '../Image'

/**
 * 批次 5 M-FE-01：lazyLoadDirective 观察者生命周期测试。
 * mock 改「观察者实例数组」形态——每个 new IntersectionObserver 独立入库，
 * 支撑多元素独立、src 变更重建、竞态旧回调等断言（旧单回调 mock 无法表达）。
 */
interface MockObserverInstance {
  callback: IntersectionObserverCallback
  observe: ReturnType<typeof vi.fn>
  unobserve: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
}

const observerInstances: MockObserverInstance[] = []

vi.stubGlobal(
  'IntersectionObserver',
  class MockIntersectionObserver {
    callback: IntersectionObserverCallback
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback
      observerInstances.push(this as unknown as MockObserverInstance)
    }
  },
)

/** 触发指定观察者的 intersection 回调（entry.target 必须带真实 el） */
function triggerIntersect(
  observer: MockObserverInstance,
  target: HTMLImageElement,
  isIntersecting = true,
): void {
  observer.callback(
    [{ isIntersecting, target } as unknown as IntersectionObserverEntry],
    observer as unknown as IntersectionObserver,
  )
}

function makeBinding(value: string, oldValue?: string) {
  return { value, oldValue } as any
}

describe('Image utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    observerInstances.length = 0
  })

  describe('lazyLoadDirective', () => {
    it('should observe element and set placeholder on mounted', () => {
      const el = document.createElement('img') as HTMLImageElement

      lazyLoadDirective.mounted(el, makeBinding('http://example.com/image.jpg'))

      expect(observerInstances).toHaveLength(1)
      expect(observerInstances[0].observe).toHaveBeenCalledWith(el)
      expect(el.src).toContain('data:image/svg+xml')
    })

    it('should load image when intersecting', () => {
      const el = document.createElement('img') as HTMLImageElement

      lazyLoadDirective.mounted(el, makeBinding('http://example.com/image.jpg'))
      triggerIntersect(observerInstances[0], el)

      expect(el.src).toBe('http://example.com/image.jpg')
      expect(observerInstances[0].unobserve).toHaveBeenCalledWith(el)
    })

    it('should release old observer and rebuild on src change', () => {
      const el = document.createElement('img') as HTMLImageElement

      lazyLoadDirective.mounted(el, makeBinding('http://example.com/old.jpg'))
      lazyLoadDirective.updated(
        el,
        makeBinding('http://example.com/new.jpg', 'http://example.com/old.jpg'),
      )

      // 旧 observer 释放、新 observer 重建、回到占位图等待懒加载
      expect(observerInstances[0].disconnect).toHaveBeenCalled()
      expect(observerInstances).toHaveLength(2)
      expect(observerInstances[1].observe).toHaveBeenCalledWith(el)
      expect(el.src).toContain('data:image/svg+xml')

      triggerIntersect(observerInstances[1], el)
      expect(el.src).toBe('http://example.com/new.jpg')
    })

    it('should short-circuit on updated with unchanged src', () => {
      const el = document.createElement('img') as HTMLImageElement

      lazyLoadDirective.mounted(el, makeBinding('http://example.com/image.jpg'))
      triggerIntersect(observerInstances[0], el)
      lazyLoadDirective.updated(
        el,
        makeBinding('http://example.com/image.jpg', 'http://example.com/image.jpg'),
      )

      // 同值：不释放、不重建、已加载的 src 不被重置
      expect(observerInstances).toHaveLength(1)
      expect(observerInstances[0].disconnect).not.toHaveBeenCalled()
      expect(el.src).toBe('http://example.com/image.jpg')
    })

    it('should release observer and reset placeholder on empty src', () => {
      const el = document.createElement('img') as HTMLImageElement

      lazyLoadDirective.mounted(el, makeBinding('http://example.com/image.jpg'))
      triggerIntersect(observerInstances[0], el)
      lazyLoadDirective.updated(el, makeBinding('', 'http://example.com/image.jpg'))

      expect(observerInstances[0].disconnect).toHaveBeenCalled()
      expect(el.src).toContain('data:image/svg+xml')
    })

    it('should resume lazy loading after empty src gets a new value', () => {
      const el = document.createElement('img') as HTMLImageElement

      lazyLoadDirective.mounted(el, makeBinding('http://example.com/old.jpg'))
      lazyLoadDirective.updated(el, makeBinding('', 'http://example.com/old.jpg'))
      lazyLoadDirective.updated(el, makeBinding('http://example.com/new.jpg', ''))

      expect(observerInstances).toHaveLength(2)
      triggerIntersect(observerInstances[1], el)
      expect(el.src).toBe('http://example.com/new.jpg')
    })

    it('should disconnect observer on unmounted', () => {
      const el = document.createElement('img') as HTMLImageElement

      lazyLoadDirective.mounted(el, makeBinding('http://example.com/image.jpg'))
      lazyLoadDirective.unmounted(el, makeBinding('http://example.com/image.jpg'))

      expect(observerInstances[0].disconnect).toHaveBeenCalled()
    })

    it('should lazy load multiple elements independently', () => {
      const el1 = document.createElement('img') as HTMLImageElement
      const el2 = document.createElement('img') as HTMLImageElement

      lazyLoadDirective.mounted(el1, makeBinding('http://example.com/a.jpg'))
      lazyLoadDirective.mounted(el2, makeBinding('http://example.com/b.jpg'))

      triggerIntersect(observerInstances[1], el2)

      expect(el2.src).toBe('http://example.com/b.jpg')
      expect(el1.src).toContain('data:image/svg+xml')
    })

    it('should write new src on stale callback and keep new observer alive', () => {
      const el = document.createElement('img') as HTMLImageElement

      lazyLoadDirective.mounted(el, makeBinding('http://example.com/old.jpg'))
      lazyLoadDirective.updated(
        el,
        makeBinding('http://example.com/new.jpg', 'http://example.com/old.jpg'),
      )

      // 竞态：旧 observer 的回调在 updated 之后才送达——必须写新值而非旧值
      triggerIntersect(observerInstances[0], el)

      expect(el.src).toBe('http://example.com/new.jpg')
      // 新 observer 未被旧回调误释放，仍存活
      expect(observerInstances[1].unobserve).not.toHaveBeenCalled()
      expect(observerInstances[1].disconnect).not.toHaveBeenCalled()
    })
  })
})
