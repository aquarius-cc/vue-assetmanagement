/**
 * useAssetLifecycleActions 单元测试
 * 覆盖：单删（recordcode 取键 + 取消/失败分支）、批删（空选择/缺编码/取消）、导出（服务端委托）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockConfirm, mockExportFromServer, mockLogError, mockNotifyCallerError } = vi.hoisted(
  () => ({
    mockConfirm: vi.fn(),
    mockExportFromServer: vi.fn(),
    mockLogError: vi.fn(),
    mockNotifyCallerError: vi.fn(),
  }),
)

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() },
  ElMessageBox: { confirm: mockConfirm },
}))

vi.mock('@/composables/useServerExcelExport', () => ({
  useServerExcelExport: () => ({ exportFromServer: mockExportFromServer }),
}))

// logError / notifyCallerError 收敛为 spy：精确断言日志与错误出口参数（杀 Stryker 文案区字符串变异体）
vi.mock('@/utils/logger', () => ({ logError: mockLogError }))
vi.mock('@/utils/errorHandler', () => ({ notifyCallerError: mockNotifyCallerError }))

import { useAssetLifecycleActions } from '../useAssetLifecycleActions'
import { ElMessage, ElMessageBox } from 'element-plus'

const mockElMessageSuccess = vi.mocked(ElMessage.success)
const mockElMessageWarning = vi.mocked(ElMessage.warning)
const mockElMessageError = vi.mocked(ElMessage.error)
const mockElMessageBoxConfirm = vi.mocked(ElMessageBox.confirm)

const makeStore = () => ({
  list: [
    { recordcode: 'R1', name: '记录一' },
    { recordcode: 'R2', name: '记录二' },
  ],
  pagination: { total: 2 },
  getList: vi.fn().mockResolvedValue([]),
  remove: vi.fn().mockResolvedValue(undefined),
  removeBatch: vi.fn().mockResolvedValue(undefined),
  setRefreshFlag: vi.fn(),
})

const mockFetchExport = vi.fn().mockResolvedValue({
  blob: new Blob(),
  headers: {},
  filename: 'test.xlsx',
})

const makeParams = (store: ReturnType<typeof makeStore>) => ({
  store,
  entityName: '损坏资产',
  fetchExport: mockFetchExport,
  refresh: vi.fn().mockResolvedValue(undefined),
  clearSelection: vi.fn(),
})

describe('useAssetLifecycleActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockElMessageBoxConfirm.mockResolvedValue(undefined)
    mockFetchExport.mockResolvedValue({ blob: new Blob(), headers: {}, filename: 'test.xlsx' })
  })

  describe('handleDelete', () => {
    it('确认删除：按 recordcode 调用 store.remove 并刷新', async () => {
      const store = makeStore()
      const params = makeParams(store)
      const { handleDelete } = useAssetLifecycleActions(params)

      handleDelete({ recordcode: 'R1' })
      await vi.waitFor(() => expect(store.remove).toHaveBeenCalled())

      expect(store.remove).toHaveBeenCalledWith('R1')
      // 确认框三参精确断言（文案/标题/按钮组逐字，杀 confirm 区字符串变异体）
      expect(mockElMessageBoxConfirm).toHaveBeenCalledWith(
        '确定要删除该损坏资产记录吗？',
        '删除确认',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' },
      )
      expect(mockElMessageSuccess).toHaveBeenCalledWith('删除成功')
      expect(params.refresh).toHaveBeenCalled()
    })

    it('记录缺少 recordcode：报错且不触发确认框', () => {
      const store = makeStore()
      const { handleDelete } = useAssetLifecycleActions(makeParams(store))

      handleDelete({ name: '无编码记录' })

      expect(mockElMessageBoxConfirm).not.toHaveBeenCalled()
      expect(store.remove).not.toHaveBeenCalled()
      expect(mockElMessageError).toHaveBeenCalledWith('记录编码缺失，无法删除')
    })

    it('取消确认：不调用 store.remove 且不报错', async () => {
      mockElMessageBoxConfirm.mockRejectedValue('cancel')
      const store = makeStore()
      const { handleDelete } = useAssetLifecycleActions(makeParams(store))

      handleDelete({ recordcode: 'R1' })
      await vi.waitFor(() => expect(mockElMessageBoxConfirm).toHaveBeenCalled())
      await new Promise((r) => setTimeout(r, 0))

      expect(store.remove).not.toHaveBeenCalled()
      expect(mockElMessageError).not.toHaveBeenCalled()
      // 取消路径零日志/零错误出口（钉死 error !== 'cancel' 判定）
      expect(mockLogError).not.toHaveBeenCalled()
      expect(mockNotifyCallerError).not.toHaveBeenCalled()
    })

    it('删除失败：日志与错误出口精确出参（模块标签/文案逐字）', async () => {
      mockElMessageBoxConfirm.mockResolvedValue(undefined)
      const store = makeStore()
      const boom = new Error('boom')
      store.remove.mockRejectedValue(boom)
      const { handleDelete } = useAssetLifecycleActions(makeParams(store))

      handleDelete({ recordcode: 'R1' })
      await vi.waitFor(() => expect(mockNotifyCallerError).toHaveBeenCalled())

      expect(mockLogError).toHaveBeenCalledWith(
        'composables/useAssetLifecycleActions',
        '删除失败:',
        boom,
      )
      expect(mockNotifyCallerError).toHaveBeenCalledWith(boom, '删除失败')
      expect(mockElMessageSuccess).not.toHaveBeenCalled()
    })

    it('refresh 未提供：删除成功不抛错、零失败日志（refresh?.() 可选链语义）', async () => {
      const store = makeStore()
      const { handleDelete } = useAssetLifecycleActions({
        store,
        entityName: '损坏资产',
        fetchExport: mockFetchExport,
      })

      handleDelete({ recordcode: 'R1' })
      await vi.waitFor(() => expect(store.remove).toHaveBeenCalled())
      await new Promise((r) => setTimeout(r, 0))

      expect(mockElMessageSuccess).toHaveBeenCalledWith('删除成功')
      expect(mockLogError).not.toHaveBeenCalled()
      expect(mockNotifyCallerError).not.toHaveBeenCalled()
    })
  })

  describe('handleBatchDelete', () => {
    it('未选择数据：提示先选择', async () => {
      const store = makeStore()
      const { handleBatchDelete } = useAssetLifecycleActions(makeParams(store))

      await handleBatchDelete(undefined)

      expect(mockElMessageWarning).toHaveBeenCalledWith('请先选择要删除的数据')
      expect(store.removeBatch).not.toHaveBeenCalled()
    })

    it('选中数据全部缺少 recordcode：报错且不调用批量删除', async () => {
      const store = makeStore()
      const { handleBatchDelete } = useAssetLifecycleActions(makeParams(store))

      await handleBatchDelete([{ name: '无编码' }])

      expect(mockElMessageError).toHaveBeenCalledWith('记录编码缺失，无法删除')
      expect(store.removeBatch).not.toHaveBeenCalled()
    })

    it('确认批删：过滤出 recordcode 调用 removeBatch 并清空选择、刷新', async () => {
      const store = makeStore()
      const params = makeParams(store)
      const { handleBatchDelete } = useAssetLifecycleActions(params)

      await handleBatchDelete([{ recordcode: 'R1' }, { name: '无编码' }, { recordcode: 'R2' }])

      expect(store.removeBatch).toHaveBeenCalledWith(['R1', 'R2'])
      expect(params.clearSelection).toHaveBeenCalled()
      expect(params.refresh).toHaveBeenCalled()
    })

    it('取消批删：不调用 removeBatch', async () => {
      mockElMessageBoxConfirm.mockRejectedValue('cancel')
      const store = makeStore()
      const { handleBatchDelete } = useAssetLifecycleActions(makeParams(store))

      await handleBatchDelete([{ recordcode: 'R1' }])

      expect(store.removeBatch).not.toHaveBeenCalled()
      expect(mockElMessageError).not.toHaveBeenCalled()
    })

    it('批删失败：默认出口 logError + notifyCallerError 精确出参（委托单源语义）', async () => {
      const store = makeStore()
      const boom = new Error('boom')
      store.removeBatch.mockRejectedValue(boom)
      const { handleBatchDelete } = useAssetLifecycleActions(makeParams(store))

      await handleBatchDelete([{ recordcode: 'R1' }])

      expect(mockLogError).toHaveBeenCalledWith(
        'composables/useAssetLifecycleActions',
        '批量删除失败:',
        boom,
      )
      expect(mockNotifyCallerError).toHaveBeenCalledWith(boom, '批量删除失败，请重试')
    })

    it('双击：confirm 未决期间第二次调用直接返回，removeBatch 仅 1 次（M-FE-02 守卫）', async () => {
      let resolveConfirm!: () => void
      mockElMessageBoxConfirm.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          resolveConfirm = resolve
        }),
      )
      const store = makeStore()
      const { handleBatchDelete, isBatchDeleting } = useAssetLifecycleActions(makeParams(store))

      const first = handleBatchDelete([{ recordcode: 'R1' }])
      await Promise.resolve()
      expect(isBatchDeleting.value).toBe(true)

      await handleBatchDelete([{ recordcode: 'R1' }])
      expect(mockElMessageBoxConfirm).toHaveBeenCalledTimes(1)

      resolveConfirm()
      await first
      expect(store.removeBatch).toHaveBeenCalledTimes(1)
    })

    it('isBatchDeleting 批删完成后复位', async () => {
      const store = makeStore()
      const { handleBatchDelete, isBatchDeleting } = useAssetLifecycleActions(makeParams(store))

      await handleBatchDelete([{ recordcode: 'R1' }])

      expect(isBatchDeleting.value).toBe(false)
    })

    it('isBatchDeleting 批删失败后复位', async () => {
      const store = makeStore()
      store.removeBatch.mockRejectedValue(new Error('boom'))
      const { handleBatchDelete, isBatchDeleting } = useAssetLifecycleActions(makeParams(store))

      await handleBatchDelete([{ recordcode: 'R1' }])

      expect(isBatchDeleting.value).toBe(false)
    })
  })

  describe('handleExportExcel', () => {
    it('委托 useServerExcelExport 服务端导出', async () => {
      const store = makeStore()
      const { handleExportExcel } = useAssetLifecycleActions(makeParams(store))

      await handleExportExcel()

      expect(mockExportFromServer).toHaveBeenCalledTimes(1)
      const arg = mockExportFromServer.mock.calls[0][0] as Record<string, unknown>
      expect(arg.entityName).toBe('损坏资产')
      expect(arg.totalCount).toBe(2)
      expect(arg.fetchExport).toBe(mockFetchExport)
    })

    it('透传 store.pagination.total 给服务端做上限预判', async () => {
      const store = makeStore()
      store.pagination.total = 5000
      const { handleExportExcel } = useAssetLifecycleActions(makeParams(store))

      await handleExportExcel()

      const arg = mockExportFromServer.mock.calls[0][0] as Record<string, unknown>
      expect(arg.totalCount).toBe(5000)
    })
  })
})
