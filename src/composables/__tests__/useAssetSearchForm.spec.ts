/** [批次4 C4/M-14] useAssetSearchForm 唯一实现——搜索表单收敛的行为锚（先红后绿） */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAssetSearchForm } from '../useAssetSearchForm'

describe('useAssetSearchForm（M-14 收敛单源）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initial 深拷贝：两次实例化不共享引用', () => {
    const initial = { asset_code: '', asset_name: '' }
    const a = useAssetSearchForm({ initial, search: vi.fn() })
    const b = useAssetSearchForm({ initial, search: vi.fn() })
    a.searchForm.asset_code = 'A-001'
    expect(b.searchForm.asset_code).toBe('')
    expect(initial.asset_code).toBe('')
  })

  it('buildExtraParams：空串与纯空格字段被滤除，其余 trim 后透出', () => {
    const { searchForm, buildExtraParams } = useAssetSearchForm({
      initial: { asset_code: ' A-001 ', asset_name: '  ', asset_brand: '' },
      search: vi.fn(),
    })
    expect(buildExtraParams()).toEqual({ asset_code: 'A-001' })
    void searchForm
  })

  it('handleSearch：先重置页码再以 extraParams 调 search，并翻转 searched', async () => {
    const calls: string[] = []
    const search = vi.fn(async () => calls.push('search'))
    const { handleSearch, searched } = useAssetSearchForm({
      initial: { asset_code: 'A-001' },
      search,
      resetPage: () => calls.push('resetPage'),
    })
    await handleSearch()
    expect(calls).toEqual(['resetPage', 'search'])
    expect(search).toHaveBeenCalledWith({ asset_code: 'A-001' })
    expect(searched.value).toBe(true)
  })

  it('无 resetPage：不重置页码，直接搜索', async () => {
    const search = vi.fn()
    const { handleSearch } = useAssetSearchForm({ initial: { asset_code: '' }, search })
    await handleSearch()
    expect(search).toHaveBeenCalledWith({})
    expect(search).toHaveBeenCalledTimes(1)
  })
})
