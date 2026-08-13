import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 创建共享的 mock workbook 对象
const mockWorkbook = {
  xlsx: {
    load: vi.fn(),
  },
  worksheets: [] as any[],
}

vi.mock('exceljs', () => {
  return {
    default: {
      Workbook: class MockWorkbook {
        xlsx = mockWorkbook.xlsx
        worksheets = mockWorkbook.worksheets
        constructor() {
          mockWorkbook.xlsx = this.xlsx
          mockWorkbook.worksheets = this.worksheets
        }
      },
    },
  }
})

import { readExcelFile } from '@/utils/readExcelFile'

// Mock FileReader
class MockFileReader {
  result: ArrayBuffer | null = null
  onload: ((e: any) => void) | null = null
  onerror: (() => void) | null = null

  readAsArrayBuffer(_file: File) {
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: new ArrayBuffer(0) } })
      }
    }, 0)
  }
}

const originalFileReader = global.FileReader
beforeEach(() => {
  vi.clearAllMocks()
  mockWorkbook.worksheets = []
  ;(global as any).FileReader = MockFileReader
})

afterEach(() => {
  ;(global as any).FileReader = originalFileReader
})

describe('readExcelFile', () => {
  const excelHeaderMap = {
    资产编码: 'asset_code',
    资产名称: 'asset_name',
    数量: 'quantity',
  }

  it('should read and parse Excel file successfully', async () => {
    const mockWorksheet = {
      getRow: vi.fn().mockReturnValue({
        eachCell: vi.fn((callback: (cell: any, colNumber: number) => void) => {
          callback({ value: '资产编码' }, 1)
          callback({ value: '资产名称' }, 2)
          callback({ value: '数量' }, 3)
        }),
      }),
      eachRow: vi.fn((callback: (row: any, rowNumber: number) => void) => {
        callback(
          {
            values: [undefined, 'A001', '电脑', 10],
            eachCell: vi.fn((cb: (cell: any, col: number) => void) => {
              cb({ value: 'A001' }, 1)
              cb({ value: '电脑' }, 2)
              cb({ value: 10 }, 3)
            }),
          },
          2,
        )
      }),
    }

    mockWorkbook.worksheets = [mockWorksheet]
    mockWorkbook.xlsx.load.mockResolvedValue(undefined)

    const file = new File(['test'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const result = await readExcelFile(file, excelHeaderMap)

    expect(result).toEqual([{ asset_code: 'A001', asset_name: '电脑', quantity: 10 }])
    expect(mockWorkbook.xlsx.load).toHaveBeenCalled()
  })

  it('should reject when worksheet is missing', async () => {
    mockWorkbook.worksheets = []
    mockWorkbook.xlsx.load.mockResolvedValue(undefined)

    const file = new File(['test'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    await expect(readExcelFile(file, excelHeaderMap)).rejects.toThrow('文件为空或缺少工作表')
  })

  it('should reject when headers are empty', async () => {
    const mockWorksheet = {
      getRow: vi.fn().mockReturnValue({
        eachCell: vi.fn(),
      }),
      eachRow: vi.fn(),
    }

    mockWorkbook.worksheets = [mockWorksheet]
    mockWorkbook.xlsx.load.mockResolvedValue(undefined)

    const file = new File(['test'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    await expect(readExcelFile(file, excelHeaderMap)).rejects.toThrow('文件为空或缺少数据')
  })

  it('should reject when required headers are missing', async () => {
    const mockWorksheet = {
      getRow: vi.fn().mockReturnValue({
        eachCell: vi.fn((callback: (cell: any, colNumber: number) => void) => {
          callback({ value: '资产编码' }, 1)
        }),
      }),
      eachRow: vi.fn(),
    }

    mockWorkbook.worksheets = [mockWorksheet]
    mockWorkbook.xlsx.load.mockResolvedValue(undefined)

    const file = new File(['test'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    await expect(readExcelFile(file, excelHeaderMap)).rejects.toThrow('缺少必需列: 资产名称, 数量')
  })

  it('should skip empty rows', async () => {
    const mockWorksheet = {
      getRow: vi.fn().mockReturnValue({
        eachCell: vi.fn((callback: (cell: any, colNumber: number) => void) => {
          callback({ value: '资产编码' }, 1)
          callback({ value: '资产名称' }, 2)
          callback({ value: '数量' }, 3)
        }),
      }),
      eachRow: vi.fn((callback: (row: any, rowNumber: number) => void) => {
        callback({ values: [undefined, '', '', ''], eachCell: vi.fn() }, 2)
      }),
    }

    mockWorkbook.worksheets = [mockWorksheet]
    mockWorkbook.xlsx.load.mockResolvedValue(undefined)

    const file = new File(['test'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const result = await readExcelFile(file, excelHeaderMap)
    expect(result).toEqual([])
  })

  it('should handle date values correctly', async () => {
    const testDate = new Date('2024-01-15')
    const mockWorksheet = {
      getRow: vi.fn().mockReturnValue({
        eachCell: vi.fn((callback: (cell: any, colNumber: number) => void) => {
          callback({ value: '资产编码' }, 1)
          callback({ value: '日期' }, 2)
        }),
      }),
      eachRow: vi.fn((callback: (row: any, rowNumber: number) => void) => {
        callback(
          {
            values: [undefined, 'A001', testDate],
            eachCell: vi.fn((cb: (cell: any, col: number) => void) => {
              cb({ value: 'A001' }, 1)
              cb({ value: testDate }, 2)
            }),
          },
          2,
        )
      }),
    }

    mockWorkbook.worksheets = [mockWorksheet]
    mockWorkbook.xlsx.load.mockResolvedValue(undefined)

    const file = new File(['test'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const result = await readExcelFile(file, { 资产编码: 'code', 日期: 'date' })
    expect(result).toEqual([{ code: 'A001', date: '2024-01-15' }])
  })

  it('should handle numeric date values correctly', async () => {
    const mockWorksheet = {
      getRow: vi.fn().mockReturnValue({
        eachCell: vi.fn((callback: (cell: any, colNumber: number) => void) => {
          callback({ value: '资产编码' }, 1)
          callback({ value: '日期' }, 2)
        }),
      }),
      eachRow: vi.fn((callback: (row: any, rowNumber: number) => void) => {
        callback(
          {
            values: [undefined, 'A001', 45307],
            eachCell: vi.fn((cb: (cell: any, col: number) => void) => {
              cb({ value: 'A001' }, 1)
              cb({ value: 45307 }, 2)
            }),
          },
          2,
        )
      }),
    }

    mockWorkbook.worksheets = [mockWorksheet]
    mockWorkbook.xlsx.load.mockResolvedValue(undefined)

    const file = new File(['test'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const result = await readExcelFile(file, { 资产编码: 'code', 日期: 'date' })
    expect(result).toEqual([{ code: 'A001', date: '2024-01-16' }])
  })

  it('should trim string values', async () => {
    const mockWorksheet = {
      getRow: vi.fn().mockReturnValue({
        eachCell: vi.fn((callback: (cell: any, colNumber: number) => void) => {
          callback({ value: '资产编码' }, 1)
          callback({ value: '资产名称' }, 2)
        }),
      }),
      eachRow: vi.fn((callback: (row: any, rowNumber: number) => void) => {
        callback(
          {
            values: [undefined, '  A001  ', '  电脑  '],
            eachCell: vi.fn((cb: (cell: any, col: number) => void) => {
              cb({ value: '  A001  ' }, 1)
              cb({ value: '  电脑  ' }, 2)
            }),
          },
          2,
        )
      }),
    }

    mockWorkbook.worksheets = [mockWorksheet]
    mockWorkbook.xlsx.load.mockResolvedValue(undefined)

    const file = new File(['test'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const result = await readExcelFile(file, { 资产编码: 'code', 资产名称: 'name' })
    expect(result).toEqual([{ code: 'A001', name: '电脑' }])
  })

  it('should handle file read error', async () => {
    ;(global as any).FileReader = class {
      result: ArrayBuffer | null = null
      onload: ((e: any) => void) | null = null
      onerror: (() => void) | null = null
      readAsArrayBuffer() {
        setTimeout(() => {
          if (this.onerror) this.onerror()
        }, 0)
      }
    }

    const file = new File(['test'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    await expect(readExcelFile(file, excelHeaderMap)).rejects.toThrow('文件读取失败')
  })

  it('should handle ExcelJS load error', async () => {
    mockWorkbook.xlsx.load.mockRejectedValue(new Error('Invalid Excel file'))

    const file = new File(['test'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    await expect(readExcelFile(file, excelHeaderMap)).rejects.toThrow('Invalid Excel file')
  })
})
