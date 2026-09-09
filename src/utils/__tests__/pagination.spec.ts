import { describe, it, expect } from 'vitest'
import { PAGE_SIZE_OPTIONS } from '../pagination'

describe('PAGE_SIZE_OPTIONS', () => {
  it('exposes the shared pagination size options (single source of truth)', () => {
    expect(PAGE_SIZE_OPTIONS).toEqual([10, 20, 50])
  })

  it('preserves ascending order as the canonical currency', () => {
    const sorted = [...PAGE_SIZE_OPTIONS].sort((a, b) => a - b)
    expect(PAGE_SIZE_OPTIONS).toEqual(sorted)
  })

  it('contains only positive integers', () => {
    expect(PAGE_SIZE_OPTIONS.every((n) => Number.isInteger(n) && n > 0)).toBe(true)
  })
})
