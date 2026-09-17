import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive } from 'vue'
import type { AssetDetail } from '@/types/asset'
import type { AssetType } from '@/types/assettype'
import type { Storage } from '@/types/storage'
import {
  useUnregisteredFormLinkage,
  type UnregisteredFormFields,
  type UnregisteredFormLinkageStores,
} from '../useUnregisteredFormLinkage'

const mocks = vi.hoisted(() => ({
  elMessage: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

vi.mock('element-plus', () => ({
  ElMessage: mocks.elMessage,
}))

function makeAssetType(code: string, name: string): AssetType {
  return {
    id: 1,
    type_code: code,
    type_name: name,
    type_specification: '硬件',
    sort_order: 0,
    created_at: '2025-01-01T00:00:00+08:00',
    updated_at: '2025-01-01T00:00:00+08:00',
    is_deleted: false,
  }
}

function makeAsset(code: string, name: string): AssetDetail {
  return {
    id: 1,
    asset_code: code,
    asset_name: name,
    asset_specification: 'R720',
    asset_type_code: 'AT_HW',
    asset_current_status: 'in_store',
    asset_entry_date: '2025-01-01',
    asset_purchase_date: '2025-01-01',
    asset_purchase_price: '100',
    asset_purchase_number: 1,
    asset_using_location: null,
    asset_contract_code: null,
    is_deleted: false,
    created_at: '2025-01-01T00:00:00+08:00',
    updated_at: '2025-01-01T00:00:00+08:00',
  }
}

function makeStorage(code: string, name: string): Storage {
  return {
    id: 1,
    storage_code: code,
    storage_name: name,
    storage_address: '一号仓库',
    created_at: '2025-01-01T00:00:00+08:00',
    updated_at: '2025-01-01T00:00:00+08:00',
    is_deleted: false,
  }
}

function makeForm(): UnregisteredFormFields {
  return reactive<UnregisteredFormFields>({
    asset_type_code_display: '',
    asset_type_code: '',
    related_asset_code_display: '',
    related_asset_code: '',
    target_storage_code_display: '',
    target_storage_code: '',
  })
}

interface SetupOptions {
  assetTypes?: AssetType[]
  assets?: AssetDetail[]
  storages?: Storage[]
  rejectAssetTypes?: boolean
  rejectAssets?: boolean
  rejectStorages?: boolean
}

function setup(options: SetupOptions = {}) {
  const form = makeForm()
  const assetStore = {
    getByName: options.rejectAssets
      ? vi.fn(async () => {
          throw new Error('boom')
        })
      : vi.fn(async () => options.assets ?? []),
  }
  const assetTypeStore = {
    getList: options.rejectAssetTypes
      ? vi.fn(async () => {
          throw new Error('boom')
        })
      : vi.fn(async () => options.assetTypes ?? []),
  }
  const storageStore = {
    getList: options.rejectStorages
      ? vi.fn(async () => {
          throw new Error('boom')
        })
      : vi.fn(async () => options.storages ?? []),
  }
  const linkage = useUnregisteredFormLinkage(form, {
    assetStore,
    assetTypeStore,
    storageStore,
  } as UnregisteredFormLinkageStores)
  return { form, assetStore, assetTypeStore, storageStore, linkage }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('useUnregisteredFormLinkage', () => {
  it('查询资产类型经转换回传建议项', async () => {
    const { linkage, assetTypeStore } = setup({
      assetTypes: [makeAssetType('AT_HW', '硬件')],
    })
    const cb = vi.fn()
    await linkage.fetchAssetTypeSuggestions('硬', cb)
    expect(assetTypeStore.getList).toHaveBeenCalledWith({
      search: '硬',
      page: 1,
      page_size: 20,
    })
    expect(cb).toHaveBeenCalledWith([{ value: 'AT_HW', type_code: 'AT_HW', type_name: '硬件' }])
  })

  it('资产类型空关键词直接回传空结果', async () => {
    const { linkage, assetTypeStore } = setup()
    const cb = vi.fn()
    await linkage.fetchAssetTypeSuggestions('   ', cb)
    expect(assetTypeStore.getList).not.toHaveBeenCalled()
    expect(cb).toHaveBeenCalledWith([])
  })

  it('资产类型获取异常时回传空结果', async () => {
    const { linkage } = setup({ rejectAssetTypes: true })
    const cb = vi.fn()
    await linkage.fetchAssetTypeSuggestions('硬', cb)
    expect(cb).toHaveBeenCalledWith([])
  })

  it('选择资产类型时回填显示值与编码', () => {
    const { form, linkage } = setup()
    linkage.handleAssetTypeSelect({ value: 'AT_HW', type_code: 'AT_HW', type_name: '硬件' })
    expect(form.asset_type_code_display).toBe('AT_HW')
    expect(form.asset_type_code).toBe('AT_HW')
  })

  it('资产类型编码空白时清空编码', () => {
    const { form, linkage } = setup()
    form.asset_type_code = 'AT_HW'
    linkage.handleAssetTypeCodeChange('  ')
    expect(form.asset_type_code).toBe('')
  })

  it('资产类型编码非空白时保留编码', () => {
    const { form, linkage } = setup()
    form.asset_type_code = 'AT_HW'
    linkage.handleAssetTypeCodeChange('AT_NEW')
    expect(form.asset_type_code).toBe('AT_HW')
  })

  it('查询关联资产经转换回传建议项', async () => {
    const { linkage, assetStore } = setup({
      assets: [makeAsset('A001', '服务器')],
    })
    const cb = vi.fn()
    await linkage.fetchAssetSuggestions('服务器', cb)
    expect(assetStore.getByName).toHaveBeenCalledWith('服务器')
    expect(cb).toHaveBeenCalledWith([
      {
        value: 'A001',
        asset_name: '服务器',
        asset_code: 'A001',
        asset_specification: 'R720',
      },
    ])
  })

  it('关联资产空关键词直接回传空结果', async () => {
    const { linkage, assetStore } = setup()
    const cb = vi.fn()
    await linkage.fetchAssetSuggestions('   ', cb)
    expect(assetStore.getByName).not.toHaveBeenCalled()
    expect(cb).toHaveBeenCalledWith([])
  })

  it('关联资产获取异常时回传空结果', async () => {
    const { linkage } = setup({ rejectAssets: true })
    const cb = vi.fn()
    await linkage.fetchAssetSuggestions('服务器', cb)
    expect(cb).toHaveBeenCalledWith([])
  })

  it('选择关联资产时回填显示值与编码', () => {
    const { form, linkage } = setup()
    linkage.handleRelatedAssetSelect({
      value: 'A001',
      asset_name: '服务器',
      asset_code: 'A001',
      asset_specification: 'R720',
    })
    expect(form.related_asset_code_display).toBe('A001')
    expect(form.related_asset_code).toBe('A001')
  })

  it('关联资产编码空白时清空编码', () => {
    const { form, linkage } = setup()
    form.related_asset_code = 'A001'
    linkage.handleRelatedAssetCodeChange('   ')
    expect(form.related_asset_code).toBe('')
  })

  it('关联资产编码非空白时保留编码', () => {
    const { form, linkage } = setup()
    form.related_asset_code = 'A001'
    linkage.handleRelatedAssetCodeChange('A002')
    expect(form.related_asset_code).toBe('A001')
  })

  it('查询目标仓库经转换回传建议项', async () => {
    const { linkage, storageStore } = setup({
      storages: [makeStorage('S01', '一号仓库')],
    })
    const cb = vi.fn()
    await linkage.fetchStorageSuggestions('一号', cb)
    expect(storageStore.getList).toHaveBeenCalledWith({
      search: '一号',
      page: 1,
      page_size: 20,
    })
    expect(cb).toHaveBeenCalledWith([
      {
        value: 'S01',
        storage_name: '一号仓库',
        storage_code: 'S01',
        storage_address: '一号仓库',
      },
    ])
  })

  it('目标仓库空关键词直接回传空结果', async () => {
    const { linkage, storageStore } = setup()
    const cb = vi.fn()
    await linkage.fetchStorageSuggestions('   ', cb)
    expect(storageStore.getList).not.toHaveBeenCalled()
    expect(cb).toHaveBeenCalledWith([])
  })

  it('目标仓库获取异常时回传空结果', async () => {
    const { linkage } = setup({ rejectStorages: true })
    const cb = vi.fn()
    await linkage.fetchStorageSuggestions('一号', cb)
    expect(cb).toHaveBeenCalledWith([])
  })

  it('选择目标仓库时回填显示值与编码', () => {
    const { form, linkage } = setup()
    linkage.handleStorageSelect({
      value: 'S01',
      storage_code: 'S01',
      storage_name: '一号仓库',
      storage_address: '一号仓库',
    })
    expect(form.target_storage_code_display).toBe('S01')
    expect(form.target_storage_code).toBe('S01')
  })

  it('目标仓库编码空白时清空编码', () => {
    const { form, linkage } = setup()
    form.target_storage_code = 'S01'
    linkage.handleStorageCodeChange('  ')
    expect(form.target_storage_code).toBe('')
  })

  it('目标仓库编码非空白时保留编码', () => {
    const { form, linkage } = setup()
    form.target_storage_code = 'S01'
    linkage.handleStorageCodeChange('S02')
    expect(form.target_storage_code).toBe('S01')
  })
})
