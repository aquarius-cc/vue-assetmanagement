/**
 * useAssetLifecycleActions 单元测试
 * 覆盖：单删（recordcode 取键 + 取消/失败分支）、批删（空选择/缺编码/取消）、导出（服务端委托）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockConfirm, mockExportFromServer } = vi.hoisted(() => ({
  mockConfirm: vi.fn(),
  mockExportFromServer: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() },
  ElMessageBox: { confirm: mockConfirm },
}))

vi.mock('@/composables/useServerExcelExport', () => ({
  useServerExcelExport: () => ({ exportFromServer: mockExportFromServer }),
}))

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
    })

    it('删除失败：提示删除失败', async () => {
      mockElMessageBoxConfirm.mockResolvedValue(undefined)
      const store = makeStore()
      store.remove.mockRejectedValue(new Error('boom'))
      const { handleDelete } = useAssetLifecycleActions(makeParams(store))

      handleDelete({ recordcode: 'R1' })
      await vi.waitFor(() => expect(mockElMessageError).toHaveBeenCalledWith('删除失败'))

      expect(mockElMessageSuccess).not.toHaveBeenCalled()
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

    it('批删失败：提示批量删除失败', async () => {
      const store = makeStore()
      store.removeBatch.mockRejectedValue(new Error('boom'))
      const { handleBatchDelete } = useAssetLifecycleActions(makeParams(store))

      await handleBatchDelete([{ recordcode: 'R1' }])

      expect(mockElMessageError).toHaveBeenCalledWith('批量删除失败，请重试')
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
