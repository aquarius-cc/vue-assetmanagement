/**
 * 员工导出 composable 测试（服务端导出路径）
 *
 * 相对旧版的语义变更：不再有「当前页/全部」二选一，也不再需要
 * departmentStore（部门名由后端带出）。本文件锁定新契约：
 * 只发起一次服务端导出请求，下载服务端返回的文件。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EmployeeExtended } from '@/types/user'
import { createUserExcelExport } from '../useUserExcelExport'

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

vi.mock('@/api/user', () => ({
  userAPI: { exportExcel: mocks.exportExcel },
}))

vi.mock('@/utils/fileDownload', () => ({
  downloadBlob: mocks.downloadBlob,
  XLSX_MIME: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}))

const EXPORT_MAX_ROWS = 10_000

function makeEmp(jobcode: string, name: string): EmployeeExtended {
  return {
    id: 1,
    employee_jobcode: jobcode,
    employee_name: name,
    employee_status: 'active',
    employee_department_code: 'D01',
    employee_phone: '13800000000',
    employee_location: 'L1',
    created_at: '2025-01-01T00:00:00+08:00',
    updated_at: '2025-01-01T00:00:00+08:00',
    is_deleted: false,
    sort_order: 0,
  }
}

function setup(overrides: { total?: number } = {}) {
  const userStore = {
    list: [makeEmp('J001', '张三')],
    pagination: { page: 1, total: overrides.total ?? 200 },
  }
  return { userStore, handleExportExcel: createUserExcelExport(userStore) }
}

function blobResult(headers: Record<string, string> = {}) {
  return { blob: new Blob(['xlsx']), headers, filename: 'employees.xlsx' }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.exportExcel.mockResolvedValue(blobResult())
  mocks.elMessageBox.confirm.mockResolvedValue('confirm')
})

describe('createUserExcelExport（服务端导出）', () => {
  it('只发起一次服务端导出请求并下载文件', async () => {
    const { handleExportExcel } = setup({ total: 200 })
    const blob = new Blob(['xlsx'])
    mocks.exportExcel.mockResolvedValue({
      blob,
      headers: { 'x-export-total-count': '200' },
      filename: 'employees.xlsx',
    })

    await handleExportExcel()

    expect(mocks.exportExcel).toHaveBeenCalledTimes(1)
    expect(mocks.exportExcel).toHaveBeenCalledWith({})
    expect(mocks.downloadBlob).toHaveBeenCalledWith(blob, 'employees.xlsx')
    expect(mocks.elMessage.success).toHaveBeenCalledWith('员工导出成功，共 200 条')
  })

  it('不传分页参数（不按当前页截断）', async () => {
    const { handleExportExcel } = setup({ total: 50 })
    await handleExportExcel()
    expect(mocks.exportExcel).toHaveBeenCalledWith({})
  })

  it('总行数为 0 时不发起请求', async () => {
    const { handleExportExcel } = setup({ total: 0 })
    await handleExportExcel()
    expect(mocks.elMessage.warning).toHaveBeenCalledWith('暂无员工数据可导出')
    expect(mocks.exportExcel).not.toHaveBeenCalled()
  })

  it('大数据量（>1000）需二次确认，取消则中止', async () => {
    const { handleExportExcel } = setup({ total: 1500 })
    mocks.elMessageBox.confirm.mockRejectedValueOnce('cancel')

    await handleExportExcel()

    expect(mocks.elMessageBox.confirm).toHaveBeenCalledWith(
      expect.stringContaining('数据量较大'),
      '导出确认',
      expect.anything(),
    )
    expect(mocks.exportExcel).not.toHaveBeenCalled()
  })

  it('大数据量确认后继续导出', async () => {
    const { handleExportExcel } = setup({ total: 1500 })
    await handleExportExcel()
    expect(mocks.exportExcel).toHaveBeenCalledTimes(1)
    expect(mocks.downloadBlob).toHaveBeenCalled()
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
  })

  it('超过上限且用户取消时中止导出', async () => {
    const { handleExportExcel } = setup({ total: EXPORT_MAX_ROWS + 1 })
    mocks.elMessageBox.confirm.mockRejectedValueOnce('cancel')

    await handleExportExcel()

    expect(mocks.exportExcel).not.toHaveBeenCalled()
    expect(mocks.downloadBlob).not.toHaveBeenCalled()
  })

  it('接口失败时不触发下载', async () => {
    const { handleExportExcel } = setup({ total: 10 })
    mocks.exportExcel.mockRejectedValueOnce(new Error('boom'))

    await handleExportExcel()

    expect(mocks.downloadBlob).not.toHaveBeenCalled()
    expect(mocks.elMessage.success).not.toHaveBeenCalled()
  })
})
