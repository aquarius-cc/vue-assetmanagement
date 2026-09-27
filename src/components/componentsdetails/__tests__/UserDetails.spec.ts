/**
 * UserDetails 接线测试（首个该组件的测试；D2）
 *
 * **为什么需要它**：BF-047 让「搜索后导出」导出行集合 = 搜索结果行集合，实现方式是
 * 一条**跨三跳的隐式链**——组件 `search.onSearchStateChange` 写入
 * `userStore.currentKeyword` → `createUserExcelExport(userStore)` 读该值转发给后端。
 * 这条链上任何一环被误删（例如重构时把 `onSearchStateChange` 当冗余回调清掉），
 * 运行时**不报错**、列表照常显示，只有导出行集合悄悄变回全量——而既有测试全是
 * composable/store 层的单测，覆盖不到组件这一跳。
 *
 * **范围克制（不铺开组件测试）**：本文件只断言「接线是否存在且指向正确」，
 * 不测渲染、不测交互、不测样式。渲染与交互由 SmartListContainer / CommonList 的
 * 既有 spec 覆盖。刻意不做全量快照测试——快照只会把无关变更卷进来。
 */
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SmartListContainer from '@/components/commoncomponents/SmartListContainer.vue'
import UserDetails from '../UserDetails.vue'

const hoisted = vi.hoisted(() => ({
  getList: vi.fn(async () => []),
  getFuzzySearch: vi.fn(async () => ({ count: 0, results: [] })),
  setUserCurrentKeyword: vi.fn(),
  createUserExcelExport: vi.fn(() => vi.fn()),
  list: [] as unknown[],
  loading: false,
  refreshFlag: false,
  pagination: { page: 1, page_size: 20, total: 0 },
  setRefreshFlag: vi.fn(),
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: () => ({
    getList: hoisted.getList,
    getFuzzySearch: hoisted.getFuzzySearch,
    list: hoisted.list,
    loading: hoisted.loading,
    refreshFlag: hoisted.refreshFlag,
    pagination: hoisted.pagination,
    setRefreshFlag: hoisted.setRefreshFlag,
  }),
  setUserCurrentKeyword: hoisted.setUserCurrentKeyword,
}))

vi.mock('@/composables/useUserExcelExport', () => ({
  createUserExcelExport: hoisted.createUserExcelExport,
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ matched: [{ name: 'UserDetails' }], query: {}, params: {} }),
  useRouter: () => ({ push: vi.fn(async () => undefined) }),
}))

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn() },
  ElMessageBox: { confirm: vi.fn(async () => true) },
}))

vi.mock('@/utils/errorHandler', () => ({
  showErrorMessage: vi.fn(),
  getAxiosStatus: vi.fn(() => 500),
}))

type SearchConfig = {
  performSearch?: (keyword: string, page: number, page_size: number) => Promise<unknown>
  onSearchStateChange?: (keyword: string) => void
}

const mountUserDetails = () => {
  const wrapper = mount(UserDetails, { shallow: true })
  const storeConfig = wrapper.findComponent(SmartListContainer).props('storeConfig') as {
    search?: SearchConfig
  }
  return { wrapper, search: storeConfig.search as SearchConfig }
}

describe('UserDetails 搜索/导出接线（BF-047）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('搜索态变更时把搜索词写入 store 的 currentKeyword', () => {
    // 导出行集合 = 搜索结果行集合，全靠这一跳；缺了它导出就静默回到全量口径。
    const { search } = mountUserDetails()

    expect(typeof search.onSearchStateChange).toBe('function')
    search.onSearchStateChange?.('张三')

    expect(hoisted.setUserCurrentKeyword).toHaveBeenCalledWith('张三')
  })

  it('组件卸载时清空 currentKeyword，避免残留搜索词', () => {
    const { wrapper } = mountUserDetails()

    wrapper.unmount()

    // currentKeyword 是模块级状态，生命周期长于组件；不清则下次进入本页导出带上残留词。
    expect(hoisted.setUserCurrentKeyword).toHaveBeenCalledWith('')
  })

  it('performSearch 走模糊搜索接口并原样透传分页', async () => {
    const { search } = mountUserDetails()

    await search.performSearch?.('李四', 2, 50)

    expect(hoisted.getFuzzySearch).toHaveBeenCalledWith({ keyword: '李四', page: 2, page_size: 50 })
  })

  it('导出 composable 接收同一 store 实例，读取其中的搜索词', () => {
    mountUserDetails()

    // 转发链入口：createUserExcelExport 必须在挂载时用 store 实例创建，
    // 否则读不到 onSearchStateChange 写入的 currentKeyword。
    expect(hoisted.createUserExcelExport).toHaveBeenCalledTimes(1)
    expect(hoisted.createUserExcelExport).toHaveBeenCalledWith(
      expect.objectContaining({ getList: hoisted.getList }),
    )
  })
})
