/**
 * useAssetOperationForm 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
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
})
