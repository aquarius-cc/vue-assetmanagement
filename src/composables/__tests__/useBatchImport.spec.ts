import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('exceljs', () => {
  class MockWorkbook {
    xlsx = {
      load: vi.fn().mockResolvedValue(undefined),
    }
    worksheets: any[] = []
  }
  return { default: { Workbook: MockWorkbook } }
})

vi.mock('@/utils/SubmitBatch', () => ({
  submitBatch: vi.fn(),
}))

import { useBatchImport } from '../useBatchImport'
import { submitBatch } from '@/utils/SubmitBatch'
import type { BatchImportConfig } from '@/utils/batchImport/types'

interface TestExcel {
  name: string
  code: string
}

interface TestApi {
  name: string
  code: string
}

const createMockConfig = (overrides?: Partial<BatchImportConfig<TestExcel, TestApi>>): BatchImportConfig<TestExcel, TestApi> => ({
  entityName: '测试实体',
  requiredFields: ['name', 'code'],
  excelHeaderMap: { 名称: 'name', 编码: 'code' },
  validateItem: vi.fn((item: TestExcel) => ({
    valid: !!item.name && !!item.code,
    errors: {
      ...(!item.name ? { name: '名称不能为空' } : {}),
      ...(!item.code ? { code: '编码不能为空' } : {}),
    },
  })),
  transformToApiData: vi.fn((item: TestExcel) => ({ name: item.name, code: item.code })),
  createFn: vi.fn().mockResolvedValue({}),
  idField: 'code',
  concurrency: 5,
  ...overrides,
})

