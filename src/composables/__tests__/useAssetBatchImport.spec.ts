import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AssetExcelRow } from '@/types/batch-import'

type PreviewRow = {
  data: AssetExcelRow
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
  mockBatchCreateAssets,
  mockSetRefreshFlag,
  mockPush,
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
    mockBatchCreateAssets: vi.fn(async () => ({
      total: 0,
      success_count: 0,
      fail_count: 0,
      success_items: [],
      fail_items: [],
    })),
    mockSetRefreshFlag: vi.fn(),
    mockPush: vi.fn(),
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
  useRouter: () => ({ push: mockPush, go: mockGo }),
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/stores/assetStore', () => ({
  useAssetStore: () => ({
    batchCreateAssets: mockBatchCreateAssets,
    setRefreshFlag: mockSetRefreshFlag,
  }),
}))

vi.mock('@/utils/SubmitBatch', () => ({
  extractErrorMessage: mockExtractErrorMessage,
}))

import { useAssetBatchImport } from '../useAssetBatchImport'
import { ElMessage } from 'element-plus'

const mockElMessageSuccess = vi.mocked(ElMessage.success)
const mockElMessageWarning = vi.mocked(ElMessage.warning)
const mockElMessageError = vi.mocked(ElMessage.error)
const mockElMessageInfo = vi.mocked(ElMessage.info)

function makeRow(overrides: Partial<AssetExcelRow> = {}): AssetExcelRow {
  return {
    asset_name: '笔记本',
    asset_specification: 'X1',
    asset_purchase_price: '5000',
    asset_purchase_number: '2',
    asset_entry_date: '2024-01-01',
    asset_type: 'laptop',
    asset_current_status: 'in_store',
    ...overrides,
  } as unknown as AssetExcelRow
}

function makePreviewRow(
  overrides: Partial<PreviewRow> & { data?: Partial<AssetExcelRow> } = {},
): PreviewRow {
  return {
    data: makeRow(overrides.data),
    validationStatus: overrides.validationStatus ?? 'success',
    validationErrors: {},
    validationErrorSummary: '',
    ...overrides,
  }
}

