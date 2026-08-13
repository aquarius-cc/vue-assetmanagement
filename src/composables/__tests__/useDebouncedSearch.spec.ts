/**
 * useDebouncedSearch 测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useDebouncedSearch } from '../useDebouncedSearch'

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return debouncedCallback', () => {
    const callback = vi.fn()
    const source = ref('')

    const { debouncedCallback } = useDebouncedSearch(source, callback)

    expect(debouncedCallback).toBeDefined()
    expect(typeof debouncedCallback).toBe('function')
  })

  it('should debounce when called directly', () => {
    const callback = vi.fn()
    const source = ref('')

    const { debouncedCallback } = useDebouncedSearch(source, callback)

    debouncedCallback('test')
    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(300)
    expect(callback).toHaveBeenCalledWith('test')
  })

  it('should use custom delay', () => {
    const callback = vi.fn()
    const source = ref('')

    const { debouncedCallback } = useDebouncedSearch(source, callback, { delay: 500 })

    debouncedCallback('test')
    vi.advanceTimersByTime(300)
    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)
    expect(callback).toHaveBeenCalledWith('test')
  })

  it('should cancel previous pending callback', () => {
    const callback = vi.fn()
    const source = ref('')

    const { debouncedCallback } = useDebouncedSearch(source, callback)

    debouncedCallback('first')
    vi.advanceTimersByTime(100)
    debouncedCallback('second')
    vi.advanceTimersByTime(300)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('second')
  })

  it('should support leading option', () => {
    const callback = vi.fn()
    const source = ref('')

    const { debouncedCallback } = useDebouncedSearch(source, callback, {
      leading: true,
      trailing: false,
    })

    debouncedCallback('test')
    expect(callback).toHaveBeenCalledWith('test')

    vi.advanceTimersByTime(300)
    expect(callback).toHaveBeenCalledTimes(1)
  })
})