describe('useBatchImport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default values', () => {
    const config = createMockConfig()
    const { previewData, validDataCount, isSubmitting, submitResult, parseError } = useBatchImport(config)

    expect(previewData.value).toEqual([])
    expect(validDataCount.value).toBe(0)
    expect(isSubmitting.value).toBe(false)
    expect(submitResult.value).toBeNull()
    expect(parseError.value).toBe('')
  })

  describe('handleFileChange', () => {
    it('should store parse error when file reading fails', async () => {
      const config = createMockConfig()
      const { handleFileChange, parseError } = useBatchImport(config)
      const { ElMessage } = await import('element-plus')

      // Use a class-based FileReader mock so `new FileReader()` works
      const mockInstances: any[] = []
      vi.stubGlobal('FileReader', class {
        readAsArrayBuffer = vi.fn()
        onload: any = null
        onerror: any = null
        constructor() { mockInstances.push(this) }
      })

      const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const p = handleFileChange(file)

      const reader = mockInstances[0]
      reader.onerror(new Event('error'))
      await p

      expect(parseError.value).toBe('文件读取失败')
      expect(ElMessage.error).toHaveBeenCalledWith(expect.stringContaining('文件解析失败'))
    })

    it('should clear parseError at start of handleFileChange', async () => {
      const config = createMockConfig()
      const { handleFileChange, parseError } = useBatchImport(config)

      // Set initial error
      parseError.value = 'previous error'

      const mockInstances: any[] = []
      vi.stubGlobal('FileReader', class {
        readAsArrayBuffer = vi.fn()
        onload: any = null
        onerror: any = null
        constructor() { mockInstances.push(this) }
      })

      const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      handleFileChange(file)

      // Trigger onload with empty buffer - will fail in ExcelJS parsing
      const reader = mockInstances[0]
      reader.onload({ target: { result: new ArrayBuffer(0) } })

      // Wait for async
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(parseError.value).not.toBe('previous error')
    })
  })

  describe('submitBatchData', () => {
    it('should show warning when no valid data', async () => {
      const config = createMockConfig()
      const { submitBatchData } = useBatchImport(config)
      const { ElMessage } = await import('element-plus')

      const result = await submitBatchData()

      expect(result).toBe(false)
      expect(ElMessage.warning).toHaveBeenCalledWith('没有有效数据可提交')
    })

    it('should show error when idField is missing', async () => {
      const config = createMockConfig({ idField: undefined })
      const { submitBatchData, previewData } = useBatchImport(config)
      const { ElMessage } = await import('element-plus')

      previewData.value = [
        { data: { name: 'A', code: 'C1' }, validationStatus: 'success', validationErrors: {}, validationErrorSummary: '' },
      ]

      const result = await submitBatchData()

      expect(result).toBe(false)
      expect(ElMessage.error).toHaveBeenCalledWith('测试实体 批量导入配置缺少 idField 字段')
    })

    it('should submit valid data and return true on success', async () => {
      const mockSubmitBatch = vi.mocked(submitBatch)
      mockSubmitBatch.mockResolvedValue({ successCount: 2, failedItems: [] })

      const config = createMockConfig()
      const { submitBatchData, previewData, submitResult } = useBatchImport(config)
      const { ElMessage } = await import('element-plus')

      previewData.value = [
        { data: { name: 'A', code: 'C1' }, validationStatus: 'success', validationErrors: {}, validationErrorSummary: '' },
        { data: { name: 'B', code: 'C2' }, validationStatus: 'success', validationErrors: {}, validationErrorSummary: '' },
      ]

      const result = await submitBatchData()

      expect(result).toBe(true)
      expect(submitResult.value).toEqual({ successCount: 2, failedItems: [] })
      expect(ElMessage.success).toHaveBeenCalledWith('全部导入成功！共 2 条')
      expect(previewData.value[0].submitStatus).toBe('success')
      expect(previewData.value[1].submitStatus).toBe('success')
    })

    it('should handle partial failures', async () => {
      const mockSubmitBatch = vi.mocked(submitBatch)
      mockSubmitBatch.mockResolvedValue({
        successCount: 1,
        failedItems: [{ item: { name: 'B', code: 'C2' }, error: '编码重复' }],
      })

      const config = createMockConfig()
      const { submitBatchData, previewData } = useBatchImport(config)
      const { ElMessage } = await import('element-plus')

      previewData.value = [
        { data: { name: 'A', code: 'C1' }, validationStatus: 'success', validationErrors: {}, validationErrorSummary: '' },
        { data: { name: 'B', code: 'C2' }, validationStatus: 'success', validationErrors: {}, validationErrorSummary: '' },
      ]

      const result = await submitBatchData()

      expect(result).toBe(true)
      expect(ElMessage.warning).toHaveBeenCalledWith('导入完成：成功 1 条，失败 1 条')
      expect(previewData.value[0].submitStatus).toBe('success')
      expect(previewData.value[1].submitStatus).toBe('error')
      expect(previewData.value[1].submitError).toBe('编码重复')
    })

    it('should handle submit exception', async () => {
      const mockSubmitBatch = vi.mocked(submitBatch)
      mockSubmitBatch.mockRejectedValue(new Error('网络错误'))

      const config = createMockConfig()
      const { submitBatchData, previewData } = useBatchImport(config)
      const { ElMessage } = await import('element-plus')

      previewData.value = [
        { data: { name: 'A', code: 'C1' }, validationStatus: 'success', validationErrors: {}, validationErrorSummary: '' },
      ]

      const result = await submitBatchData()

      expect(result).toBe(false)
      expect(ElMessage.error).toHaveBeenCalledWith('导入失败：网络错误')
    })

    it('should mark isSubmitting during submission', async () => {
      const mockSubmitBatch = vi.mocked(submitBatch)
      let resolveSubmit: any
      mockSubmitBatch.mockImplementation(() => new Promise((resolve) => { resolveSubmit = resolve }))

      const config = createMockConfig()
      const { submitBatchData, previewData, isSubmitting } = useBatchImport(config)

      previewData.value = [
        { data: { name: 'A', code: 'C1' }, validationStatus: 'success', validationErrors: {}, validationErrorSummary: '' },
      ]

      const promise = submitBatchData()
      expect(isSubmitting.value).toBe(true)

      resolveSubmit({ successCount: 1, failedItems: [] })
      await promise

      expect(isSubmitting.value).toBe(false)
    })
  })

  describe('clearData', () => {
    it('should reset previewData and submitResult', () => {
      const config = createMockConfig()
      const { clearData, previewData, submitResult } = useBatchImport(config)

      previewData.value = [{ data: { name: 'A', code: 'C1' }, validationStatus: 'success', validationErrors: {}, validationErrorSummary: '' }]
      submitResult.value = { successCount: 1, failedItems: [] }

      clearData()

      expect(previewData.value).toEqual([])
      expect(submitResult.value).toBeNull()
    })
  })
})
