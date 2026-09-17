import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive } from 'vue'
import type { AssetDetail } from '@/types/asset'
import type { AssetAutocompleteItem, OutAssetCreateExtended } from '@/types/outasset'
import { useOutAssetAssetSelection } from '../useOutAssetAssetSelection'

const mocks = vi.hoisted(() => ({
  elMessage: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  elMessageBox: vi.fn(async () => 'confirm'),
}))

vi.mock('element-plus', () => ({
  ElMessage: mocks.elMessage,
  ElMessageBox: Object.assign(mocks.elMessageBox, {
    confirm: vi.fn(async () => 'confirm'),
    prompt: vi.fn(async () => ({ value: '' })),
  }),
}))

function makeAsset(overrides: Partial<AssetDetail> = {}): AssetDetail {
  return {
    asset_code: 'A001',
    asset_name: '服务器',
    recordcode: 'RC-1',
    asset_purchase_price: '100',
    asset_purchase_number: 1,
    asset_unit: null,
    asset_brand: null,
    asset_specification: null,
    asset_type_code: 'AT_HW',
    asset_contract_code: null,
    asset_purchase_date: '2025-01-01',
    asset_warranty_period: null,
    asset_entry_date: '2025-01-01',
    asset_storage_code: null,
    asset_using_location: null,
    asset_entry_person_jobcode: null,
    asset_applicant_jobcode: null,
    asset_manager_jobcode: null,
    asset_current_status: 'in_store',
    physical_grade: 'good',
    asset_description: null,
    harddisk_sns: [],
    ...overrides,
  }
}

function blurEvent(value: string): FocusEvent {
  return { target: { value } } as unknown as FocusEvent
}

