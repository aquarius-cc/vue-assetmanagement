import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGo, mockCreateRecycleAsset, mockBatchCreateRecycleAssets } = vi.hoisted(() => ({
  mockGo: vi.fn(),
  mockCreateRecycleAsset: vi.fn().mockResolvedValue({}),
  mockBatchCreateRecycleAssets: vi.fn().mockResolvedValue({
    success_count: 2,
    fail_count: 0,
    fail_items: [],
  }),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ go: mockGo }),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
  },
  ElMessageBox: {
    alert: vi.fn(),
  },
}))

vi.mock('axios', () => ({
  isAxiosError: vi.fn((err: unknown) => {
    return err && typeof err === 'object' && 'isAxiosError' in err
  }),
}))

vi.mock('@/api/recycleAsset', () => ({
  recycleAssetAPI: {
    createRecycleAsset: mockCreateRecycleAsset,
    batchCreateRecycleAssets: mockBatchCreateRecycleAssets,
  },
}))

import { useRecycleFormSubmit } from '../useRecycleFormSubmit'
import { ElMessage, ElMessageBox } from 'element-plus'

const mockElMessageSuccess = vi.mocked(ElMessage.success)
const mockElMessageError = vi.mocked(ElMessage.error)
const mockElMessageBoxAlert = vi.mocked(ElMessageBox.alert)

function createDefaultOptions() {
  return {
    isEditMode: vi.fn(() => false),
    currentRecordcode: vi.fn(() => undefined as string | undefined),
    selectedRecords: vi.fn(() => []),
    formData: vi.fn(() => ({
      outasset_recordcode: 'OUT-001',
      recycle_asset: 'Asset1',
      recycle_asset_number: 1,
      recycle_asset_storage_code: 'ST-001',
      recycle_asset_recycle_person_jobcode: 'EMP-001',
      recycle_asset_date: '2026-01-01',
      recycle_type: 'normal',
      recycle_asset_description: '',
      id: undefined as number | undefined,
    })),
    recycleStore: {
      update: vi.fn().mockResolvedValue({}),
      setRefreshFlag: vi.fn(),
    },
    setSubmitting: vi.fn(),
  }
}

describe('useRecycleFormSubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateRecycleAsset.mockResolvedValue({})
    mockBatchCreateRecycleAssets.mockResolvedValue({
      success_count: 2,
      fail_count: 0,
      fail_items: [],
    })
  })

  describe('initialization', () => {
    it('returns correct initial state', () => {
      const options = createDefaultOptions()
      const { confirmVisible, submitting, confirmData } = useRecycleFormSubmit(options)

      expect(confirmVisible.value).toBe(false)
      expect(submitting.value).toBe(false)
      expect(confirmData.value).toBeNull()
    })
  })

  describe('showConfirm', () => {
    it('sets confirm data and shows confirm dialog', () => {
      const options = createDefaultOptions()
      const { showConfirm, confirmData, confirmVisible } = useRecycleFormSubmit(options)

      const data = {
        actionType: 'batch',
        recordCount: 3,
        records: [],
        storageName: 'Storage1',
        personName: 'Person1',
        recycleDate: '2026-01-01',
        recycleType: 'normal',
      }

      showConfirm(data)

      expect(confirmData.value).toEqual(data)
      expect(confirmVisible.value).toBe(true)
    })
  })

  describe('doSubmit - edit mode', () => {
    it('calls recycleStore.update in edit mode', async () => {
      const options = createDefaultOptions()
      options.isEditMode = vi.fn(() => true)
      options.currentRecordcode = vi.fn(() => 'RC-001')
      const { doSubmit } = useRecycleFormSubmit(options)

      await doSubmit()

      expect(options.recycleStore.update).toHaveBeenCalledWith(
        expect.objectContaining({
          outasset_recordcode: 'RC-001',
          recycle_asset: 'Asset1',
        }),
      )
      expect(mockElMessageSuccess).toHaveBeenCalledWith('更新成功')
      expect(options.recycleStore.setRefreshFlag).toHaveBeenCalledWith(true)
      expect(mockGo).toHaveBeenCalledWith(-1)
    })
  })

  describe('doSubmit - single record', () => {
    it('calls createRecycleAsset for single selected record', async () => {
      const options = createDefaultOptions()
      options.selectedRecords = vi.fn(() => [{ recordcode: 'OUT-001', recycle_asset: 'Asset1' }])
      const { doSubmit } = useRecycleFormSubmit(options)

      await doSubmit()

      expect(mockCreateRecycleAsset).toHaveBeenCalledWith(
        expect.objectContaining({
          outasset_recordcode: 'OUT-001',
          recycle_asset: 'Asset1',
        }),
      )
      expect(mockElMessageSuccess).toHaveBeenCalledWith('回收登记成功')
    })
  })

  describe('doSubmit - batch', () => {
    it('calls batchCreateRecycleAssets for multiple records', async () => {
      const options = createDefaultOptions()
      options.selectedRecords = vi.fn(() => [
        { recordcode: 'OUT-001', recycle_asset: 'Asset1' },
        { recordcode: 'OUT-002', recycle_asset: 'Asset2' },
      ])
      const { doSubmit } = useRecycleFormSubmit(options)

      await doSubmit()

      expect(mockBatchCreateRecycleAssets).toHaveBeenCalledWith(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ recycle_outasset_code: 'OUT-001' }),
            expect.objectContaining({ recycle_outasset_code: 'OUT-002' }),
          ]),
        }),
      )
      expect(mockElMessageSuccess).toHaveBeenCalledWith('批量回收成功，共 2 条')
    })

    it('shows alert when batch has failures', async () => {
      mockBatchCreateRecycleAssets.mockResolvedValue({
        success_count: 1,
        fail_count: 1,
        fail_items: [{ row_number: 2, error_message: 'Asset not found' }],
      })

      const options = createDefaultOptions()
      options.selectedRecords = vi.fn(() => [
        { recordcode: 'OUT-001', recycle_asset: 'Asset1' },
        { recordcode: 'OUT-002', recycle_asset: 'Asset2' },
      ])
      const { doSubmit } = useRecycleFormSubmit(options)

      await doSubmit()

      expect(mockElMessageBoxAlert).toHaveBeenCalledWith(
        expect.stringContaining('成功 1 条，失败 1 条'),
        '批量回收结果',
        { type: 'warning' },
      )
    })
  })

  describe('doSubmit - error handling', () => {
    it('shows error message on API failure', async () => {
      mockCreateRecycleAsset.mockRejectedValue(new Error('Create failed'))

      const options = createDefaultOptions()
      options.selectedRecords = vi.fn(() => [{ recordcode: 'OUT-001', recycle_asset: 'Asset1' }])
      const { doSubmit } = useRecycleFormSubmit(options)

      await doSubmit()

      expect(mockElMessageError).toHaveBeenCalledWith('Create failed')
    })

    it('sets submitting state correctly', async () => {
      const options = createDefaultOptions()
      options.selectedRecords = vi.fn(() => [{ recordcode: 'OUT-001', recycle_asset: 'Asset1' }])
      const { doSubmit, submitting } = useRecycleFormSubmit(options)

      await doSubmit()

      expect(submitting.value).toBe(false)
      expect(options.setSubmitting).toHaveBeenCalledWith(false)
    })
  })
})
