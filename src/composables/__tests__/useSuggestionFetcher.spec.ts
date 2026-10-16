import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSuggestionFetcher } from '../useSuggestionFetcher'

interface TestData {
  id: number
  name: string
  status: string
}

interface SuggestionItem {
  value: string
  id: number
}

describe('createSuggestionFetcher', () => {
  let fetchData: ReturnType<typeof vi.fn>
  let transform: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchData = vi.fn()
    transform = vi.fn((item: TestData) => ({ value: item.name, id: item.id }))
  })

  it('should return empty array for empty query', async () => {
    const fetcher = createSuggestionFetcher({ fetchData, transform })
    const cb = vi.fn()

    await fetcher('', cb)
    expect(cb).toHaveBeenCalledWith([])

    await fetcher('   ', cb)
    expect(cb).toHaveBeenCalledWith([])
  })

  it('should fetch, transform and call callback', async () => {
    const items: TestData[] = [
      { id: 1, name: 'Item1', status: 'active' },
      { id: 2, name: 'Item2', status: 'active' },
    ]
    fetchData.mockResolvedValue(items)

    const fetcher = createSuggestionFetcher({ fetchData, transform })
    const cb = vi.fn()

    await fetcher('query', cb)

    expect(fetchData).toHaveBeenCalledWith('query')
    expect(transform).toHaveBeenCalledTimes(2)
    expect(cb).toHaveBeenCalledWith([
      { value: 'Item1', id: 1 },
      { value: 'Item2', id: 2 },
    ])
  })

  it('should apply filter before transform', async () => {
    const items: TestData[] = [
      { id: 1, name: 'A', status: 'active' },
      { id: 2, name: 'B', status: 'inactive' },
    ]
    fetchData.mockResolvedValue(items)
    const filter = vi.fn((item: TestData) => item.status === 'active')

    const fetcher = createSuggestionFetcher({ fetchData, transform, filter })
    const cb = vi.fn()

    await fetcher('query', cb)

    expect(filter).toHaveBeenCalledTimes(2)
    expect(transform).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith([{ value: 'A', id: 1 }])
  })

  it('should apply keywordMatch after transform', async () => {
    const items: TestData[] = [
      { id: 1, name: 'Apple', status: 'active' },
      { id: 2, name: 'Banana', status: 'active' },
    ]
    fetchData.mockResolvedValue(items)
    const keywordMatch = vi.fn((item: SuggestionItem, keyword: string) =>
      item.value.toLowerCase().includes(keyword.toLowerCase()),
    )

    const fetcher = createSuggestionFetcher({ fetchData, transform, keywordMatch })
    const cb = vi.fn()

    await fetcher('app', cb)

    expect(keywordMatch).toHaveBeenCalledTimes(2)
    expect(cb).toHaveBeenCalledWith([{ value: 'Apple', id: 1 }])
  })

  it('should apply sort after transform', async () => {
    const items: TestData[] = [
      { id: 3, name: 'C', status: 'active' },
      { id: 1, name: 'A', status: 'active' },
    ]
    fetchData.mockResolvedValue(items)
    const sort = vi.fn((a: SuggestionItem, b: SuggestionItem) => a.id - b.id)

    const fetcher = createSuggestionFetcher({ fetchData, transform, sort })
    const cb = vi.fn()

    await fetcher('query', cb)

    expect(sort).toHaveBeenCalled()
    expect(cb).toHaveBeenCalledWith([
      { value: 'A', id: 1 },
      { value: 'C', id: 3 },
    ])
  })

  it('should apply filter, keywordMatch, and sort together', async () => {
    const items: TestData[] = [
      { id: 3, name: 'Cherry', status: 'active' },
      { id: 1, name: 'Apple', status: 'active' },
      { id: 2, name: 'Banana', status: 'inactive' },
    ]
    fetchData.mockResolvedValue(items)
    const filter = (item: TestData) => item.status === 'active'
    const keywordMatch = (item: SuggestionItem, kw: string) =>
      item.value.toLowerCase().includes(kw.toLowerCase())
    const sort = (a: SuggestionItem, b: SuggestionItem) => a.id - b.id

    const fetcher = createSuggestionFetcher({ fetchData, transform, filter, keywordMatch, sort })
    const cb = vi.fn()

    await fetcher('app', cb)

    expect(cb).toHaveBeenCalledWith([{ value: 'Apple', id: 1 }])
  })

  it('should return empty array and log error on fetch failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchData.mockRejectedValue(new Error('Network error'))

    const fetcher = createSuggestionFetcher({ fetchData, transform })
    const cb = vi.fn()

    await fetcher('query', cb)

    expect(cb).toHaveBeenCalledWith([])
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('获取建议失败'))
    consoleSpy.mockRestore()
  })

  it('should handle empty result from fetchData', async () => {
    fetchData.mockResolvedValue([])

    const fetcher = createSuggestionFetcher({ fetchData, transform })
    const cb = vi.fn()

    await fetcher('query', cb)

    expect(cb).toHaveBeenCalledWith([])
    expect(transform).not.toHaveBeenCalled()
  })

  it('should trim whitespace from query string', async () => {
    fetchData.mockResolvedValue([])

    const fetcher = createSuggestionFetcher({ fetchData, transform })
    const cb = vi.fn()

    await fetcher('  query  ', cb)

    expect(fetchData).toHaveBeenCalledWith('query')
  })

  it('should discard stale out-of-order response [BF-095/M-9]', async () => {
    let resolveFirst: (items: TestData[]) => void = () => {}
    fetchData
      .mockImplementationOnce(
        () =>
          new Promise<TestData[]>((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockResolvedValueOnce([{ id: 2, name: 'New' }])

    const fetcher = createSuggestionFetcher({ fetchData, transform })
    const cb = vi.fn()

    const first = fetcher('old', cb) // 挂起，后返回
    const second = fetcher('new', cb) // 先返回
    await second
    expect(cb).toHaveBeenCalledWith([{ value: 'New', id: 2 }])

    resolveFirst([{ id: 1, name: 'Old' }])
    await first
    // 过期响应被丢弃：cb 仍只被最新一次调用回填
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('should invalidate in-flight request when input cleared [BF-095/M-9]', async () => {
    let resolveFirst: (items: TestData[]) => void = () => {}
    fetchData.mockImplementationOnce(
      () =>
        new Promise<TestData[]>((resolve) => {
          resolveFirst = resolve
        }),
    )

    const fetcher = createSuggestionFetcher({ fetchData, transform })
    const cb = vi.fn()

    const first = fetcher('query', cb)
    await fetcher('', cb) // 清空输入
    expect(cb).toHaveBeenCalledWith([])

    resolveFirst([{ id: 1, name: 'Stale' }])
    await first
    expect(cb).toHaveBeenCalledTimes(1)
  })
})
