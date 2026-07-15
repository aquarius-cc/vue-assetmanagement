import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockStorageGetList = vi.fn()
vi.mock('@/stores/storageStore', () => ({
  useStorageStore: () => ({
    getList: mockStorageGetList,
  }),
}))

const mockAssetTypeGetList = vi.fn()
vi.mock('@/stores/assetTypeStore', () => ({
  useAssetTypeStore: () => ({
    getList: mockAssetTypeGetList,
  }),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
  },
}))

import { useRecycleFormAssociations } from '../useRecycleFormAssociations'
import { ElMessage } from 'element-plus'

const mockElMessageError = vi.mocked(ElMessage.error)

describe('useRecycleFormAssociations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStorageGetList.mockResolvedValue([])
    mockAssetTypeGetList.mockResolvedValue([])
  })

  describe('initialization', () => {
    it('returns correct initial state', () => {
      const { storages, assetTypes, loading, error } = useRecycleFormAssociations()

      expect(storages.value).toEqual([])
      expect(assetTypes.value).toEqual([])
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
    })
  })

  describe('loadStorages', () => {
    it('loads storages from store', async () => {
      const items = [{ id: 1, name: 'Storage1' }]
      mockStorageGetList.mockResolvedValue(items)

      const { loadStorages, storages } = useRecycleFormAssociations()
      const result = await loadStorages()

      expect(mockStorageGetList).toHaveBeenCalledWith({ page: 1, page_size: 100 })
      expect(storages.value).toEqual(items)
      expect(result).toEqual(items)
    })

    it('caches storages on subsequent calls', async () => {
      const items = [{ id: 1, name: 'Storage1' }]
      mockStorageGetList.mockResolvedValue(items)

      const { loadStorages } = useRecycleFormAssociations()
      await loadStorages()
      await loadStorages()

      expect(mockStorageGetList).toHaveBeenCalledTimes(1)
    })

    it('reloads when force is true', async () => {
      const items = [{ id: 1, name: 'Storage1' }]
      mockStorageGetList.mockResolvedValue(items)

      const { loadStorages } = useRecycleFormAssociations()
      await loadStorages()
      await loadStorages(true)

      expect(mockStorageGetList).toHaveBeenCalledTimes(2)
    })

    it('handles error gracefully', async () => {
      mockStorageGetList.mockRejectedValue(new Error('Network error'))

      const { loadStorages, storages, error } = useRecycleFormAssociations()
      const result = await loadStorages()

      expect(mockElMessageError).toHaveBeenCalledWith('加载仓库列表失败')
      expect(storages.value).toEqual([])
      expect(error.value).toBe('加载仓库列表失败')
      expect(result).toEqual([])
    })

    it('sets loading state during request', async () => {
      let resolvePromise!: (value: unknown) => void
      mockStorageGetList.mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve }),
      )

      const { loadStorages, loading } = useRecycleFormAssociations()

      const promise = loadStorages()
      expect(loading.value).toBe(true)

      resolvePromise([])
      await promise

      expect(loading.value).toBe(false)
    })
  })

  describe('loadAssetTypes', () => {
    it('loads asset types from store', async () => {
      const items = [{ id: 1, name: 'Type1' }]
      mockAssetTypeGetList.mockResolvedValue(items)

      const { loadAssetTypes, assetTypes } = useRecycleFormAssociations()
      const result = await loadAssetTypes()

      expect(mockAssetTypeGetList).toHaveBeenCalledWith({ page: 1, page_size: 100 })
      expect(assetTypes.value).toEqual(items)
      expect(result).toEqual(items)
    })

    it('caches asset types on subsequent calls', async () => {
      const items = [{ id: 1, name: 'Type1' }]
      mockAssetTypeGetList.mockResolvedValue(items)

      const { loadAssetTypes } = useRecycleFormAssociations()
      await loadAssetTypes()
      await loadAssetTypes()

      expect(mockAssetTypeGetList).toHaveBeenCalledTimes(1)
    })

    it('handles error gracefully', async () => {
      mockAssetTypeGetList.mockRejectedValue(new Error('Network error'))

      const { loadAssetTypes, assetTypes, error } = useRecycleFormAssociations()
      const result = await loadAssetTypes()

      expect(mockElMessageError).toHaveBeenCalledWith('加载资产类型失败')
      expect(assetTypes.value).toEqual([])
      expect(error.value).toBe('加载资产类型失败')
      expect(result).toEqual([])
    })
  })

  describe('loadAll', () => {
    it('loads both storages and asset types in parallel', async () => {
      mockStorageGetList.mockResolvedValue([{ id: 1 }])
      mockAssetTypeGetList.mockResolvedValue([{ id: 2 }])

      const { loadAll, storages, assetTypes } = useRecycleFormAssociations()
      await loadAll()

      expect(storages.value).toEqual([{ id: 1 }])
      expect(assetTypes.value).toEqual([{ id: 2 }])
      expect(mockStorageGetList).toHaveBeenCalledTimes(1)
      expect(mockAssetTypeGetList).toHaveBeenCalledTimes(1)
    })
  })

  describe('refresh', () => {
    it('force reloads all data', async () => {
      mockStorageGetList.mockResolvedValue([{ id: 1 }])
      mockAssetTypeGetList.mockResolvedValue([{ id: 2 }])

      const { refresh } = useRecycleFormAssociations()
      await refresh()

      expect(mockStorageGetList).toHaveBeenCalledTimes(1)
      expect(mockAssetTypeGetList).toHaveBeenCalledTimes(1)
    })

    it('bypasses cache', async () => {
      mockStorageGetList.mockResolvedValue([{ id: 1 }])
      mockAssetTypeGetList.mockResolvedValue([{ id: 2 }])

      const { loadAll, refresh } = useRecycleFormAssociations()
      await loadAll()
      await refresh()

      expect(mockStorageGetList).toHaveBeenCalledTimes(2)
      expect(mockAssetTypeGetList).toHaveBeenCalledTimes(2)
    })
  })
})
