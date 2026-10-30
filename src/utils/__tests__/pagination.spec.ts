import { describe, it, expect } from 'vitest'
import { MAX_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../pagination'

describe('PAGE_SIZE_OPTIONS', () => {
  it('exposes the shared pagination size options (single source of truth)', () => {
    expect(PAGE_SIZE_OPTIONS).toEqual([20, 50, 100])
  })

  // [M-23] 与后端上限一致性：任何可选项不得超过 MAX_PAGE_SIZE（core/constants.py:12 镜像），
  // 防止「选了没生效」的静默夹取再现（原 200/500 档即此缺陷）
  it('every option <= MAX_PAGE_SIZE (后端上限一致性)', () => {
    expect(Math.max(...PAGE_SIZE_OPTIONS)).toBeLessThanOrEqual(MAX_PAGE_SIZE)
  })

  it('preserves ascending order as the canonical currency', () => {
    const sorted = [...PAGE_SIZE_OPTIONS].sort((a, b) => a - b)
    expect(PAGE_SIZE_OPTIONS).toEqual(sorted)
  })

  it('contains only positive integers', () => {
    expect(PAGE_SIZE_OPTIONS.every((n) => Number.isInteger(n) && n > 0)).toBe(true)
  })
})
