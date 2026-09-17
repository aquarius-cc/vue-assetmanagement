import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { OperationLog } from '@/types/operationlog'
import { createOperationLogExcelExport } from '../useOperationLogExcelExport'

const mocks = vi.hoisted(() => ({
  elMessage: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  elMessageBox: { confirm: vi.fn(async () => 'confirm') },
  exportToExcel: vi.fn(async () => undefined),
}))

vi.mock('element-plus', () => ({
  ElMessage: mocks.elMessage,
  ElMessageBox: mocks.elMessageBox,
}))

vi.mock('@/utils/excelExporter', () => ({
  exportToExcel: mocks.exportToExcel,
}))

function driveExportToExcel() {
  mocks.exportToExcel.mockImplementation(
    async (cfg: {
      data?: OperationLog[]
      columns?: Array<{ key: string; formatter?: (v: unknown) => unknown }>
    }) => {
      if (cfg.data && cfg.columns) {
        cfg.data.forEach((row) => {
          cfg.columns.forEach((col) => {
            if (col.formatter) col.formatter(row[col.key] as string)
          })
        })
      }
      return undefined
    },
  )
}

function makeLog(id: number): OperationLog {
  return {
    id,
    logging_id: `lg-${id}`,
    asset_code: 'A001',
    asset_name: '服务器',
    asset_specification: 'R720',
    before_data: {},
    after_data: {},
    operation_type: 'out',
    operator_jobcode: 'J001',
    operator_name: '张三',
    operation_time: '2025-01-01T10:00:00+08:00',
    description: '出库',
    related_record_code: null,
    related_record_type: null,
    ip_address: '127.0.0.1',
  }
}

function setup(options: { total?: number; all?: OperationLog[] } = {}) {
  const store = {
    list: [makeLog(1)],
    pagination: { total: options.total ?? 1 },
    getList: vi.fn(async () => options.all ?? []),
  }
  const getTypeText = vi.fn((type: string | null | undefined) => (type === 'out' ? '出库' : '未知'))
  const handleExportExcel = createOperationLogExcelExport(store, getTypeText)
  return { store, getTypeText, handleExportExcel }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.elMessageBox.confirm.mockResolvedValue('confirm')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createOperationLogExcelExport', () => {
  it('确认导出时使用当前列表数据', async () => {
    const { store, handleExportExcel } = setup()
    mocks.elMessageBox.confirm.mockResolvedValueOnce('confirm')
    await handleExportExcel()
    expect(mocks.exportToExcel).toHaveBeenCalledWith(
      expect.objectContaining({
        data: store.list,
        fileName: '操作日志列表_当前页面_1条.xlsx',
        sheetName: '操作日志列表',
      }),
    )
    expect(store.getList).not.toHaveBeenCalled()
  })

  it('当前页导出触发列格式化（操作类型与时间）', async () => {
    const { handleExportExcel, getTypeText } = setup()
    driveExportToExcel()
    mocks.elMessageBox.confirm.mockResolvedValueOnce('confirm')
    await handleExportExcel()
    expect(getTypeText).toHaveBeenCalledWith('out')
  })

  it('选择取消时导出全部数据（总量不超过阈值）', async () => {
    const { store, handleExportExcel } = setup({
      total: 5,
      all: [makeLog(1), makeLog(2)],
    })
    mocks.elMessageBox.confirm.mockRejectedValueOnce('cancel')
    await handleExportExcel()
    expect(mocks.elMessage.info).toHaveBeenCalledWith('正在准备全部数据，请稍候...')
    expect(store.getList).toHaveBeenCalledWith({ page: 1, page_size: 5 })
    expect(mocks.exportToExcel).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: '操作日志列表_全部_2条.xlsx' }),
    )
  })

  it('总量超过阈值且确认继续时导出全部', async () => {
    const { store, handleExportExcel } = setup({
      total: 2000,
      all: [makeLog(1), makeLog(2)],
    })
    mocks.elMessageBox.confirm.mockRejectedValueOnce('cancel')
    mocks.elMessageBox.confirm.mockResolvedValueOnce('confirm')
    await handleExportExcel()
    expect(mocks.elMessage.info).toHaveBeenCalledWith('正在准备全部数据，请稍候...')
    expect(store.getList).toHaveBeenCalledWith({ page: 1, page_size: 2000 })
    expect(mocks.exportToExcel).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: '操作日志列表_全部_2条.xlsx' }),
    )
  })

  it('总量超过阈值但取消时中止导出', async () => {
    const { store, handleExportExcel } = setup({ total: 2000 })
    mocks.elMessageBox.confirm.mockRejectedValueOnce('cancel')
    mocks.elMessageBox.confirm.mockRejectedValueOnce('cancel')
    await handleExportExcel()
    expect(store.getList).not.toHaveBeenCalled()
    expect(mocks.exportToExcel).not.toHaveBeenCalled()
  })

  it('获取全部数据失败时提示错误', async () => {
    const { store, handleExportExcel } = setup({ total: 2000 })
    mocks.elMessageBox.confirm.mockRejectedValueOnce('cancel')
    mocks.elMessageBox.confirm.mockResolvedValueOnce('confirm')
    store.getList.mockRejectedValueOnce(new Error('boom'))
    await handleExportExcel()
    expect(mocks.elMessage.error).toHaveBeenCalledWith('获取全部数据失败，请重试')
    expect(mocks.exportToExcel).not.toHaveBeenCalled()
  })

  it('点关闭对话框时中止导出', async () => {
    const { store, handleExportExcel } = setup()
    mocks.elMessageBox.confirm.mockRejectedValueOnce('close')
    await handleExportExcel()
    expect(store.getList).not.toHaveBeenCalled()
    expect(mocks.exportToExcel).not.toHaveBeenCalled()
  })
})
