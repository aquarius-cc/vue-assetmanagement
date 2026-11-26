/**
 * [M-06] useAssetLifecycleActions × 4 store 集成测试
 * 真 store（createEntityStore 工厂）+ 真 composable，仅 mock element-plus 与 4 个 API 模块。
 * 防同义反复：若 4 store 未加 disableAutoMessage，工厂会再弹一条「<实体>删除成功」，
 * 与 composable 手动的「删除成功」叠加 → toHaveBeenCalledTimes(1) 必红。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBrokenAssetStore } from '@/stores/brokenAssetStore'
import { useLostAssetStore } from '@/stores/lostAssetStore'
import { useFoundAssetStore } from '@/stores/foundAssetStore'
import { useRepairAssetStore } from '@/stores/repairAssetStore'
import { brokenAssetAPI } from '@/api/brokenAsset'
import { lostAssetAPI } from '@/api/lostAsset'
import { foundAssetAPI } from '@/api/foundAsset'
import { repairAssetAPI } from '@/api/repairAsset'
import { useAssetLifecycleActions, type AssetLifecycleStore } from '../useAssetLifecycleActions'
import { ElMessage } from 'element-plus'

const { mockConfirm } = vi.hoisted(() => ({ mockConfirm: vi.fn() }))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  ElMessageBox: { confirm: mockConfirm },
}))

vi.mock('@/api/brokenAsset', () => ({
  brokenAssetAPI: {
    getBrokenAssets: vi.fn(),
    getBrokenAssetByCode: vi.fn(),
    createBrokenAsset: vi.fn(),
    updateBrokenAsset: vi.fn(),
    deleteBrokenAsset: vi.fn(),
    batchDeleteBrokenAssets: vi.fn(),
    batchCreateBrokenAssets: vi.fn(),
    getBrokenAssetsByAsset: vi.fn(),
    exportExcel: vi.fn(),
  },
}))

vi.mock('@/api/lostAsset', () => ({
  lostAssetAPI: {
    getLostAssets: vi.fn(),
    getLostAssetByCode: vi.fn(),
    createLostAsset: vi.fn(),
    updateLostAsset: vi.fn(),
    deleteLostAsset: vi.fn(),
    batchDeleteLostAssets: vi.fn(),
    markAssetAsLost: vi.fn(),
    foundAsset: vi.fn(),
    exportExcel: vi.fn(),
  },
}))

vi.mock('@/api/foundAsset', () => ({
  foundAssetAPI: {
    getFoundAssets: vi.fn(),
    getFoundAssetByCode: vi.fn(),
    createFoundAsset: vi.fn(),
    updateFoundAsset: vi.fn(),
    deleteFoundAsset: vi.fn(),
    batchDeleteFoundAssets: vi.fn(),
    exportExcel: vi.fn(),
  },
}))

vi.mock('@/api/repairAsset', () => ({
  repairAssetAPI: {
    getRepairAssets: vi.fn(),
    getRepairAssetByCode: vi.fn(),
    createRepairAsset: vi.fn(),
    updateRepairAsset: vi.fn(),
    deleteRepairAsset: vi.fn(),
    batchDeleteRepairAssets: vi.fn(),
    repairAsset: vi.fn(),
    repairDone: vi.fn(),
    repairFailed: vi.fn(),
    exportExcel: vi.fn(),
  },
}))

interface IntegrationCase {
  name: string
  useStore: () => unknown
  api: object
  del: string
  batchDel: string
}

const cases: IntegrationCase[] = [
  {
    name: '损坏资产',
    useStore: useBrokenAssetStore,
    api: brokenAssetAPI,
    del: 'deleteBrokenAsset',
    batchDel: 'batchDeleteBrokenAssets',
  },
  {
    name: '遗失资产',
    useStore: useLostAssetStore,
    api: lostAssetAPI,
    del: 'deleteLostAsset',
    batchDel: 'batchDeleteLostAssets',
  },
  {
    name: '找回资产',
    useStore: useFoundAssetStore,
    api: foundAssetAPI,
    del: 'deleteFoundAsset',
    batchDel: 'batchDeleteFoundAssets',
  },
  {
    name: '维修资产',
    useStore: useRepairAssetStore,
    api: repairAssetAPI,
    del: 'deleteRepairAsset',
    batchDel: 'batchDeleteRepairAssets',
  },
]

describe('[M-06] 生命周期详情页删除单出口集成', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockConfirm.mockResolvedValue('confirm')
  })

  it.each(cases)('$name 删除仅 1 条成功提示', async ({ useStore, api, del }) => {
    const deleteFn = (api as unknown as Record<string, ReturnType<typeof vi.fn>>)[del]
    deleteFn.mockResolvedValue(undefined)

    const lifecycleStore = useStore() as unknown as AssetLifecycleStore
    const { handleDelete } = useAssetLifecycleActions({
      store: lifecycleStore,
      entityName: '测试实体',
      fetchExport: vi.fn().mockResolvedValue({ blob: new Blob(), headers: {}, filename: 't.xlsx' }),
      refresh: vi.fn().mockResolvedValue(undefined),
    })

    handleDelete({ recordcode: 'R1' })
    await vi.waitFor(() => expect(vi.mocked(ElMessage.success)).toHaveBeenCalled())

    // 修复前：工厂自动弹「<实体>删除成功」+ composable 弹「删除成功」= 2 次 → 本断言必红
    expect(vi.mocked(ElMessage.success)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(ElMessage.success)).toHaveBeenCalledWith('删除成功')
  })

  it.each(cases)(
    '$name 批删连点仅发 1 次 batchDelete（M-FE-02 守卫）',
    async ({ useStore, api, batchDel }) => {
      const batchDeleteFn = (api as unknown as Record<string, ReturnType<typeof vi.fn>>)[batchDel]
      batchDeleteFn.mockResolvedValue({
        total: 1,
        success_count: 1,
        fail_count: 0,
        success_ids: ['R1'],
        fail_items: [],
      })

      // confirm 挂起模拟「确认框打开中」，期间触发第二次连点
      let resolveConfirm!: () => void
      mockConfirm.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          resolveConfirm = resolve
        }),
      )

      const lifecycleStore = useStore() as unknown as AssetLifecycleStore
      const { handleBatchDelete, isBatchDeleting } = useAssetLifecycleActions({
        store: lifecycleStore,
        entityName: '测试实体',
        fetchExport: vi
          .fn()
          .mockResolvedValue({ blob: new Blob(), headers: {}, filename: 't.xlsx' }),
        refresh: vi.fn().mockResolvedValue(undefined),
        clearSelection: vi.fn(),
      })

      const first = handleBatchDelete([{ recordcode: 'R1' }])
      await Promise.resolve()
      expect(isBatchDeleting.value).toBe(true)

      // 第二次连点：guard 直接返回，不叠加确认框
      await handleBatchDelete([{ recordcode: 'R1' }])
      expect(mockConfirm).toHaveBeenCalledTimes(1)

      resolveConfirm()
      await first
      expect(batchDeleteFn).toHaveBeenCalledTimes(1)
      expect(batchDeleteFn).toHaveBeenCalledWith(['R1'])
      expect(isBatchDeleting.value).toBe(false)
    },
  )
})
