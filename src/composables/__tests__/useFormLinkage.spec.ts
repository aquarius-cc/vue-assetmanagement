import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive } from 'vue'
import { useFormLinkage } from '../useFormLinkage'

const mocks = vi.hoisted(() => ({
  elMessage: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: mocks.elMessage,
}))

interface AutocompleteItem {
  recordname: string
  recordcode: string
}

function setup(overrides: Partial<Parameters<typeof useFormLinkage<AutocompleteItem>>[0]> = {}) {
  const formData = reactive<Record<string, unknown>>({
    asset_name_display: '',
    damaged_asset_code: '',
  })
  const fetcher = overrides.fetcher ?? vi.fn(async () => [])
  const linkage = useFormLinkage<AutocompleteItem>({
    formData,
    displayField: 'asset_name_display',
    codeField: 'damaged_asset_code',
    getDisplayValue: (item) => item.recordname,
    getCodeValue: (item) => item.recordcode,
    fetcher,
    ...overrides,
  })
  return { formData, fetcher, linkage }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useFormLinkage', () => {
  it('fetchSuggestions 查询结果通过 transform 回传', async () => {
    const { fetcher, linkage } = setup({
      fetcher: vi.fn(async () => [
        { recordname: '服务器', recordcode: 'A001' },
        { recordname: '打印机', recordcode: 'A002' },
      ]),
    })
    const cb = vi.fn()
    await linkage.fetchSuggestions('服务', cb)
    expect(fetcher).toHaveBeenCalledWith('服务')
    expect(cb).toHaveBeenCalledWith([{ value: '服务器' }, { value: '打印机' }])
  })

  it('fetchSuggestions 空关键词时直接返回空结果', async () => {
    const { fetcher, linkage } = setup()
    const cb = vi.fn()
    await linkage.fetchSuggestions('   ', cb)
    expect(fetcher).not.toHaveBeenCalled()
    expect(cb).toHaveBeenCalledWith([])
  })

  it('fetchSuggestions 异常时回传空结果', async () => {
    const { linkage } = setup({
      fetcher: vi.fn(async () => {
        throw new Error('boom')
      }),
    })
    const cb = vi.fn()
    await linkage.fetchSuggestions('服务', cb)
    expect(cb).toHaveBeenCalledWith([])
  })

  it('handleSelect 回填展示值与编码值', () => {
    const { formData, linkage } = setup()
    linkage.handleSelect({ recordname: '服务器', recordcode: 'A001' })
    expect(formData.asset_name_display).toBe('服务器')
    expect(formData.damaged_asset_code).toBe('A001')
  })

  it('handleNameChange 空值清空编码字段', () => {
    const { formData, linkage } = setup()
    formData.damaged_asset_code = 'A001'
    linkage.handleNameChange('  ')
    expect(formData.damaged_asset_code).toBe('')
  })

  it('handleNameChange 非空值时保留编码字段', () => {
    const { formData, linkage } = setup()
    formData.damaged_asset_code = 'A001'
    linkage.handleNameChange('服务器')
    expect(formData.damaged_asset_code).toBe('A001')
  })

  it('handleNameBlur 空值时清空编码字段', async () => {
    const { formData, linkage, fetcher } = setup()
    await linkage.handleNameBlur(blurEvent('  '))
    expect(formData.damaged_asset_code).toBe('')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('handleNameBlur 已设置编码字段时直接返回', async () => {
    const { formData, linkage, fetcher } = setup()
    formData.damaged_asset_code = 'A001'
    await linkage.handleNameBlur(blurEvent('服务器'))
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('handleNameBlur 匹配到单条记录时回填', async () => {
    const { formData, linkage } = setup({
      fetcher: vi.fn(async () => [{ recordname: '服务器', recordcode: 'A001' }]),
    })
    await linkage.handleNameBlur(blurEvent('服务器'))
    expect(formData.asset_name_display).toBe('服务器')
    expect(formData.damaged_asset_code).toBe('A001')
  })

  it('handleNameBlur 无匹配记录时提示', async () => {
    const { formData, linkage, fetcher } = setup({ fetcher: vi.fn(async () => []) })
    await linkage.handleNameBlur(blurEvent('不存在'))
    expect(formData.damaged_asset_code).toBe('')
    expect(mocks.elMessage.warning).toHaveBeenCalledWith('未找到匹配的记录')
    expect(fetcher).toHaveBeenCalledWith('不存在')
  })

  it('handleNameBlur 查询异常时清空编码', async () => {
    const { formData, linkage, fetcher } = setup({
      fetcher: vi.fn(async () => {
        throw new Error('boom')
      }),
    })
    await linkage.handleNameBlur(blurEvent('服务器'))
    expect(formData.damaged_asset_code).toBe('')
    expect(fetcher).toHaveBeenCalledWith('服务器')
  })

  function blurEvent(value: string): FocusEvent {
    return { target: { value } } as unknown as FocusEvent
  }
})
