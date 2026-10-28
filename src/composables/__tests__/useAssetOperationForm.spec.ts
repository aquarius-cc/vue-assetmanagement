/**
 * useAssetOperationForm 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { AxiosError } from 'axios'
import { ElMessage } from 'element-plus'
import { useAssetOperationForm } from '../useAssetOperationForm'

// Mock vue-router
vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { code: 'TEST-001' },
  }),
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
}))

// Mock element-plus
vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock asset API
vi.mock('@/api/asset', () => ({
  assetAPI: {
    getAssetByCode: vi.fn(),
  },
}))

describe('useAssetOperationForm', () => {
  const mockSubmitFn = vi.fn()

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should initialize with correct default state', () => {
    const { loading, submitting, asset, assetCode } = useAssetOperationForm({
      submitFn: mockSubmitFn,
      successMessage: '操作成功',
    })

    expect(loading.value).toBe(true)
    expect(submitting.value).toBe(false)
    expect(asset.value).toBeNull()
    expect(assetCode.value).toBe('TEST-001')
  })

  it('should fetch asset on mount', async () => {
    const { loading, fetchAsset } = useAssetOperationForm({
      submitFn: mockSubmitFn,
      successMessage: '操作成功',
    })

    // Manually call fetchAsset since onMounted won't fire in unit tests
    await fetchAsset()

    expect(loading.value).toBe(false)
  })

  it('should handle submit with valid form', async () => {
    const mockFormRef = {
      validate: vi.fn((callback) => callback(true)),
    }

    const { handleSubmit, formRef } = useAssetOperationForm({
      submitFn: mockSubmitFn,
      successMessage: '操作成功',
    })

    // Set formRef
    formRef.value = mockFormRef as any

    await handleSubmit({ reason: 'test' })

    expect(mockSubmitFn).toHaveBeenCalledWith({ reason: 'test' })
  })

  it('should not submit when form validation fails', async () => {
    const mockFormRef = {
      validate: vi.fn((callback) => callback(false)),
    }

    const { handleSubmit, formRef } = useAssetOperationForm({
      submitFn: mockSubmitFn,
      successMessage: '操作成功',
    })

    formRef.value = mockFormRef as any

    await handleSubmit({ reason: 'test' })

    expect(mockSubmitFn).not.toHaveBeenCalled()
  })

  it('should not double-toast on axios error (M-RC-09 单出口)', async () => {
    const mockFormRef = {
      validate: vi.fn((callback) => callback(true)),
    }

    const axiosErr = new AxiosError('x', 'ERR_BAD_REQUEST', undefined as never, undefined, {
      status: 400,
      data: { message: '后端消息' },
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
    })
    mockSubmitFn.mockRejectedValue(axiosErr)

    const { handleSubmit, formRef } = useAssetOperationForm({
      submitFn: mockSubmitFn,
      successMessage: '操作成功',
      errorMessage: '操作失败，请稍后重试',
    })

    formRef.value = mockFormRef as any

    await handleSubmit({ reason: 'test' })

    // AxiosError 由拦截器已提示，表单层不再二次弹窗（旧实现会弹 options.errorMessage）
    expect(ElMessage.error).not.toHaveBeenCalled()
  })

  it('should toast once with backend business message on non-axios error', async () => {
    const mockFormRef = {
      validate: vi.fn((callback) => callback(true)),
    }

    mockSubmitFn.mockRejectedValue(new Error('维修单号不存在'))

    const { handleSubmit, formRef } = useAssetOperationForm({
      submitFn: mockSubmitFn,
      successMessage: '操作成功',
      errorMessage: '操作失败，请稍后重试',
    })

    formRef.value = mockFormRef as any

    await handleSubmit({ reason: 'test' })

    // 非 AxiosError（业务错误）→ 弹一次，后端业务消息优先于 options.errorMessage
    expect(ElMessage.error).toHaveBeenCalledTimes(1)
    expect(ElMessage.error).toHaveBeenCalledWith('维修单号不存在')
  })
})
