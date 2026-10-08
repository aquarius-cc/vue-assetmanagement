import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGroupedAssetSession, type GroupedPageSnapshot } from '../groupedAssetSession'

const SNAPSHOT: GroupedPageSnapshot = {
  filters: { asset_current_status: 'in_store' },
  page: 3,
  expandedKeys: ['["HT2024-001","笔记本",null,null]'],
  childPages: { '["HT2024-001","笔记本",null,null]': 2 },
  selectedCodes: ['ZC001', 'ZC002'],
  scrollTop: 120,
}

describe('groupedAssetSession store（BF-078 需求3）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始态：无快照、无恢复旗', () => {
    const store = useGroupedAssetSession()
    expect(store.snapshot).toBeNull()
    expect(store.pendingRestore).toBe(false)
  })

  it('save 写入快照并置恢复旗', () => {
    const store = useGroupedAssetSession()
    store.save(SNAPSHOT)
    expect(store.snapshot).toEqual(SNAPSHOT)
    expect(store.pendingRestore).toBe(true)
  })

  it('clearPending 摘旗但保留快照（水合后供排障）', () => {
    const store = useGroupedAssetSession()
    store.save(SNAPSHOT)
    store.clearPending()
    expect(store.pendingRestore).toBe(false)
    expect(store.snapshot).toEqual(SNAPSHOT)
  })

  it('clear 双清（出子树落点时由 guards afterEach 调用）', () => {
    const store = useGroupedAssetSession()
    store.save(SNAPSHOT)
    store.clear()
    expect(store.snapshot).toBeNull()
    expect(store.pendingRestore).toBe(false)
  })

  it('save 覆盖旧快照（多次离开取最后一次状态）', () => {
    const store = useGroupedAssetSession()
    store.save(SNAPSHOT)
    const next: GroupedPageSnapshot = { ...SNAPSHOT, page: 7, scrollTop: 0 }
    store.save(next)
    expect(store.snapshot).toEqual(next)
    expect(store.pendingRestore).toBe(true)
  })
})
