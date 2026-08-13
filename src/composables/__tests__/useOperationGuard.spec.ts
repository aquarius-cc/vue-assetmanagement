import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const mockPush = vi.fn()
const mockCanOperateAsset = ref(true)

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/composables/usePermission', () => ({
  usePermission: () => ({ canOperateAsset: mockCanOperateAsset }),
}))

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn() },
}))

import { useOperationGuard } from '../useOperationGuard'
import { ElMessage } from 'element-plus'
import { AxiosError, type AxiosResponse } from 'axios'

const mockElMessageError = vi.mocked(ElMessage.error)

function axiosErrorWithStatus(status: number): AxiosError {
  const response = {
    status,
    statusText: 'error',
    headers: {},
    config: {},
    data: {},
  } as AxiosResponse
  return new AxiosError('request failed', String(status), undefined, undefined, response)
}

describe('useOperationGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCanOperateAsset.value = true
  })

  describe('guardOnMounted', () => {
    it('returns true when user can operate assets', () => {
      const { guardOnMounted } = useOperationGuard()

      expect(guardOnMounted()).toBe(true)
      expect(mockPush).not.toHaveBeenCalled()
      expect(mockElMessageError).not.toHaveBeenCalled()
    })

    it('blocks and redirects when user cannot operate assets', () => {
      mockCanOperateAsset.value = false
      const { guardOnMounted } = useOperationGuard()

      expect(guardOnMounted()).toBe(false)
      expect(mockPush).toHaveBeenCalledWith('/main')
      expect(mockElMessageError).toHaveBeenCalledWith('您没有权限执行此操作')
    })
  })

  describe('handleForbiddenError', () => {
    it('returns true and redirects on 403 axios error', () => {
      const { handleForbiddenError } = useOperationGuard()

      expect(handleForbiddenError(axiosErrorWithStatus(403))).toBe(true)
      expect(mockPush).toHaveBeenCalledWith('/main')
    })

    it('returns false for non-403 status', () => {
      const { handleForbiddenError } = useOperationGuard()

      expect(handleForbiddenError(axiosErrorWithStatus(401))).toBe(false)
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('returns false for non-axios errors', () => {
      const { handleForbiddenError } = useOperationGuard()

      expect(handleForbiddenError(new Error('boom'))).toBe(false)
      expect(handleForbiddenError('plain string')).toBe(false)
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('handleConflictError', () => {
    it('returns true on 409 axios error', () => {
      const { handleConflictError } = useOperationGuard()

      expect(handleConflictError(axiosErrorWithStatus(409))).toBe(true)
    })

    it('returns false for non-409 status', () => {
      const { handleConflictError } = useOperationGuard()

      expect(handleConflictError(axiosErrorWithStatus(400))).toBe(false)
    })

    it('returns false for non-axios errors', () => {
      const { handleConflictError } = useOperationGuard()

      expect(handleConflictError(new Error('boom'))).toBe(false)
    })
  })
})
