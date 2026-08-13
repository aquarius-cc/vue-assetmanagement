import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ContractExcelRow } from '@/types/batch-import'

type PreviewRow = {
  data: ContractExcelRow
  validationStatus: 'success' | 'error'
  validationErrors: Record<string, string>
  validationErrorSummary: string
  submitStatus?: 'pending' | 'success' | 'error'
  submitError?: string
}

const {
  mockPreviewData,
  mockValidDataCount,
  mockParseError,
  mockHandleFileChange,
  mockClearData,
  mockBatchCreateContracts,
  mockSetRefreshFlag,
  mockGo,
  mockExtractErrorMessage,
} = vi.hoisted(() => {
  const mockPreviewData: { value: PreviewRow[] } = { value: [] }
  const mockValidDataCount: { value: number } = { value: 0 }
  const mockParseError: { value: string } = { value: '' }
  return {
    mockPreviewData,
    mockValidDataCount,
    mockParseError,
    mockHandleFileChange: vi.fn(async () => {}),
    mockClearData: vi.fn(),
    mockBatchCreateContracts: vi.fn(async () => ({
      total: 0,
      success_count: 0,
      fail_count: 0,
      success_items: [],
      fail_items: [],
    })),
    mockSetRefreshFlag: vi.fn(),
    mockGo: vi.fn(),
    mockExtractErrorMessage: vi.fn(() => '细节'),
  }
})

vi.mock('@/composables/useBatchImport', () => ({
  useBatchImport: () => ({
    previewData: mockPreviewData,
    validDataCount: mockValidDataCount,
    parseError: mockParseError,
    handleFileChange: mockHandleFileChange,
    clearData: mockClearData,
  }),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ go: mockGo }),
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/stores/contractStore', () => ({
  useContractStore: () => ({ setRefreshFlag: mockSetRefreshFlag }),
}))

vi.mock('@/api/contract', () => ({
  contractAPI: { batchCreateContracts: mockBatchCreateContracts },
}))

vi.mock('@/utils/SubmitBatch', () => ({
  extractErrorMessage: mockExtractErrorMessage,
}))

import { useContractBatchImport } from '../useContractBatchImport'
import { ElMessage } from 'element-plus'

const mockElMessageSuccess = vi.mocked(ElMessage.success)
const mockElMessageWarning = vi.mocked(ElMessage.warning)
const mockElMessageError = vi.mocked(ElMessage.error)
const mockElMessageInfo = vi.mocked(ElMessage.info)

function makeRow(overrides: Partial<ContractExcelRow> = {}): ContractExcelRow {
  return {
    contract_code: 'HT001',
    contract_name: '采购合同',
    supplier_name: '供应商A',
    contract_amount: '10000',
    contract_start_date: '2024-01-01',
    contract_type: 'service',
    contract_warranty_period: '3',
    contract_status: 'purchasing',
    ...overrides,
  } as unknown as ContractExcelRow
}

function makePreviewRow(
  overrides: Partial<PreviewRow> & { data?: Partial<ContractExcelRow> } = {},
): PreviewRow {
  return {
    data: makeRow(overrides.data),
    validationStatus: overrides.validationStatus ?? 'success',
    validationErrors: {},
    validationErrorSummary: '',
    ...overrides,
  }
}

