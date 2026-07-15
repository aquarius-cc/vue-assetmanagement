import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitBatch, extractErrorMessage } from '../SubmitBatch'
import { isAxiosError } from 'axios'

// Mock axios
vi.mock('axios', () => ({
  isAxiosError: vi.fn((error: unknown): error is any => {
    return error !== null && typeof error === 'object' && 'isAxiosError' in error
  }),
}))

describe('SubmitBatch', () => {
  describe('extractErrorMessage', () => {
    it('should extract detail from Axios error', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          data: {
            detail: 'Validation error',
          },
        },
      }
      ;(isAxiosError as any).mockReturnValue(true)
      expect(extractErrorMessage(axiosError)).toBe('Validation error')
    })

    it('should extract array detail from Axios error', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          data: {
            detail: ['Error 1', 'Error 2'],
          },
        },
      }
      ;(isAxiosError as any).mockReturnValue(true)
      expect(extractErrorMessage(axiosError)).toBe('Error 1；Error 2')
    })

    it('should extract message from Axios error', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          data: {
            message: 'Field error',
          },
        },
      }
      ;(isAxiosError as any).mockReturnValue(true)
      expect(extractErrorMessage(axiosError)).toBe('Field error')
    })

    it('should extract field errors from Axios error', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          data: {
            name: ['Required'],
            email: ['Invalid format'],
          },
        },
      }
      ;(isAxiosError as any).mockReturnValue(true)
      const result = extractErrorMessage(axiosError)
      expect(result).toContain('name: Required')
      expect(result).toContain('email: Invalid format')
    })

    it('should return HTTP status fallback for Axios error', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: {},
        },
      }
      ;(isAxiosError as any).mockReturnValue(true)
      expect(extractErrorMessage(axiosError)).toBe('请求失败 (404)')
    })

    it('should extract message from Error object', () => {
      const error = new Error('Standard error')
      ;(isAxiosError as any).mockReturnValue(false)
      expect(extractErrorMessage(error)).toBe('Standard error')
    })

    it('should handle string errors', () => {
      ;(isAxiosError as any).mockReturnValue(false)
      expect(extractErrorMessage('String error')).toBe('String error')
    })

    it('should return fallback for unknown errors', () => {
      ;(isAxiosError as any).mockReturnValue(false)
      expect(extractErrorMessage(null)).toBe('未知错误')
      expect(extractErrorMessage(undefined)).toBe('未知错误')
      expect(extractErrorMessage(123)).toBe('未知错误')
    })
  })

  describe('submitBatch', () => {
    it('should submit all items successfully', async () => {
      const dataList = [{ id: 1 }, { id: 2 }, { id: 3 }]
      const createFn = vi.fn().mockResolvedValue({})
      const options = {
        entityName: 'Test',
        idField: 'id' as keyof { id: number },
      }

      const result = await submitBatch(dataList, createFn, options)

      expect(result.successCount).toBe(3)
      expect(result.failedItems).toHaveLength(0)
      expect(createFn).toHaveBeenCalledTimes(3)
    })

    it('should handle mixed success and failure', async () => {
      const dataList = [{ id: 1 }, { id: 2 }, { id: 3 }]
      const createFn = vi.fn().mockImplementation((item: { id: number }) => {
        if (item.id === 2) {
          return Promise.reject(new Error('Failed item 2'))
        }
        return Promise.resolve({})
      })
      const options = {
        entityName: 'Test',
        idField: 'id' as keyof { id: number },
      }

      const result = await submitBatch(dataList, createFn, options)

      expect(result.successCount).toBe(2)
      expect(result.failedItems).toHaveLength(1)
      expect(result.failedItems[0].item).toEqual({ id: 2 })
      expect(result.failedItems[0].error).toBe('Failed item 2')
    })

    it('should respect concurrency setting', async () => {
      const dataList = Array.from({ length: 10 }, (_, i) => ({ id: i }))
      const createFn = vi.fn().mockResolvedValue({})
      const options = {
        entityName: 'Test',
        idField: 'id' as keyof { id: number },
        concurrency: 2,
      }

      await submitBatch(dataList, createFn, options)

      expect(createFn).toHaveBeenCalledTimes(10)
    })

    it('should handle empty data list', async () => {
      const createFn = vi.fn()
      const options = {
        entityName: 'Test',
        idField: 'id' as keyof { id: number },
      }

      const result = await submitBatch([], createFn, options)

      expect(result.successCount).toBe(0)
      expect(result.failedItems).toHaveLength(0)
      expect(createFn).not.toHaveBeenCalled()
    })

    it('should handle all items failing', async () => {
      const dataList = [{ id: 1 }, { id: 2 }]
      const createFn = vi.fn().mockRejectedValue(new Error('Always fails'))
      const options = {
        entityName: 'Test',
        idField: 'id' as keyof { id: number },
      }

      const result = await submitBatch(dataList, createFn, options)

      expect(result.successCount).toBe(0)
      expect(result.failedItems).toHaveLength(2)
    })
  })
})