function setup(overrides: { getByName?: (...args: unknown[]) => Promise<unknown> } = {}) {
  const form = reactive<OutAssetCreateExtended>({
    outasset_code: null,
    outasset_number: 1,
    outasset_date: '2025-01-01',
  })
  const assetStore = {
    getByName: vi.fn(async () => []),
    getById: vi.fn(async () => null),
    ...overrides,
  }
  const composable = useOutAssetAssetSelection(
    form,
    assetStore as Parameters<typeof useOutAssetAssetSelection>[1],
  )
  return { form, assetStore, ...composable }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('useOutAssetAssetSelection', () => {
  it('handleAssetNameSelect 从下拉选择填充表单', () => {
    const { form, handleAssetNameSelect, selectedAsset } = setup()
    const item: AssetAutocompleteItem = {
      value: '服务器',
      asset_name: '服务器',
      asset_code: 'A001',
      asset_current_status: 'in_store',
    }
    handleAssetNameSelect(item)
    expect(form.outasset_name).toBe('服务器')
    expect(form.outasset_code).toBe('A001')
    expect(selectedAsset.value).toEqual(item)
  })

  it('handleAssetNameChange 名称一致时保留选中项', () => {
    const { form, handleAssetNameSelect, handleAssetNameChange, selectedAsset } = setup()
    handleAssetNameSelect({
      value: '服务器',
      asset_name: '服务器',
      asset_code: 'A001',
      asset_current_status: '',
    })
    handleAssetNameChange('服务器')
    expect(selectedAsset.value).not.toBeNull()
    expect(form.outasset_name).toBe('服务器')
  })

  it('handleAssetNameChange 名称不一致时清空选中项', () => {
    const { handleAssetNameSelect, handleAssetNameChange, selectedAsset } = setup()
    handleAssetNameSelect({
      value: '服务器',
      asset_name: '服务器',
      asset_code: 'A001',
      asset_current_status: '',
    })
    handleAssetNameChange('打印机')
    expect(selectedAsset.value).toBeNull()
  })

  it('handleAssetNameBlur 与选中项一致时直接返回', async () => {
    const { handleAssetNameSelect, handleAssetNameBlur, assetStore } = setup()
    handleAssetNameSelect({
      value: '服务器',
      asset_name: '服务器',
      asset_code: 'A001',
      asset_current_status: '',
    })
    await handleAssetNameBlur(blurEvent('服务器'))
    expect(assetStore.getByName).not.toHaveBeenCalled()
  })

  it('handleAssetNameBlur 空值时清空资产信息', async () => {
    const { handleAssetNameBlur, form, selectedAsset, assetStore } = setup()
    form.outasset_name = '服务器'
    form.outasset_code = 'A001'
    await handleAssetNameBlur(blurEvent(''))
    expect(form.outasset_name).toBe('')
    expect(form.outasset_code).toBe('')
    expect(selectedAsset.value).toBeNull()
    expect(assetStore.getByName).not.toHaveBeenCalled()
  })

  it('按名称校验无匹配结果时提示名称错误', async () => {
    const { form, handleAssetNameBlur, selectedAsset, assetStore } = setup({
      getByName: vi.fn(async () => []),
    })
    await handleAssetNameBlur(blurEvent('不存在'))
    expect(assetStore.getByName).toHaveBeenCalledWith('不存在')
    expect(form.outasset_code).toBe('名称错误，请重新输入')
    expect(selectedAsset.value).toBeNull()
  })

  it('按名称校验命唯一结果时回填资产', async () => {
    const { form, handleAssetNameBlur, selectedAsset } = setup({
      getByName: vi.fn(async () => [makeAsset()]),
    })
    await handleAssetNameBlur(blurEvent('服务器'))
    expect(form.outasset_name).toBe('服务器')
    expect(form.outasset_code).toBe('A001')
    expect(selectedAsset.value).toEqual({
      value: '服务器',
      asset_name: '服务器',
      asset_code: 'A001',
      asset_current_status: 'in_store',
    })
  })

  it('唯一结果未带状态时回填空状态', async () => {
    const { form, handleAssetNameBlur, selectedAsset } = setup({
      getByName: vi.fn(async () => [{ ...makeAsset(), asset_current_status: undefined }]),
    })
    await handleAssetNameBlur(blurEvent('服务器'))
    expect(form.outasset_code).toBe('A001')
    expect(selectedAsset.value?.asset_current_status).toBe('')
  })

  it('按名称校验多结果时提示从下拉选择', async () => {
    const { form, handleAssetNameBlur, selectedAsset } = setup({
      getByName: vi.fn(async () => [
        makeAsset({ asset_code: 'A001' }),
        makeAsset({ asset_code: 'A002', asset_name: '服务器2' }),
      ]),
    })
    await handleAssetNameBlur(blurEvent('服务器'))
    expect(form.outasset_code).toBe('(请从下拉列表中选择正确的资人')
    expect(selectedAsset.value).toBeNull()
  })

  it('名称校验接口异常时标记验证失败', async () => {
    const { form, handleAssetNameBlur, selectedAsset } = setup({
      getByName: vi.fn(async () => {
        throw new Error('boom')
      }),
    })
    await handleAssetNameBlur(blurEvent('服务器'))
    expect(form.outasset_code).toBe('验证失败')
    expect(selectedAsset.value).toBeNull()
  })

  it('validateAssetByName 空值直接清空', async () => {
    const { form, validateAssetByName, selectedAsset, assetStore } = setup()
    form.outasset_name = 'x'
    form.outasset_code = 'x'
    await validateAssetByName('   ')
    expect(form.outasset_name).toBe('')
    expect(form.outasset_code).toBe('')
    expect(selectedAsset.value).toBeNull()
    expect(assetStore.getByName).not.toHaveBeenCalled()
  })

  it('handleAssetCodeChange 空编码时清空资产信息', async () => {
    const { form, handleAssetCodeChange, selectedAsset, assetStore } = setup()
    form.outasset_name = '服务器'
    form.outasset_code = 'A001'
    await handleAssetCodeChange('')
    expect(form.outasset_name).toBe('')
    expect(form.outasset_code).toBe('')
    expect(selectedAsset.value).toBeNull()
    expect(assetStore.getById).not.toHaveBeenCalled()
  })

  it('handleAssetCodeChange 命中资产时回填名称与选中项', async () => {
    const { form, handleAssetCodeChange, selectedAsset, assetStore } = setup({
      getById: vi.fn(async () => makeAsset()),
    })
    await handleAssetCodeChange('A001')
    expect(assetStore.getById).toHaveBeenCalledWith('A001')
    expect(form.outasset_name).toBe('服务器')
    expect(selectedAsset.value).toEqual({
      value: '服务器',
      asset_name: '服务器',
      asset_code: 'A001',
      asset_current_status: 'in_store',
    })
  })

  it('handleAssetCodeChange 未命中资产时提示编码错误', async () => {
    const { form, handleAssetCodeChange, selectedAsset } = setup({
      getById: vi.fn(async () => null),
    })
    await handleAssetCodeChange('NO-SUCH')
    expect(form.outasset_code).toBe('编码错误，无此资产')
    expect(form.outasset_name).toBe('')
    expect(selectedAsset.value).toBeNull()
  })

  it('handleAssetCodeChange 接口异常时提示错误并清空', async () => {
    const { form, handleAssetCodeChange } = setup({
      getById: vi.fn(async () => {
        throw new Error('boom')
      }),
    })
    await handleAssetCodeChange('A001')
    expect(mocks.elMessage.error).toHaveBeenCalledWith('系统错误，请稍后再试')
    expect(form.outasset_name).toBe('')
    expect(form.outasset_code).toBe('')
  })

  it('handleAssetSelect 从组件选择资产并提示成功', () => {
    const { form, handleAssetSelect, selectedAsset } = setup()
    handleAssetSelect(makeAsset())
    expect(form.outasset_code).toBe('A001')
    expect(form.outasset_name).toBe('服务器')
    expect(selectedAsset.value).toEqual({
      value: '服务器',
      asset_name: '服务器',
      asset_code: 'A001',
      asset_current_status: 'in_store',
    })
    expect(mocks.elMessage.success).toHaveBeenCalledWith('资产已选择')
  })
})