describe('useContractBatchImport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPreviewData.value = []
    mockValidDataCount.value = 2
    mockBatchCreateContracts.mockResolvedValue({
      total: 1,
      success_count: 1,
      fail_count: 0,
      success_items: [],
      fail_items: [],
    })
  })

  describe('importConfig.validateItem', () => {
    it('合法数据校验通过', () => {
      const { importConfig } = useContractBatchImport()

      const result = importConfig.validateItem(makeRow())

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('编码/名称/供应商为空时校验失败', () => {
      const { importConfig } = useContractBatchImport()

      expect(importConfig.validateItem(makeRow({ contract_code: '' })).errors.contract_code).toBe(
        '合同编码不能为空',
      )
      expect(importConfig.validateItem(makeRow({ contract_name: ' ' })).errors.contract_name).toBe(
        '合同名称不能为空',
      )
      expect(importConfig.validateItem(makeRow({ supplier_name: ' ' })).errors.supplier_name).toBe(
        '供应商不能为空',
      )
    })

    it('金额非法时校验失败', () => {
      const { importConfig } = useContractBatchImport()

      expect(
        importConfig.validateItem(makeRow({ contract_amount: 'abc' })).errors.contract_amount,
      ).toBe('合同价格必须是有效数字且不小于0')
      expect(
        importConfig.validateItem(makeRow({ contract_amount: '-1' })).errors.contract_amount,
      ).toBe('合同价格必须是有效数字且不小于0')
    })

    it('签订日期为空或格式错误时校验失败', () => {
      const { importConfig } = useContractBatchImport()

      expect(
        importConfig.validateItem(makeRow({ contract_start_date: '' })).errors.contract_start_date,
      ).toBe('签订日期不能为空')
      expect(
        importConfig.validateItem(makeRow({ contract_start_date: '2024/01/01' })).errors
          .contract_start_date,
      ).toBe('签订日期格式应为 YYYY-MM-DD')
    })

    it('非字符串签订日期可解析并校验格式', () => {
      const { importConfig } = useContractBatchImport()

      expect(
        importConfig.validateItem(makeRow({ contract_start_date: '20240101' as never })).errors
          .contract_start_date,
      ).toBe('签订日期格式应为 YYYY-MM-DD')
    })

    it('合同类型无效时校验失败', () => {
      const { importConfig } = useContractBatchImport()

      expect(
        importConfig.validateItem(makeRow({ contract_type: 'unknown' })).errors.contract_type,
      ).toBe('合同类型无效')
    })

    it('保修期非法时校验失败', () => {
      const { importConfig } = useContractBatchImport()

      expect(
        importConfig.validateItem(makeRow({ contract_warranty_period: 'x' })).errors
          .contract_warranty_period,
      ).toBe('保修期必须是有效数字且不小于0')
    })

    it('合同状态无效时校验失败', () => {
      const { importConfig } = useContractBatchImport()

      expect(
        importConfig.validateItem(makeRow({ contract_status: 'unknown' })).errors.contract_status,
      ).toBe('合同状态无效')
    })

    it('初验/终验日期格式错误时校验失败', () => {
      const { importConfig } = useContractBatchImport()

      expect(
        importConfig.validateItem(makeRow({ initial_check_date: '2024/05/01' })).errors
          .initial_check_date,
      ).toBe('初验日期格式应为 YYYY-MM-DD')
      expect(
        importConfig.validateItem(makeRow({ final_check_date: '2024/06/01' })).errors
          .final_check_date,
      ).toBe('终验日期格式应为 YYYY-MM-DD')
    })

    it('结算价格/已付金额非法时校验失败', () => {
      const { importConfig } = useContractBatchImport()

      expect(
        importConfig.validateItem(makeRow({ settlemented_price: 'bad' })).errors.settlemented_price,
      ).toBe('结算价格必须是有效数字且不小于0')
      expect(importConfig.validateItem(makeRow({ amount_paid: '-3' })).errors.amount_paid).toBe(
        '已付金额必须是有效数字且不小于0',
      )
    })

    it('空字符串结算价格/已付金额不触发校验', () => {
      const { importConfig } = useContractBatchImport()

      const result = importConfig.validateItem(makeRow({ settlemented_price: '', amount_paid: '' }))

      expect(result.errors).not.toHaveProperty('settlemented_price')
      expect(result.errors).not.toHaveProperty('amount_paid')
    })
  })

  describe('importConfig.transformToApiData', () => {
    it('完整映射字段', () => {
      const { importConfig } = useContractBatchImport()

      const result = importConfig.transformToApiData(
        makeRow({ settlemented_price: '9000', initial_check_date: '2024-05-01' }),
      )

      expect(result.contract_code).toBe('HT001')
      expect(result.contract_amount).toBe(10000)
      expect(result.contract_warranty_period).toBe(3)
      expect(result.contract_status).toBe('purchasing')
      expect(result.settlemented_price).toBe(9000)
      expect(result.initial_check_date).toBe('2024-05-01')
    })

    it('未提供日期时映射为 null，缺失结算价格映射为 0', () => {
      const { importConfig } = useContractBatchImport()

      const result = importConfig.transformToApiData(
        makeRow({
          initial_check_date: undefined as never,
          final_check_date: undefined as never,
          settlemented_price: '',
        }),
      )

      expect(result.initial_check_date).toBeNull()
      expect(result.final_check_date).toBeNull()
      expect(result.settlemented_price).toBe(0)
    })

    it('非字符串日期转为字符串', () => {
      const { importConfig } = useContractBatchImport()

      const result = importConfig.transformToApiData(
        makeRow({ initial_check_date: 20240501 as never, contract_start_date: 20240101 as never }),
      )

      expect(result.initial_check_date).toBe('20240501')
      expect(result.contract_start_date).toBe('20240101')
    })
  })

  describe('handleSubmit', () => {
    it('无有效数据时警告', async () => {
      mockValidDataCount.value = 0
      mockPreviewData.value = [makePreviewRow({ validationStatus: 'error' })]
      const { handleSubmit } = useContractBatchImport()

      await handleSubmit()

      expect(mockElMessageWarning).toHaveBeenCalledWith('没有有效数据可提交')
      expect(mockBatchCreateContracts).not.toHaveBeenCalled()
    })

    it('全部成功后提示', async () => {
      mockPreviewData.value = [makePreviewRow(), makePreviewRow()]
      mockBatchCreateContracts.mockResolvedValue({
        total: 2,
        success_count: 2,
        fail_count: 0,
        success_items: [],
        fail_items: [],
      })
      const { handleSubmit, previewData } = useContractBatchImport()

      await handleSubmit()

      expect(mockElMessageSuccess).toHaveBeenCalledWith('全部导入成功！共 2 条')
      expect(mockSetRefreshFlag).toHaveBeenCalledWith(true)
      expect(previewData.value.every((r) => r.submitStatus === 'success')).toBe(true)
    })

    it('部分失败时行级标记并警告', async () => {
      mockPreviewData.value = [makePreviewRow(), makePreviewRow()]
      mockBatchCreateContracts.mockResolvedValue({
        total: 2,
        success_count: 1,
        fail_count: 1,
        success_items: [],
        fail_items: [{ index: 1, error_message: '编码重复' }],
      })
      const { handleSubmit, previewData } = useContractBatchImport()

      await handleSubmit()

      expect(previewData.value[0].submitStatus).toBe('success')
      expect(previewData.value[1].submitStatus).toBe('error')
      expect(previewData.value[1].submitError).toBe('编码重复')
      expect(mockElMessageWarning).toHaveBeenCalledWith('导入完成：成功 1 条，失败 1 条')
      expect(mockSetRefreshFlag).not.toHaveBeenCalled()
    })

    it('请求异常时提示导入失败', async () => {
      mockPreviewData.value = [makePreviewRow()]
      mockBatchCreateContracts.mockRejectedValue(new Error('网络错误'))
      const { handleSubmit } = useContractBatchImport()

      await handleSubmit()

      expect(mockElMessageError).toHaveBeenCalledWith('导入失败：细节')
      expect(mockExtractErrorMessage).toHaveBeenCalled()
    })
  })

  describe('上传与清空', () => {
    it('handleUploadChange raw 缺失时警告', async () => {
      const { handleUploadChange } = useContractBatchImport()

      await handleUploadChange({ raw: null } as never, [] as never)

      expect(mockElMessageWarning).toHaveBeenCalledWith('无法读取文件，请重新选择')
      expect(mockHandleFileChange).not.toHaveBeenCalled()
    })

    it('handleUploadChange 有 raw 时解析并重置页码', async () => {
      const rawFile = new File(['x'], 'c.xlsx')
      const { handleUploadChange, fileList, currentPreviewPage } = useContractBatchImport()
      currentPreviewPage.value = 3

      await handleUploadChange({ raw: rawFile } as never, [{ raw: rawFile }] as never)

      expect(mockHandleFileChange).toHaveBeenCalledWith(rawFile)
      expect(fileList.value).toHaveLength(1)
      expect(currentPreviewPage.value).toBe(1)
    })

    it('handleClear 清空全部状态', () => {
      const { handleClear, fileList, uploadRef, currentPreviewPage } = useContractBatchImport()
      fileList.value = [{ raw: new File(['x'], 'c.xlsx') }] as never
      currentPreviewPage.value = 2
      const clearFiles = vi.fn()
      uploadRef.value = { clearFiles } as never

      handleClear()

      expect(mockClearData).toHaveBeenCalled()
      expect(fileList.value).toEqual([])
      expect(clearFiles).toHaveBeenCalled()
      expect(currentPreviewPage.value).toBe(1)
      expect(mockElMessageInfo).toHaveBeenCalledWith('已清空所有数据')
    })
  })

  describe('分页与回退', () => {
    it('paginatedPreviewData 按 10 条分页', () => {
      mockPreviewData.value = Array.from({ length: 25 }, (_, i) =>
        makePreviewRow({ data: { contract_name: `合同${i}` } }),
      )
      const { paginatedPreviewData, currentPreviewPage } = useContractBatchImport()

      expect(paginatedPreviewData.value).toHaveLength(10)
      currentPreviewPage.value = 3
      expect(paginatedPreviewData.value).toHaveLength(5)
      expect(paginatedPreviewData.value[0].data.contract_name).toBe('合同20')
    })

    it('goBack 回退历史', () => {
      const { goBack } = useContractBatchImport()
      goBack()
      expect(mockGo).toHaveBeenCalledWith(-1)
    })
  })
})
