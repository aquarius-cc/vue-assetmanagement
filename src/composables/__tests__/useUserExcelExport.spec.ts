import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EmployeeExtended } from '@/types/user'
import { createUserExcelExport } from '../useUserExcelExport'

const mocks = vi.hoisted(() => ({
  elMessage: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  elMessageBox: vi.fn(),
  exportToExcel: vi.fn(async () => undefined),
}))

vi.mock('element-plus', () => ({
  ElMessage: mocks.elMessage,
  ElMessageBox: Object.assign(mocks.elMessageBox, {
    confirm: vi.fn(async () => 'confirm'),
    prompt: vi.fn(async () => ({ value: '' })),
  }),
}))

vi.mock('@/utils/excelExporter', () => ({
  exportToExcel: mocks.exportToExcel,
}))

function makeEmp(jobcode: string, name: string, deptCode = 'D01'): EmployeeExtended {
  return {
    id: 1,
    employee_jobcode: jobcode,
    employee_name: name,
    employee_status: 'active',
    employee_department_code: deptCode,
    employee_phone: '13800000000',
    employee_location: 'L1',
    created_at: '2025-01-01T00:00:00+08:00',
    updated_at: '2025-01-01T00:00:00+08:00',
    is_deleted: false,
    sort_order: 0,
  }
}

function setup(overrides: { total?: number; all?: EmployeeExtended[] } = {}) {
  const employees = [makeEmp('J001', '张三')]
  const userStore = {
    list: employees,
    pagination: { page: 1, total: overrides.total ?? 200 },
    getList: vi.fn(async () => overrides.all ?? employees),
  }
  const departmentStore = {
    list: [{ department_code: 'D01', department_name: '技术部' }],
  }
  const handleExportExcel = createUserExcelExport({ userStore, departmentStore })
  return { userStore, departmentStore, handleExportExcel, employees }
}

function driveExportToExcel() {
  mocks.exportToExcel.mockImplementation(
    async (cfg: {
      data?: EmployeeExtended[]
      columns?: Array<{ key: string; formatter?: (v: unknown, row: EmployeeExtended) => unknown }>
    }) => {
      if (cfg.data && cfg.columns) {
        cfg.data.forEach((row) => {
          cfg.columns.forEach((col) => {
            if (col.formatter) {
              const value = row[col.key as keyof EmployeeExtended]
              return col.formatter(value, row)
            }
          })
        })
      }
      return undefined
    },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.elMessageBox.mockReset()
  mocks.elMessageBox.confirm.mockReset()
  mocks.elMessageBox.mockResolvedValue('confirm')
  mocks.elMessageBox.confirm.mockResolvedValue('confirm')
  mocks.exportToExcel.mockResolvedValue(undefined)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('useUserExcelExport', () => {
  it('确认导出当前页面时使用列表数据', async () => {
    const { handleExportExcel, userStore } = setup()
    mocks.elMessageBox.mockResolvedValue('confirm')
    await handleExportExcel()
    expect(mocks.exportToExcel).toHaveBeenCalledWith(
      expect.objectContaining({
        data: userStore.list,
        fileName: '用户列表_当前页面_1条.xlsx',
        sheetName: '用户列表',
      }),
    )
    expect(mocks.exportToExcel).toHaveBeenCalledTimes(1)
    expect(userStore.getList).not.toHaveBeenCalled()
  })

  it('取消导出全部（不超过阈值不二次确认）', async () => {
    const { handleExportExcel, userStore } = setup({ total: 200, all: [makeEmp('J002', '李四')] })
    mocks.elMessageBox.mockRejectedValue('cancel')
    await handleExportExcel()
    expect(mocks.elMessage.info).toHaveBeenCalledWith('正在准备全部用户数据，请稍候...')
    expect(userStore.getList).toHaveBeenCalledWith({ page: 1, page_size: 200 })
    expect(mocks.exportToExcel).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: '用户列表_全部_1条.xlsx' }),
    )
  })

  it('全量超过阈值且确认继续时导出全部', async () => {
    const { handleExportExcel, userStore } = setup({
      total: 1500,
      all: [makeEmp('J001', '张三'), makeEmp('J002', '李四')],
    })
    mocks.elMessageBox.mockRejectedValue('cancel')
    mocks.elMessageBox.confirm.mockResolvedValue('confirm')
    await handleExportExcel()
    expect(userStore.getList).toHaveBeenCalledWith({ page: 1, page_size: 1500 })
    expect(mocks.exportToExcel).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: '用户列表_全部_2条.xlsx' }),
    )
  })

  it('全量超过阈值且取消时中止导出', async () => {
    const { handleExportExcel, userStore } = setup({ total: 1500 })
    mocks.elMessageBox.mockRejectedValue('cancel')
    mocks.elMessageBox.confirm.mockRejectedValue('cancel')
    await handleExportExcel()
    expect(userStore.getList).not.toHaveBeenCalled()
    expect(mocks.exportToExcel).not.toHaveBeenCalled()
  })

  it('全量获取失败时提示错误', async () => {
    const { handleExportExcel, userStore } = setup({ total: 200 })
    mocks.elMessageBox.mockRejectedValue('cancel')
    userStore.getList.mockRejectedValueOnce(new Error('boom'))
    await handleExportExcel()
    expect(mocks.elMessage.error).toHaveBeenCalledWith('获取全部数据失败，请重试')
    expect(mocks.exportToExcel).not.toHaveBeenCalled()
  })

  it('关闭范围弹窗时中止导出', async () => {
    const { handleExportExcel } = setup()
    mocks.elMessageBox.mockRejectedValue('close')
    await handleExportExcel()
    expect(mocks.exportToExcel).not.toHaveBeenCalled()
  })

  it('范围弹窗其他异常时中止导出（异常向上传播）', async () => {
    const { handleExportExcel } = setup()
    mocks.elMessageBox.mockRejectedValue(new Error('boom'))
    await expect(handleExportExcel()).rejects.toThrow('boom')
    expect(mocks.exportToExcel).not.toHaveBeenCalled()
  })

  it('弹窗返回非 confirm 结果时中止导出', async () => {
    const { handleExportExcel } = setup()
    mocks.elMessageBox.mockResolvedValue('other')
    await handleExportExcel()
    expect(mocks.exportToExcel).not.toHaveBeenCalled()
  })

  it('当前页导出驱动状态与部门列格式化', async () => {
    const emp = {
      ...makeEmp('J001', '张三'),
      employee_status: 'active',
      employee_department_code: 'D01',
      employee_department_name: { department_name: '技术部' },
    }
    const { handleExportExcel } = setup({ total: 200, all: [emp] })
    driveExportToExcel()
    mocks.elMessageBox.mockResolvedValue('confirm')
    await handleExportExcel()
    expect(mocks.exportToExcel).toHaveBeenCalledTimes(1)
  })

  it('状态与部门未知值触发格式化回退', async () => {
    const emp = {
      ...makeEmp('J001', '张三'),
      employee_status: '',
      employee_department_code: 'D99',
      employee_department_name: null,
    }
    const { handleExportExcel } = setup({ total: 200, all: [emp] })
    driveExportToExcel()
    mocks.elMessageBox.mockResolvedValue('confirm')
    await handleExportExcel()
    expect(mocks.exportToExcel).toHaveBeenCalledTimes(1)
  })
})