describe('useAssetBatchImport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPreviewData.value = []
    mockBatchCreateAssets.mockResolvedValue({
      total: 1,
      success_count: 1,
      fail_count: 0,
      success_items: [],
      fail_items: [],
    })
  })

  describe('importConfig.validateItem', () => {
    it('合法数据校验通过', () => {
      const { importConfig } = useAssetBatchImport()

      const result = importConfig.validateItem(makeRow())

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('名称为空/过短/过长时校验失败', () => {
      const { importConfig } = useAssetBatchImport()

      expect(importConfig.validateItem(makeRow({ asset_name: '  ' })).errors.asset_name).toBe(
        '资产名称不能为空',
      )
      expect(importConfig.validateItem(makeRow({ asset_name: 'A' })).errors.asset_name).toBe(
        '名称长度 2-100 个字符',
      )
      expect(
        importConfig.validateItem(makeRow({ asset_name: 'A'.repeat(101) })).errors.asset_name,
      ).toBe('名称长度 2-100 个字符')
    })

    it('规格型号为空时校验失败', () => {
      const { importConfig } = useAssetBatchImport()
      expect(importConfig.validateItem(makeRow({ asset_specification: '' })).errors).toHaveProperty(
        'asset_specification',
      )
    })

    it('价格非数字或负数时校验失败', () => {
      const { importConfig } = useAssetBatchImport()
      expect(
        importConfig.validateItem(makeRow({ asset_purchase_price: 'abc' })).errors
          .asset_purchase_price,
      ).toBe('单价必须是有效数字且不小于0')
      expect(
        importConfig.validateItem(makeRow({ asset_purchase_price: '-5' })).errors
          .asset_purchase_price,
      ).toBe('单价必须是有效数字且不小于0')
    })

    it('数量非整数/小于1/非数字时校验失败', () => {
      const { importConfig } = useAssetBatchImport()
      expect(
        importConfig.validateItem(makeRow({ asset_purchase_number: '1.5' })).errors
          .asset_purchase_number,
      ).toBe('采购数量必须是正整数')
      expect(
        importConfig.validateItem(makeRow({ asset_purchase_number: '0' })).errors
          .asset_purchase_number,
      ).toBe('采购数量必须是正整数')
      expect(
        importConfig.validateItem(makeRow({ asset_purchase_number: 'abc' })).errors
          .asset_purchase_number,
      ).toBe('采购数量必须是正整数')
    })

    it('入库日期格式错误时校验失败', () => {
      const { importConfig } = useAssetBatchImport()
      expect(
        importConfig.validateItem(makeRow({ asset_entry_date: '2024/01/01' })).errors
          .asset_entry_date,
      ).toBe('入库日期格式应为 YYYY-MM-DD')
    })

    it('资产分类编码为空时校验失败', () => {
      const { importConfig } = useAssetBatchImport()
      expect(importConfig.validateItem(makeRow({ asset_type: '  ' })).errors.asset_type).toBe(
        '资产分类编码不能为空',
      )
    })

    it('采购日期格式错误时校验失败', () => {
      const { importConfig } = useAssetBatchImport()
      expect(
        importConfig.validateItem(makeRow({ asset_purchase_date: '05-01-2024' })).errors
          .asset_purchase_date,
      ).toBe('采购日期格式应为 YYYY-MM-DD')
    })

    it('质保期非法时校验失败', () => {
      const { importConfig } = useAssetBatchImport()
      expect(
        importConfig.validateItem(makeRow({ asset_warranty_period: 'x' })).errors
          .asset_warranty_period,
      ).toBe('质保期必须是有效数字')
      expect(
        importConfig.validateItem(makeRow({ asset_warranty_period: '-1' })).errors
          .asset_warranty_period,
      ).toBe('质保期必须是有效数字')
    })

    it('状态值非法时校验失败', () => {
      const { importConfig } = useAssetBatchImport()
      expect(
        importConfig.validateItem(makeRow({ asset_current_status: 'invalid' })).errors
          .asset_current_status,
      ).toBe('当前状态值非法')
    })

    it('合法状态值校验通过', () => {
      const { importConfig } = useAssetBatchImport()
      for (const status of ['in_store', 'recycled_pending', 'in_use', 'damaged', 'scrapped']) {
        expect(importConfig.validateItem(makeRow({ asset_current_status: status })).valid).toBe(
          true,
        )
      }
    })
  })

  describe('importConfig.transformToApiData', () => {
    it('完整映射字段并去除空白', () => {
      const { importConfig } = useAssetBatchImport()

      const result = importConfig.transformToApiData(
        makeRow({
          asset_brand: ' 联想 ',
          asset_warranty_period: '3',
          asset_purchase_price: '5000',
        }),
      )

      expect(result.asset_name).toBe('笔记本')
      expect(result.asset_brand).toBe('联想')
      expect(result.asset_purchase_price).toBe('5000')
      expect(result.asset_purchase_number).toBe(2)
      expect(result.asset_warranty_period).toBe(3)
      expect(result.asset_type).toBe('laptop')
    })

    it('可选字段为空时映射为 null', () => {
      const { importConfig } = useAssetBatchImport()

      const result = importConfig.transformToApiData(
        makeRow({
          asset_brand: '',
          asset_unit: ' ',
          asset_purchase_date: '',
          asset_warranty_period: '',
          asset_description: '   ',
        }),
      )

      expect(result.asset_brand).toBeNull()
      expect(result.asset_unit).toBeNull()
      expect(result.asset_purchase_date).toBeNull()
      expect(result.asset_warranty_period).toBeNull()
      expect(result.asset_description).toBeNull()
    })
  })

  describe('预览分页', () => {
    it('paginatedPreviewData 按 10 条分页', () => {
      mockPreviewData.value = Array.from({ length: 25 }, (_, i) =>
        makePreviewRow({ data: { asset_name: `资产${i}` } }),
      )
      const { paginatedPreviewData, currentPreviewPage } = useAssetBatchImport()

      expect(paginatedPreviewData.value).toHaveLength(10)
      expect(paginatedPreviewData.value[0].data.asset_name).toBe('资产0')

      currentPreviewPage.value = 3
      expect(paginatedPreviewData.value).toHaveLength(5)
      expect(paginatedPreviewData.value[0].data.asset_name).toBe('资产20')
    })

    it('handlePreviewPageChange 更新页码', () => {
      const { handlePreviewPageChange, currentPreviewPage } = useAssetBatchImport()

      handlePreviewPageChange(5)

      expect(currentPreviewPage.value).toBe(5)
    })
  })

  describe('handleUploadChange', () => {
    it('raw 文件缺失时警告', async () => {
      const { handleUploadChange } = useAssetBatchImport()

      await handleUploadChange({ raw: null } as never, [] as never)

      expect(mockElMessageWarning).toHaveBeenCalledWith('无法读取文件，请重新选择')
      expect(mockHandleFileChange).not.toHaveBeenCalled()
    })

    it('有 raw 文件时解析并重置页码', async () => {
      const rawFile = new File(['x'], 'a.xlsx')
      const { handleUploadChange, fileList, currentPreviewPage } = useAssetBatchImport()
      currentPreviewPage.value = 3

      await handleUploadChange({ raw: rawFile } as never, [{ raw: rawFile }] as never)

      expect(mockHandleFileChange).toHaveBeenCalledWith(rawFile)
      expect(fileList.value).toHaveLength(1)
      expect(currentPreviewPage.value).toBe(1)
    })
  })

  describe('handleSubmit', () => {
    it('无有效数据时警告', async () => {
      mockPreviewData.value = [makePreviewRow({ validationStatus: 'error' })]
      const { handleSubmit } = useAssetBatchImport()

      await handleSubmit()

      expect(mockElMessageWarning).toHaveBeenCalledWith('没有有效数据可提交')
      expect(mockBatchCreateAssets).not.toHaveBeenCalled()
    })

    it('全部成功后提示并返回', async () => {
      mockPreviewData.value = [makePreviewRow(), makePreviewRow()]
      mockBatchCreateAssets.mockResolvedValue({
        total: 2,
        success_count: 2,
        fail_count: 0,
        success_items: [],
        fail_items: [],
      })
      const { handleSubmit, previewData } = useAssetBatchImport()

      await handleSubmit()

      expect(mockElMessageSuccess).toHaveBeenCalledWith('全部导入成功！共 2 条')
      expect(mockSetRefreshFlag).toHaveBeenCalledWith(true)
      expect(mockGo).toHaveBeenCalledWith(-1)
      expect(previewData.value.every((r) => r.submitStatus === 'success')).toBe(true)
    })

    it('部分失败时行级标记并警告', async () => {
      mockPreviewData.value = [makePreviewRow(), makePreviewRow()]
      mockBatchCreateAssets.mockResolvedValue({
        total: 2,
        success_count: 1,
        fail_count: 1,
        success_items: [],
        fail_items: [{ index: 1, error_message: '单号重复' }],
      })
      const { handleSubmit, previewData } = useAssetBatchImport()

      await handleSubmit()

      expect(previewData.value[0].submitStatus).toBe('success')
      expect(previewData.value[1].submitStatus).toBe('error')
      expect(previewData.value[1].submitError).toBe('单号重复')
      expect(mockElMessageWarning).toHaveBeenCalledWith('导入完成：成功 1 条，失败 1 条')
      expect(mockGo).not.toHaveBeenCalled()
    })

    it('400 响应携带明细时行级标记且不抛错', async () => {
      mockPreviewData.value = [makePreviewRow(), makePreviewRow()]
      mockBatchCreateAssets.mockRejectedValue({
        response: { status: 400, data: { data: { items: [{ field: ['错误A'] }, {}] } } },
      })
      const { handleSubmit, previewData } = useAssetBatchImport()

      await handleSubmit()

      expect(previewData.value[0].submitStatus).toBe('error')
      expect(previewData.value[0].submitError).toBe('错误A')
      expect(previewData.value[1].submitStatus).toBe('success')
      expect(mockElMessageWarning).toHaveBeenCalledWith('导入完成：部分数据验证失败')
      expect(mockElMessageError).not.toHaveBeenCalled()
    })

    it('400 响应无明细时抛错进入失败提示', async () => {
      mockPreviewData.value = [makePreviewRow()]
      mockBatchCreateAssets.mockRejectedValue({
        response: { status: 400, data: { data: {} } },
      })
      const { handleSubmit } = useAssetBatchImport()

      await handleSubmit()

      expect(mockElMessageError).toHaveBeenCalledWith('导入失败：细节')
      expect(mockExtractErrorMessage).toHaveBeenCalled()
    })

    it('其他异常时提示导入失败', async () => {
      mockPreviewData.value = [makePreviewRow()]
      mockBatchCreateAssets.mockRejectedValue(new Error('网络错误'))
      const { handleSubmit } = useAssetBatchImport()

      await handleSubmit()

      expect(mockElMessageError).toHaveBeenCalledWith('导入失败：细节')
    })
  })

  describe('handleClear 与 goBack', () => {
    it('handleClear 清空数据、文件与选择', () => {
      const { handleClear, fileList, uploadRef, currentPreviewPage } = useAssetBatchImport()
      fileList.value = [{ raw: new File(['x'], 'a.xlsx') }] as never
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

    it('goBack 回退历史', () => {
      const { goBack } = useAssetBatchImport()
      goBack()
      expect(mockGo).toHaveBeenCalledWith(-1)
    })
  })
})
