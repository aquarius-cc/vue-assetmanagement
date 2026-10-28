import { describe, it, expect, vi } from 'vitest'
import { usePaginationSearchState, type SearchConfig } from '../usePaginationSearchState'

interface Item {
  id: number
}

function makeState(config: Partial<SearchConfig<Item>>) {
  return usePaginationSearchState<Item>({
    searchConfig: config,
    currentPage: { value: 1 },
    pageSize: { value: 20 },
    updateTotal: vi.fn(),
    loadList: vi.fn(async () => {}),
    messages: { searchFailed: '搜索失败' },
  })
}

describe('usePaginationSearchState — M-RC-13 stale 守卫', () => {
  it('performSearch 收到 undefined → 跳过写回，searchResults 保持现有数据', async () => {
    let responder: SearchConfig<Item>['performSearch'] = async () => ({
      count: 2,
      results: [{ id: 1 }, { id: 2 }],
    })
    const state = makeState({
      performSearch: (...args) => responder(...(args as unknown as [string, number, number])),
    })

    // 第一轮：成功写入 2 行
    await state.performSearch('kw')
    expect(state.searchResults.value).toHaveLength(2)

    // 第二轮：写诱发 stale → undefined → 不得清空搜索结果
    responder = async () => undefined
    await state.performSearch('kw')
    expect(state.searchResults.value).toHaveLength(2)
    expect(state.searchTotal.value).toBe(2)
  })

  it('performSearchWithParams 收到 undefined → 同样跳过写回', async () => {
    let responder: SearchConfig<Item>['performSearchWithParams'] = async () => ({
      count: 1,
      results: [{ id: 9 }],
    })
    const state = makeState({
      performSearch: async () => ({ count: 1, results: [{ id: 9 }] }),
      performSearchWithParams: (...args) =>
        responder(...(args as unknown as [Record<string, string>, number, number])),
    })

    // 第一轮：成功写入 1 行
    await state.performSearchWithParams({ q: 'x' })
    expect(state.searchResults.value).toHaveLength(1)

    // 第二轮：写诱发 stale → undefined → 不得清空搜索结果
    responder = async () => undefined
    await state.performSearchWithParams({ q: 'x' })
    expect(state.searchResults.value).toHaveLength(1)
  })
})
