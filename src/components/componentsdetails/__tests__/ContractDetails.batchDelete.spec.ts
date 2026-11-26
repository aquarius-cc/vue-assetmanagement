/**
 * [批次 5 M-FE-02 先红回归] ContractDetails 批量删除连点防护。
 * 修复前（inline handler 无守卫）：连点两次 → 叠加确认框 ×2、对已删编码重复发 batch_delete。
 * 修复后（useEntityBatchDelete 单源守卫）：confirm/removeBatch 各仅 1 次。
 * 本文件先于重构落地并实证红态，重构后转绿，作为 CT-4 回归屏障证据。
 */
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  message: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() },
  removeBatch: vi.fn(async () => ({ total: 2, success_count: 2, fail_count: 0 })),
}))

vi.mock('element-plus', () => ({
  ElMessage: mocks.message,
  ElMessageBox: { confirm: mocks.confirm },
}))

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), go: vi.fn() }),
  useRoute: () => ({ path: '/', params: {}, query: {}, matched: [] }),
  onBeforeRouteUpdate: vi.fn(),
  onBeforeRouteLeave: vi.fn(),
}))

vi.mock('@/stores/contractStore', () => ({
  useContractStore: () => ({
    removeBatch: mocks.removeBatch,
    remove: vi.fn(),
    getList: vi.fn(),
  }),
  contractExportExcel: vi.fn(),
}))

vi.mock('@/composables/useSmartListConfig', () => ({
  useSmartListConfig: () => ({}),
}))

vi.mock('@/composables/useKeepAliveReload', () => ({
  useKeepAliveReload: vi.fn(),
}))

vi.mock('@/composables/useServerExcelExport', () => ({
  useServerExcelExport: () => ({ exportFromServer: vi.fn() }),
}))

vi.mock('@/utils/excelExporter', () => ({ exportToExcel: vi.fn() }))

vi.mock('@/utils/logger', () => ({ logError: vi.fn(), logInfo: vi.fn() }))

vi.mock('@/utils/errorHandler', () => ({ notifyCallerError: vi.fn(), showErrorMessage: vi.fn() }))

import ContractDetails from '../ContractDetails.vue'

/** SmartListContainer 桩：渲染默认插槽并注入 selectedRows（勾选 2 行） */
const SmartListContainerStub = {
  name: 'SmartListContainer',
  template: `
    <div>
      <slot
        :data="[]" :loading="false" :current-page="1" :page-size="20" :total="0"
        :search="{}" :page-size-options="[20]"
        :handle-size-change="noop" :handle-current-change="noop"
        :perform-search="noop" :handle-selection-change="noop"
        :selected-rows="selectedRows"
      />
    </div>
  `,
  data: () => ({
    selectedRows: [{ recordcode: 'C1' }, { recordcode: 'C2' }],
    noop: () => {},
  }),
}

function mountContract() {
  return mount(ContractDetails, {
    global: {
      plugins: [createPinia()],
      stubs: {
        SmartListContainer: SmartListContainerStub,
        CommonList: { template: '<div />' },
        'el-button': { template: '<button type="button"><slot /></button>' },
        'el-tag': { template: '<span><slot /></span>' },
        'router-view': { template: '<div />' },
      },
    },
  })
}

describe('ContractDetails 批量删除连点防护（M-FE-02）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.confirm.mockResolvedValue('confirm')
    mocks.removeBatch.mockResolvedValue({ total: 2, success_count: 2, fail_count: 0 })
  })

  it('连点两次批量删除：confirm 与 removeBatch 各仅 1 次', async () => {
    // confirm 挂起模拟「确认框打开中」，期间第二次连点
    let resolveConfirm!: () => void
    mocks.confirm.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveConfirm = resolve
      }),
    )

    const wrapper = mountContract()
    const button = wrapper.findAll('button').find((b) => b.text().includes('批量删除'))
    expect(button).toBeDefined()

    // 第一次点击：进入 confirm 挂起
    await button!.trigger('click')
    // 第二次连点（修复前：叠加第二个确认框 → confirm 调用 2 次 → 本断言必红）
    await button!.trigger('click')

    expect(mocks.confirm).toHaveBeenCalledTimes(1)

    resolveConfirm()
    await vi.waitFor(() => expect(mocks.removeBatch).toHaveBeenCalledTimes(1))
    expect(mocks.removeBatch).toHaveBeenCalledWith(['C1', 'C2'])
  })
})
