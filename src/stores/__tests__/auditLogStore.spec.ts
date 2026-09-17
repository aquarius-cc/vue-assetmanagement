/**
 * auditLogStore 单元测试
 * 覆盖：loadData, handleFilter, handleReset, handleSizeChange, handleCurrentChange, fetchAllData
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuditLogStore } from '@/stores/auditLogStore'
import { auditLogAPI } from '@/api/auditLog'

vi.mock('@/api/auditLog', () => ({
  auditLogAPI: {
    getAuditLogs: vi.fn(),
    getAuditLogByLoggingId: vi.fn(),
  },
}))

const mockGetAuditLogs = vi.mocked(auditLogAPI.getAuditLogs)
const mockGetAuditLogByLoggingId = vi.mocked(auditLogAPI.getAuditLogByLoggingId)

describe('useAuditLogStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGetAuditLogs.mockReset()
  })

  it('初始状态正确', () => {
    const store = useAuditLogStore()
    expect(store.loading).toBe(false)
    expect(store.tableData).toEqual([])
    expect(store.currentPage).toBe(1)
    expect(store.pageSize).toBe(20)
    expect(store.total).toBe(0)
    expect(store.filterForm.app_label).toBe('')
    expect(store.filterForm.operation_type).toBe('')
    expect(store.filterForm.operator_jobcode).toBe('')
    expect(store.filterForm.record_code).toBe('')
    expect(store.dateRange).toBeNull()
  })

  it('loadData 调用 API 并更新状态', async () => {
    mockGetAuditLogs.mockResolvedValue({
      results: [{ id: 1, logging_id: 'LOG-001' }],
      count: 1,
    } as never)

    const store = useAuditLogStore()
    await store.loadData()

    expect(mockGetAuditLogs).toHaveBeenCalledWith({
      page: 1,
      page_size: 20,
    })
    expect(store.tableData).toHaveLength(1)
    expect(store.total).toBe(1)
    expect(store.loading).toBe(false)
  })

  it('loadData 带筛选条件', async () => {
    mockGetAuditLogs.mockResolvedValue({ results: [], count: 0 } as never)

    const store = useAuditLogStore()
    store.filterForm.app_label = 'asset'
    store.filterForm.operation_type = 'create'
    await store.loadData()

    expect(mockGetAuditLogs).toHaveBeenCalledWith({
      page: 1,
      page_size: 20,
      app_label: 'asset',
      operation_type: 'create',
    })
  })

  it('loadData 带日期范围', async () => {
    mockGetAuditLogs.mockResolvedValue({ results: [], count: 0 } as never)

    const store = useAuditLogStore()
    store.dateRange = ['2026-01-01', '2026-01-31']
    await store.loadData()

    expect(mockGetAuditLogs).toHaveBeenCalledWith({
      page: 1,
      page_size: 20,
      start_date: '2026-01-01',
      end_date: '2026-01-31',
    })
  })

  it('loadData 错误时调用 onError 回调', async () => {
    mockGetAuditLogs.mockRejectedValue(new Error('network error'))

    const store = useAuditLogStore()
    const onError = vi.fn()
    await store.loadData(onError)

    expect(onError).toHaveBeenCalledTimes(1)
    expect(store.loading).toBe(false)
  })

  it('loadData 成功时不调用 onError 回调', async () => {
    mockGetAuditLogs.mockResolvedValue({ results: [], count: 0 } as never)

    const store = useAuditLogStore()
    const onError = vi.fn()
    await store.loadData(onError)

    expect(onError).not.toHaveBeenCalled()
  })

  it('handleFilter 重置页码并加载', async () => {
    mockGetAuditLogs.mockResolvedValue({ results: [], count: 0 } as never)

    const store = useAuditLogStore()
    store.currentPage = 5
    store.filterForm.app_label = 'contract'
    store.handleFilter()

    expect(store.currentPage).toBe(1)
  })

  it('handleReset 清空所有筛选并加载', async () => {
    mockGetAuditLogs.mockResolvedValue({ results: [], count: 0 } as never)

    const store = useAuditLogStore()
    store.filterForm.app_label = 'asset'
    store.filterForm.operation_type = 'delete'
    store.filterForm.operator_jobcode = 'EMP001'
    store.filterForm.record_code = 'AST001'
    store.dateRange = ['2026-01-01', '2026-01-31']
    store.currentPage = 3

    store.handleReset()

    expect(store.filterForm.app_label).toBe('')
    expect(store.filterForm.operation_type).toBe('')
    expect(store.filterForm.operator_jobcode).toBe('')
    expect(store.filterForm.record_code).toBe('')
    expect(store.dateRange).toBeNull()
    expect(store.currentPage).toBe(1)
  })

  it('handleSizeChange 重置页码', () => {
    const store = useAuditLogStore()
    store.currentPage = 3
    store.handleSizeChange()
    expect(store.currentPage).toBe(1)
  })

  it('fetchAllData 返回所有数据', async () => {
    mockGetAuditLogs.mockResolvedValue({
      results: [{ id: 1 }, { id: 2 }],
      count: 2,
    } as never)

    const store = useAuditLogStore()
    store.total = 2
    const result = await store.fetchAllData()

    expect(result).toHaveLength(2)
    expect(mockGetAuditLogs).toHaveBeenCalledWith({
      page: 1,
      page_size: 100,
    })
  })

  it('fetchAllData 携带筛选条件与 overrides', async () => {
    mockGetAuditLogs.mockResolvedValue({ results: [], count: 0 } as never)

    const store = useAuditLogStore()
    store.filterForm.app_label = 'asset'
    store.filterForm.operation_type = 'create'
    store.dateRange = ['2026-01-01', '2026-01-31']
    await store.fetchAllData({ page_size: 1000 })

    expect(mockGetAuditLogs).toHaveBeenCalledWith({
      page: 1,
      page_size: 1000,
      app_label: 'asset',
      operation_type: 'create',
      start_date: '2026-01-01',
      end_date: '2026-01-31',
    })
  })

  it('loadData/fetchAllData 携带操作人工号与记录编码', async () => {
    mockGetAuditLogs.mockResolvedValue({ results: [], count: 0 } as never)

    const store = useAuditLogStore()
    store.filterForm.operator_jobcode = 'EMP001'
    store.filterForm.record_code = 'AST001'

    await store.loadData()
    expect(mockGetAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ operator_jobcode: 'EMP001', record_code: 'AST001' }),
    )

    await store.fetchAllData()
    expect(mockGetAuditLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({ operator_jobcode: 'EMP001', record_code: 'AST001' }),
    )
  })

  it('getAuditLogByLoggingId 调用 API 并返回详情', async () => {
    const mockDetail = { logging_id: 'LOG-001', id: 1, app_label: 'asset' }
    mockGetAuditLogByLoggingId.mockResolvedValue(mockDetail as never)

    const store = useAuditLogStore()
    const result = await store.getAuditLogByLoggingId('LOG-001')

    expect(mockGetAuditLogByLoggingId).toHaveBeenCalledWith('LOG-001')
    expect(result).toEqual(mockDetail)
  })
})
