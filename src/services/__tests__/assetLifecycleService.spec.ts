import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockOutAssetCreate = vi.fn().mockResolvedValue(undefined)
const mockAssetGetList = vi.fn().mockResolvedValue(undefined)
const mockRecycleAssetCreate = vi.fn().mockResolvedValue(undefined)
const mockDamagedAssetCreate = vi.fn().mockResolvedValue(undefined)
const mockWasteAssetCreate = vi.fn().mockResolvedValue(undefined)

vi.mock('@/stores/assetStore', () => ({
  useAssetStore: vi.fn(() => ({ getList: mockAssetGetList })),
}))

vi.mock('@/stores/outAssetStore', () => ({
  useOutAssetStore: vi.fn(() => ({ create: mockOutAssetCreate })),
}))

vi.mock('@/stores/recycleAssetStore', () => ({
  useRecycleAssetStore: vi.fn(() => ({ create: mockRecycleAssetCreate })),
}))

vi.mock('@/stores/damagedAssetStore', () => ({
  useDamagedAssetStore: vi.fn(() => ({ create: mockDamagedAssetCreate })),
}))

vi.mock('@/stores/wasteAssetStore', () => ({
  useWasteAssetStore: vi.fn(() => ({ create: mockWasteAssetCreate })),
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn() },
}))

vi.mock('@/utils/Format', () => ({
  formatDate: vi.fn(),
}))

describe('Asset Lifecycle Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleAssetOut', () => {
    it('should call outAssetStore.create and refresh asset list', async () => {
      const { handleAssetOut } = await import('../assetLifecycleService')
      const formData = { asset_code: 'A001', out_person: 'John' } as any

      await handleAssetOut(formData)

      expect(mockOutAssetCreate).toHaveBeenCalledWith(formData)
      expect(mockAssetGetList).toHaveBeenCalled()
    })

    it('should show success message after creation', async () => {
      const { ElMessage } = await import('element-plus')
      const { handleAssetOut } = await import('../assetLifecycleService')

      await handleAssetOut({ asset_code: 'A001' } as any)

      expect(ElMessage.success).toHaveBeenCalledWith('资产出库成功')
    })
  })

  describe('handleAssetRecycle', () => {
    it('should format date and call recycleAssetStore.create', async () => {
      const { formatDate } = await import('@/utils/Format')
      const { handleAssetRecycle } = await import('../assetLifecycleService')

      vi.mocked(formatDate).mockReturnValue('2024-01-15')

      const formData = { recycle_asset_date: '2024-01-15T00:00:00Z' } as any
      await handleAssetRecycle(formData)

      expect(formatDate).toHaveBeenCalledWith('2024-01-15T00:00:00Z')
      expect(mockRecycleAssetCreate).toHaveBeenCalledWith({
        recycle_asset_date: '2024-01-15',
      })
    })

    it('should fallback to current date when formatDate returns null', async () => {
      const { formatDate } = await import('@/utils/Format')
      const { handleAssetRecycle } = await import('../assetLifecycleService')

      vi.mocked(formatDate).mockReturnValue(null)

      const formData = { recycle_asset_date: null } as any
      await handleAssetRecycle(formData)

      expect(mockRecycleAssetCreate).toHaveBeenCalled()
      const callArg = mockRecycleAssetCreate.mock.calls[0][0]
      expect(callArg.recycle_asset_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should refresh asset list and show success message', async () => {
      const { ElMessage } = await import('element-plus')
      const { handleAssetRecycle } = await import('../assetLifecycleService')

      await handleAssetRecycle({ recycle_asset_date: '2024-01-15' } as any)

      expect(mockAssetGetList).toHaveBeenCalled()
      expect(ElMessage.success).toHaveBeenCalledWith('资产回收成功')
    })
  })

  describe('handleAssetDamaged', () => {
    it('should call damagedAssetStore.create and refresh asset list', async () => {
      const { handleAssetDamaged } = await import('../assetLifecycleService')
      const formData = { asset_code: 'A001' } as any

      await handleAssetDamaged(formData)

      expect(mockDamagedAssetCreate).toHaveBeenCalledWith(formData)
      expect(mockAssetGetList).toHaveBeenCalled()
    })

    it('should show success message', async () => {
      const { ElMessage } = await import('element-plus')
      const { handleAssetDamaged } = await import('../assetLifecycleService')

      await handleAssetDamaged({ asset_code: 'A001' } as any)

      expect(ElMessage.success).toHaveBeenCalledWith('资产已标记为待报废')
    })
  })

  describe('handleAssetWaste', () => {
    it('should call wasteAssetStore.create and refresh asset list', async () => {
      const { handleAssetWaste } = await import('../assetLifecycleService')
      const formData = { asset_code: 'A001' } as any

      await handleAssetWaste(formData)

      expect(mockWasteAssetCreate).toHaveBeenCalledWith(formData)
      expect(mockAssetGetList).toHaveBeenCalled()
    })

    it('should show success message', async () => {
      const { ElMessage } = await import('element-plus')
      const { handleAssetWaste } = await import('../assetLifecycleService')

      await handleAssetWaste({ asset_code: 'A001' } as any)

      expect(ElMessage.success).toHaveBeenCalledWith('资产报废处理成功')
    })
  })
})
