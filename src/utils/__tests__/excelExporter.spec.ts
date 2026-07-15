import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('element-plus', () => ({
  ElMessage: {
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  ElMessageBox: {
    confirm: vi.fn().mockResolvedValue('confirm'),
  },
}))

vi.mock('@/utils/Format', () => ({
  formatDate: vi.fn().mockReturnValue('2024-01-15'),
}))

const mockAddRow = vi.fn()
const mockWriteBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(100))

vi.mock('exceljs', () => {
  return {
    default: {
      Workbook: function () {
        return {
          addWorksheet: () => ({ addRow: mockAddRow }),
          xlsx: { writeBuffer: mockWriteBuffer },
        }
      },
    },
  }
})

const mockClick = vi.fn()
const mockAppendChild = vi.fn()
const mockRemoveChild = vi.fn()
const mockRevokeObjectURL = vi.fn()

vi.stubGlobal('document', {
  createElement: vi.fn(() => ({
    href: '',
    download: '',
    click: mockClick,
  })),
  body: {
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild,
  },
})
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:http://localhost/test'),
  revokeObjectURL: mockRevokeObjectURL,
})

import { exportToExcel } from '../excelExporter'
import { ElMessage, ElMessageBox } from 'element-plus'

describe('excelExporter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('exportToExcel', () => {
    it('should show warning when data is empty', async () => {
      await exportToExcel({
        data: [],
        columns: [{ title: 'Name', key: 'name' }],
        fileName: 'test',
      })
      expect(ElMessage.warning).toHaveBeenCalledWith('暂无数据可导出')
    })

    it('should show warning when data is null', async () => {
      await exportToExcel({
        data: null as any,
        columns: [{ title: 'Name', key: 'name' }],
        fileName: 'test',
      })
      expect(ElMessage.warning).toHaveBeenCalledWith('暂无数据可导出')
    })

    it('should create Excel file on confirm', async () => {
      const data = [{ name: 'Test Item', value: 100 }]
      await exportToExcel({
        data,
        columns: [
          { title: 'Name', key: 'name' },
          { title: 'Value', key: 'value' },
        ],
        fileName: 'test.xlsx',
      })

      expect(ElMessageBox.confirm).toHaveBeenCalled()
      expect(mockAddRow).toHaveBeenCalled()
      expect(mockWriteBuffer).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(ElMessage.success).toHaveBeenCalledWith('导出成功')
    })

    it('should handle user cancel', async () => {
      ;(ElMessageBox.confirm as any).mockRejectedValueOnce('cancel')

      await exportToExcel({
        data: [{ name: 'Test' }],
        columns: [{ title: 'Name', key: 'name' }],
        fileName: 'test.xlsx',
      })

      expect(ElMessage.info).toHaveBeenCalledWith('已取消导出')
    })

    it('should use custom messages', async () => {
      await exportToExcel({
        data: [],
        columns: [{ title: 'Name', key: 'name' }],
        fileName: 'test.xlsx',
        emptyMessage: '自定义空数据提示',
      })
      expect(ElMessage.warning).toHaveBeenCalledWith('自定义空数据提示')
    })

    it('should use custom success message', async () => {
      await exportToExcel({
        data: [{ name: 'Test' }],
        columns: [{ title: 'Name', key: 'name' }],
        fileName: 'test.xlsx',
        successMessage: '导出完成',
      })
      expect(ElMessage.success).toHaveBeenCalledWith('导出完成')
    })

    it('should append .xlsx extension when missing', async () => {
      await exportToExcel({
        data: [{ name: 'Test' }],
        columns: [{ title: 'Name', key: 'name' }],
        fileName: 'test',
      })
      expect(mockClick).toHaveBeenCalled()
    })

    it('should handle formatter function', async () => {
      await exportToExcel({
        data: [{ name: 'Test', value: 42 }],
        columns: [
          { title: 'Name', key: 'name', formatter: (val: unknown) => `Custom: ${val}` },
        ],
        fileName: 'test.xlsx',
      })
      expect(mockAddRow).toHaveBeenCalled()
    })

    it('should use default value when value is null', async () => {
      await exportToExcel({
        data: [{ name: null }],
        columns: [{ title: 'Name', key: 'name', default: 'N/A' }],
        fileName: 'test.xlsx',
      })
      expect(mockAddRow).toHaveBeenCalled()
    })
  })
})