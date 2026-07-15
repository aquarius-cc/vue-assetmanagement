import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDepartmentCache } from '../useDepartmentCache'

// Mock api/user
vi.mock('@/api/user', () => ({
  userAPI: {
    getEmployeeDepartment: vi.fn(),
  },
}))

describe('useDepartmentCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with empty cache', () => {
    const { cache } = useDepartmentCache()
    expect(Object.keys(cache)).toHaveLength(0)
  })

  it('should prefetch departments for given jobcodes', async () => {
    const { userAPI } = await import('@/api/user')
    const { prefetch, cache } = useDepartmentCache()

    const mockDept = {
      recordcode: '1',
      department_code: 'IT',
      department_name: 'IT部门',
      level: 1,
      parent_department_code: null,
      path: '/IT',
    }

    ;(userAPI.getEmployeeDepartment as any).mockResolvedValue(mockDept)

    await prefetch(['EMP001', 'EMP002'])

    expect(userAPI.getEmployeeDepartment).toHaveBeenCalledTimes(2)
    expect(cache['EMP001']).toEqual(mockDept)
    expect(cache['EMP002']).toEqual(mockDept)
  })

  it('should not fetch already cached jobcodes', async () => {
    const { userAPI } = await import('@/api/user')
    const { prefetch, cache } = useDepartmentCache()

    // Pre-populate cache
    cache['EMP001'] = {
      recordcode: '1',
      department_code: 'IT',
      department_name: 'IT部门',
      level: 1,
      parent_department_code: null,
      path: '/IT',
    }

    await prefetch(['EMP001', 'EMP002'])

    expect(userAPI.getEmployeeDepartment).toHaveBeenCalledTimes(1)
    expect(userAPI.getEmployeeDepartment).toHaveBeenCalledWith('EMP002')
  })

  it('should handle prefetch errors gracefully', async () => {
    const { userAPI } = await import('@/api/user')
    const { prefetch, cache } = useDepartmentCache()

    ;(userAPI.getEmployeeDepartment as any).mockRejectedValue(new Error('Network error'))

    await prefetch(['EMP001'])

    expect(cache['EMP001']).toBeUndefined()
  })

  it('should deduplicate jobcodes', async () => {
    const { userAPI } = await import('@/api/user')
    const { prefetch } = useDepartmentCache()

    await prefetch(['EMP001', 'EMP001', 'EMP002'])

    expect(userAPI.getEmployeeDepartment).toHaveBeenCalledTimes(2)
  })

  it('should filter out empty jobcodes', async () => {
    const { userAPI } = await import('@/api/user')
    const { prefetch } = useDepartmentCache()

    await prefetch(['', 'EMP001', undefined as any])

    expect(userAPI.getEmployeeDepartment).toHaveBeenCalledTimes(1)
    expect(userAPI.getEmployeeDepartment).toHaveBeenCalledWith('EMP001')
  })

  it('should return department name for cached jobcode', () => {
    const { cache, getDeptName } = useDepartmentCache()

    cache['EMP001'] = {
      recordcode: '1',
      department_code: 'IT',
      department_name: 'IT部门',
      level: 1,
      parent_department_code: null,
      path: '/IT',
    }

    expect(getDeptName('EMP001')).toBe('IT部门')
  })

  it('should return empty string for uncached jobcode', () => {
    const { getDeptName } = useDepartmentCache()
    expect(getDeptName('EMP999')).toBe('')
  })

  it('should return empty string for undefined jobcode', () => {
    const { getDeptName } = useDepartmentCache()
    expect(getDeptName(undefined)).toBe('')
  })

  it('should handle multiple prefetch calls', async () => {
    const { userAPI } = await import('@/api/user')
    const { prefetch, cache } = useDepartmentCache()

    const mockDept = {
      recordcode: '1',
      department_code: 'IT',
      department_name: 'IT部门',
      level: 1,
      parent_department_code: null,
      path: '/IT',
    }

    ;(userAPI.getEmployeeDepartment as any).mockResolvedValue(mockDept)

    await prefetch(['EMP001'])
    await prefetch(['EMP002'])

    expect(cache['EMP001']).toEqual(mockDept)
    expect(cache['EMP002']).toEqual(mockDept)
    expect(userAPI.getEmployeeDepartment).toHaveBeenCalledTimes(2)
  })
})