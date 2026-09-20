import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AssetBatchImport from '../AssetBatchImport.vue'
import type { AssetExcelRow } from '@/types/batch-import'

const h = vi.hoisted(() => ({
  mockGo: vi.fn(),
  mockPush: vi.fn(),
  mockBatchCreateAssets: vi.fn(),
  mockSetRefreshFlag: vi.fn(),
  mockPost: vi.fn(),
  mockDownloadTemplate: vi.fn(),
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
  mockWarning: vi.fn(),
  state: {} as { previewData?: { value: unknown[] } },
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ go: h.mockGo, push: h.mockPush, back: vi.fn() }),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: h.mockSuccess,
    error: h.mockError,
    warning: h.mockWarning,
    info: vi.fn(),
  },
}))

vi.mock('@element-plus/icons-vue', () => ({
  Upload: { template: '<span />' },
}))

vi.mock('@/composables/useBatchImport', async () => {
  const { ref, computed } = await import('vue')
  const previewData = ref<unknown[]>([])
  const validDataCount = computed(
    () =>
      previewData.value.filter(
        (r) => (r as { validationStatus: string }).validationStatus === 'success',
      ).length,
  )
  h.state.previewData = previewData as { value: unknown[] }
  return {
    useBatchImport: () => ({
      previewData,
      validDataCount,
      parseError: ref(''),
      handleFileChange: vi.fn(),
      clearData: vi.fn(),
    }),
  }
})

vi.mock('@/stores/assetStore', () => ({
  useAssetStore: () => ({
    batchCreateAssets: h.mockBatchCreateAssets,
    setRefreshFlag: h.mockSetRefreshFlag,
    getByName: vi.fn(async () => []),
  }),
}))

vi.mock('@/api/index', () => ({
  request: { post: h.mockPost },
}))

vi.mock('@/utils/batchImport/templateExport', () => ({
  downloadExcelTemplate: h.mockDownloadTemplate,
}))

vi.mock('@/utils/SubmitBatch', () => ({
  extractErrorMessage: () => '细节',
}))

const stubs = {
  'el-card': { template: '<div><slot /><slot name="header" /></div>' },
  'el-icon': { template: '<span><slot /></span>' },
  'el-upload': {
    template: '<div><slot /><slot name="tip" /></div>',
    methods: { clearFiles() {} },
  },
  'el-button': {
    props: ['type', 'loading', 'disabled', 'icon'],
    emits: ['click'],
    template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>',
  },
  'el-alert': { template: '<div />' },
  'el-table': { template: '<div />' },
  'el-table-column': { template: '<div />' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-pagination': { template: '<div />' },
  BatchImportGuideCard: { template: '<div />' },
}

function makeRow(id = 1) {
  const data: AssetExcelRow = {
    asset_name: `资产${id}`,
    asset_specification: '规格',
    asset_purchase_price: '100',
    asset_purchase_number: '1',
    asset_entry_date: '2025-01-01',
    asset_type: 'SVR-01',
  }
  return { data, validationStatus: 'success' as const }
}

function mountView() {
  return mount(AssetBatchImport, { global: { stubs, directives: { loading: {} } } })
}

function clickSubmit(wrapper: ReturnType<typeof mountView>) {
  const btn = wrapper.findAll('button').find((b) => b.text().includes('提交有效数据'))
  return btn!.trigger('click')
}

describe('AssetBatchImport 提交走 store 链路', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.state.previewData!.value = []
    h.mockBatchCreateAssets.mockResolvedValue({
      total: 0,
      success_count: 0,
      fail_count: 0,
      success_items: [],
      fail_items: [],
    })
  })

  it('调用 assetStore.batchCreateAssets，不直连 request.post', async () => {
    h.state.previewData!.value = [makeRow(1), makeRow(2)]
    h.mockBatchCreateAssets.mockResolvedValue({
      total: 2,
      success_count: 2,
      fail_count: 0,
      success_items: [],
      fail_items: [],
    })
    const wrapper = mountView()

    await clickSubmit(wrapper)
    await vi.waitFor(() => expect(h.mockBatchCreateAssets).toHaveBeenCalledTimes(1))

    expect(h.mockPost).not.toHaveBeenCalled()
    expect(h.mockSuccess).toHaveBeenCalledWith('全部导入成功！共 2 条')
    expect(h.mockGo).toHaveBeenCalledWith(-1)
    expect(h.mockSetRefreshFlag).toHaveBeenCalledWith(true)
  })

  it('部分失败时按 index 标记行级错误', async () => {
    h.state.previewData!.value = [makeRow(1), makeRow(2)]
    h.mockBatchCreateAssets.mockResolvedValue({
      total: 2,
      success_count: 1,
      fail_count: 1,
      success_items: [],
      fail_items: [{ index: 1, error_code: 'X', error_message: '单号重复' }],
    })
    const wrapper = mountView()

    await clickSubmit(wrapper)
    await vi.waitFor(() => expect(h.mockWarning).toHaveBeenCalled())

    const rows = h.state.previewData!.value as Array<{
      submitStatus?: string
      submitError?: string
    }>
    expect(rows[0].submitStatus).toBe('success')
    expect(rows[1].submitStatus).toBe('error')
    expect(rows[1].submitError).toBe('单号重复')
    expect(h.mockGo).not.toHaveBeenCalled()
  })

  it('400 响应携带 items 明细时行级标记且不抛错', async () => {
    h.state.previewData!.value = [makeRow(1), makeRow(2)]
    h.mockBatchCreateAssets.mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { data: { items: [{ field: ['错误A'] }, {}] } } },
    })
    const wrapper = mountView()

    await clickSubmit(wrapper)
    await vi.waitFor(() =>
      expect(h.mockWarning).toHaveBeenCalledWith('导入完成：部分数据验证失败，请查看错误详情'),
    )

    const rows = h.state.previewData!.value as Array<{
      submitStatus?: string
      submitError?: string
    }>
    expect(rows[0].submitStatus).toBe('error')
    expect(rows[0].submitError).toBe('错误A')
    expect(rows[1].submitStatus).toBe('success')
    expect(h.mockError).not.toHaveBeenCalled()
  })
})
