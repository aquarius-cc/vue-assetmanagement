/**
 * 操作日志导出 composable 测试（服务端导出路径）
 *
 * 锁定的不变量：**导出请求参数必须等于列表当前生效的筛选条件**
 * （getFilters 的返回值原样透传）。若两处筛选逻辑漂移，
 * 会出现「列表看不到的行被导出」，导出结果将不可信。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { OperationLog } from '@/types/operationlog'
import { createOperationLogExcelExport } from '../useOperationLogExcelExport'

const mocks = vi.hoisted(() => ({
  elMessage: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  elMessageBox: Object.assign(vi.fn(), { confirm: vi.fn() }),
  exportExcel: vi.fn(),
  downloadBlob: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: mocks.elMessage,
  ElMessageBox: mocks.elMessageBox,
}))

vi.mock('@/api/operationLog', () => ({
  operationLogAPI: { exportExcel: mocks.exportExcel },
}))

vi.mock('@/utils/fileDownload', () => ({
  downloadBlob: mocks.downloadBlob,
  XLSX_MIME: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}))

const EXPORT_MAX_ROWS = 10_000

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

function blobResult(headers: Record<string, string> = {}) {
  return {
    blob: new Blob(['xlsx']),
    headers,
    filename: 'operation_logs.xlsx',
  }
}

function setup(options: { total?: number; filters?: Record<string, unknown> } = {}) {
  const store = {
    list: [makeLog(1)],
    pagination: { total: options.total ?? 1 },
    getFilters: vi.fn(() => options.filters ?? {}),
  }
  return { store, handleExportExcel: createOperationLogExcelExport(store) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.exportExcel.mockResolvedValue(blobResult())
  mocks.elMessageBox.confirm.mockResolvedValue('confirm')
})

describe('createOperationLogExcelExport（服务端导出）', () => {
  it('把 getFilters 的筛选条件原样透传给导出接口', async () => {
    const filters = {
      asset_code: 'A001',
      operation_type: 'out',
      start_date: '2025-01-01',
      end_date: '2025-01-31',
      ordering: '-operation_time',
    }
    const { store, handleExportExcel } = setup({ total: 5, filters })

    await handleExportExcel()

    expect(store.getFilters).toHaveBeenCalled()
    expect(mocks.exportExcel).toHaveBeenCalledWith(filters)
  })

  it('下载服务端返回的文件并用文件名保存', async () => {
    const { handleExportExcel } = setup({ total: 3 })
    const blob = new Blob(['xlsx'])
    mocks.exportExcel.mockResolvedValue({
      blob,
      headers: { 'x-export-total-count': '3' },
      filename: 'operation_logs.xlsx',
    })

    await handleExportExcel()

    expect(mocks.downloadBlob).toHaveBeenCalledWith(blob, 'operation_logs.xlsx')
    expect(mocks.elMessage.success).toHaveBeenCalledWith('操作日志导出成功，共 3 条')
  })

  it('总行数为 0 时不发起请求', async () => {
    const { handleExportExcel } = setup({ total: 0 })

    await handleExportExcel()

    expect(mocks.elMessage.warning).toHaveBeenCalledWith('暂无操作日志数据可导出')
    expect(mocks.exportExcel).not.toHaveBeenCalled()
  })

  it('大数据量（>1000）需二次确认，取消则中止', async () => {
    const { handleExportExcel } = setup({ total: 2000 })
    mocks.elMessageBox.confirm.mockRejectedValueOnce('cancel')

    await handleExportExcel()

    expect(mocks.elMessageBox.confirm).toHaveBeenCalledWith(
      expect.stringContaining('数据量较大'),
      '导出确认',
      expect.anything(),
    )
    expect(mocks.exportExcel).not.toHaveBeenCalled()
  })

  it('超过服务端上限时改为 limit=EXPORT_MAX_ROWS 分批导出', async () => {
    const { handleExportExcel } = setup({ total: EXPORT_MAX_ROWS + 1 })

    await handleExportExcel()

    expect(mocks.elMessageBox.confirm).toHaveBeenCalledWith(
      expect.stringContaining(`超过单次导出上限 ${EXPORT_MAX_ROWS} 条`),
      '超出导出上限',
      expect.anything(),
    )
    expect(mocks.exportExcel).toHaveBeenCalledWith({ limit: EXPORT_MAX_ROWS })
    expect(mocks.downloadBlob).toHaveBeenCalled()
  })

  it('超过上限且用户取消时中止导出', async () => {
    const { handleExportExcel } = setup({ total: EXPORT_MAX_ROWS + 1 })
    mocks.elMessageBox.confirm.mockRejectedValueOnce('cancel')

    await handleExportExcel()

    expect(mocks.exportExcel).not.toHaveBeenCalled()
    expect(mocks.downloadBlob).not.toHaveBeenCalled()
  })

  it('分批参数与筛选条件合并透传', async () => {
    const { handleExportExcel } = setup({
      total: EXPORT_MAX_ROWS + 1,
      filters: { operation_type: 'out' },
    })

    await handleExportExcel()

    expect(mocks.exportExcel).toHaveBeenCalledWith({
      operation_type: 'out',
      limit: EXPORT_MAX_ROWS,
    })
  })

  it('接口失败时记录日志且不触发下载', async () => {
    const { handleExportExcel } = setup({ total: 3 })
    mocks.exportExcel.mockRejectedValueOnce(new Error('boom'))

    await handleExportExcel()

    expect(mocks.downloadBlob).not.toHaveBeenCalled()
    expect(mocks.elMessage.success).not.toHaveBeenCalled()
  })

  it('响应头缺少行数时回落到 totalCount', async () => {
    const { handleExportExcel } = setup({ total: 7 })
    mocks.exportExcel.mockResolvedValue(blobResult())

    await handleExportExcel()

    expect(mocks.elMessage.success).toHaveBeenCalledWith('操作日志导出成功，共 7 条')
  })
})
