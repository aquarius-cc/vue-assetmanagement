import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const successSpy = vi.fn()
  const errorSpy = vi.fn()
  const writeBufferMock = vi.fn()
  const worksheetInstances: Array<{ addRow: ReturnType<typeof vi.fn> }> = []
  return { successSpy, errorSpy, writeBufferMock, worksheetInstances }
})

vi.mock('exceljs', () => {
  class Worksheet {
    columns: { width: number }[] | undefined
    addRow: ReturnType<typeof vi.fn>
    constructor() {
      this.addRow = vi.fn()
    }
  }
  class Workbook {
    xlsx = { writeBuffer: mocks.writeBufferMock }
    addWorksheet = vi.fn(() => {
      const ws = new Worksheet()
      mocks.worksheetInstances.push(ws)
      return ws
    })
  }
  return { default: { Workbook, Worksheet } }
})

vi.mock('element-plus', () => ({
  ElMessage: {
    success: mocks.successSpy,
    error: mocks.errorSpy,
  },
}))

import { downloadExcelTemplate } from '../templateExport'

describe('downloadExcelTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.worksheetInstances.length = 0
    mocks.writeBufferMock.mockResolvedValue(new Uint8Array([1, 2, 3]))
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  it('按 headers 顺序写表头与示例行，数值单元格原样保留', async () => {
    await downloadExcelTemplate(
      '员工导入模板',
      ['姓名', '排序'],
      [{ 姓名: '张三', 排序: 100 }],
      '员工批量导入模板.xlsx',
    )

    const [ws] = mocks.worksheetInstances
    expect(ws.addRow).toHaveBeenNthCalledWith(1, ['姓名', '排序'])
    expect(ws.addRow).toHaveBeenNthCalledWith(2, ['张三', 100])
  })

  it('缺失或空值单元格补空字符串，数值 0 不被吞掉', async () => {
    await downloadExcelTemplate('模板', ['a', 'b', 'c'], [{ a: 'x', c: 0 }], 't.xlsx')

    const [ws] = mocks.worksheetInstances
    expect(ws.addRow).toHaveBeenNthCalledWith(2, ['x', '', 0])
  })

  it('生成文件触发浏览器下载并提示成功', async () => {
    await downloadExcelTemplate('模板', ['姓名'], [{ 姓名: '张三' }], '模板.xlsx')

    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(mocks.successSpy).toHaveBeenCalledWith('模板下载成功')
    expect(mocks.errorSpy).not.toHaveBeenCalled()
  })

  it('写入失败时提示错误', async () => {
    mocks.writeBufferMock.mockRejectedValueOnce(new Error('boom'))
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await downloadExcelTemplate('模板', ['姓名'], [{ 姓名: '张三' }], '模板.xlsx')

    expect(mocks.errorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })
})
