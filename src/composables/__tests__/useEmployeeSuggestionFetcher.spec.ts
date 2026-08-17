import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/user', () => ({
  userAPI: {
    getFuzzySearch: vi.fn().mockResolvedValue({ results: [] }),
  },
}))

import { useEmployeeSuggestionFetcher } from '../useEmployeeSuggestionFetcher'
import { userAPI } from '@/api/user'

const mockGetFuzzySearch = vi.mocked(userAPI.getFuzzySearch)

describe('useEmployeeSuggestionFetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFuzzySearch.mockResolvedValue({ results: [] })
  })

  describe('initialization', () => {
    it('returns a function', () => {
      const fetcher = useEmployeeSuggestionFetcher()

      expect(typeof fetcher).toBe('function')
    })
  })

  describe('empty query', () => {
    it('returns empty array for empty string', async () => {
      const fetcher = useEmployeeSuggestionFetcher()
      const cb = vi.fn()

      await fetcher('', cb)

      expect(cb).toHaveBeenCalledWith([])
      expect(mockGetFuzzySearch).not.toHaveBeenCalled()
    })

    it('returns empty array for whitespace-only query', async () => {
      const fetcher = useEmployeeSuggestionFetcher()
      const cb = vi.fn()

      await fetcher('   ', cb)

      expect(cb).toHaveBeenCalledWith([])
    })
  })

  describe('fetching suggestions', () => {
    it('calls userAPI.getFuzzySearch with keyword', async () => {
      const employees = [
        {
          employee_name: 'John',
          employee_jobcode: 'EMP-001',
          employee_status: 'active',
          employee_department_name: 'IT',
        },
      ]
      mockGetFuzzySearch.mockResolvedValue({ results: employees })

      const fetcher = useEmployeeSuggestionFetcher()
      const cb = vi.fn()

      await fetcher('John', cb)

      expect(mockGetFuzzySearch).toHaveBeenCalledWith({ keyword: 'John', page_size: 20 })
    })

    it('filters only active employees', async () => {
      const employees = [
        {
          employee_name: 'Active',
          employee_jobcode: 'EMP-001',
          employee_status: 'active',
          employee_department_name: 'IT',
        },
        {
          employee_name: 'Inactive',
          employee_jobcode: 'EMP-002',
          employee_status: 'left',
          employee_department_name: 'HR',
        },
      ]
      mockGetFuzzySearch.mockResolvedValue({ results: employees })

      const fetcher = useEmployeeSuggestionFetcher()
      const cb = vi.fn()

      await fetcher('test', cb)

      expect(cb).toHaveBeenCalledWith([
        {
          value: 'Active',
          employee_name: 'Active',
          employee_jobcode: 'EMP-001',
          employee_department_name: 'IT',
        },
      ])
    })

    it('transforms employees to suggestion items', async () => {
      const employees = [
        {
          employee_name: 'Alice',
          employee_jobcode: 'EMP-003',
          employee_status: 'active',
          employee_department_name: 'Finance',
        },
      ]
      mockGetFuzzySearch.mockResolvedValue({ results: employees })

      const fetcher = useEmployeeSuggestionFetcher()
      const cb = vi.fn()

      await fetcher('Alice', cb)

      expect(cb).toHaveBeenCalledWith([
        {
          value: 'Alice',
          employee_name: 'Alice',
          employee_jobcode: 'EMP-003',
          employee_department_name: 'Finance',
        },
      ])
    })

    it('handles null department name', async () => {
      const employees = [
        {
          employee_name: 'Bob',
          employee_jobcode: 'EMP-004',
          employee_status: 'active',
          employee_department_name: null,
        },
      ]
      mockGetFuzzySearch.mockResolvedValue({ results: employees })

      const fetcher = useEmployeeSuggestionFetcher()
      const cb = vi.fn()

      await fetcher('Bob', cb)

      expect(cb).toHaveBeenCalledWith([
        {
          value: 'Bob',
          employee_name: 'Bob',
          employee_jobcode: 'EMP-004',
          employee_department_name: '',
        },
      ])
    })
  })

  describe('error handling', () => {
    it('returns empty array on API failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockGetFuzzySearch.mockRejectedValue(new Error('Network error'))

      const fetcher = useEmployeeSuggestionFetcher()
      const cb = vi.fn()

      await fetcher('test', cb)

      expect(cb).toHaveBeenCalledWith([])
      consoleSpy.mockRestore()
    })
  })

  describe('empty results', () => {
    it('returns empty array when no employees match', async () => {
      mockGetFuzzySearch.mockResolvedValue({ results: [] })

      const fetcher = useEmployeeSuggestionFetcher()
      const cb = vi.fn()

      await fetcher('nonexistent', cb)

      expect(cb).toHaveBeenCalledWith([])
    })
  })
})
