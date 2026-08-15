import { describe, it, expect, beforeEach } from 'vitest'
import {
  setInMemoryAccessToken,
  getInMemoryAccessToken,
  clearInMemoryAccessToken,
} from '../tokenMemory'

describe('tokenMemory', () => {
  beforeEach(() => {
    clearInMemoryAccessToken()
  })

  it('should start with null token', () => {
    expect(getInMemoryAccessToken()).toBeNull()
  })

  it('should store and retrieve token', () => {
    setInMemoryAccessToken('in-memory-access')
    expect(getInMemoryAccessToken()).toBe('in-memory-access')
  })

  it('should clear token', () => {
    setInMemoryAccessToken('in-memory-access')
    clearInMemoryAccessToken()
    expect(getInMemoryAccessToken()).toBeNull()
  })

  it('should allow storing null to reset', () => {
    setInMemoryAccessToken('in-memory-access')
    setInMemoryAccessToken(null)
    expect(getInMemoryAccessToken()).toBeNull()
  })
})
