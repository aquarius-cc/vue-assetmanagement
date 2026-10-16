/**
 * @file RecycleAssetView 回归测试（F2 契约修复配套，CT-4 回归屏障）
 *
 * 背景：单条回收创建的后端契约要求 outasset_recordcode 关联真实出库单、
 * storage_code 必填，旧实现发空 recycle_asset_storage 且 outasset_recordcode
 * 误传资产 recordcode，必然 400。本套件锁定修复后行为：
 * ① 挂载后按 asset_code 解析活跃出库单（recyclable 接口，精确过滤防 icontains 子串误命中）；
 * ② 无活跃出库单时 warning + 禁用提交按钮；
 * ③ 提交载荷四必填字段正确；
 * ④ 成功后 router.back() 回跳详情页。
 *
 * 环境约束（vitest.config.ts 为独立 plugins:[vue()]，不合并 vite.config.ts）：
 * unplugin-vue-components / ElementPlusResolver 不生效 → 所有 el-* 必须显式 stub。
 */
import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  elMessageSuccess,
  elMessageError,
  elMessageWarning,
  backMock,
  getAssetByCodeMock,
  getRecyclableMock,
  createRecycleMock,
  storageGetListMock,
} = vi.hoisted(() => ({
  elMessageSuccess: vi.fn(),
  elMessageError: vi.fn(),
  elMessageWarning: vi.fn(),
  backMock: vi.fn(),
  getAssetByCodeMock: vi.fn(),
  getRecyclableMock: vi.fn(),
  createRecycleMock: vi.fn(),
  storageGetListMock: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { code: 'ASSET-RC-001' } }),
  useRouter: () => ({ push: vi.fn(), back: backMock }),
}))

vi.mock('@/api/asset', () => ({
  assetAPI: { getAssetByCode: getAssetByCodeMock },
}))

vi.mock('@/api/outAsset', () => ({
  outAssetAPI: { getRecyclableOutAssets: getRecyclableMock },
}))

vi.mock('@/stores', () => ({
  useRecycleAssetStore: () => ({ create: createRecycleMock }),
}))

vi.mock('@/stores/storageStore', () => ({
  useStorageStore: () => ({ getList: storageGetListMock }),
}))

vi.mock('@/stores/assetTypeStore', () => ({
  useAssetTypeStore: () => ({ getList: vi.fn().mockResolvedValue([]) }),
}))

vi.mock('@/composables/useOperationGuard', () => ({
  useOperationGuard: () => ({
    guardOnMounted: () => true,
    handleForbiddenError: () => false,
    handleConflictError: () => false,
    canOperateAsset: { value: true },
  }),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: elMessageSuccess,
    error: elMessageError,
    warning: elMessageWarning,
  },
}))

vi.mock('@/utils/Format', () => ({
  todayLocalISO: () => '2026-10-15',
}))

import RecycleAssetView from '../RecycleAssetView.vue'

const ASSET = {
  recordcode: 'ASSET-RC-001',
  asset_code: 'DEMO-A001',
  asset_name: '笔记本',
  asset_current_status: 'in_use',
  asset_storage_code: 'ST-001',
}

const RECYCLABLE_HIT = {
  count: 1,
  results: [{ recordcode: 'OUT-RC-001', asset_code: 'DEMO-A001' }],
}

const stubs = {
  AssetOperationLayout: {
    name: 'AssetOperationLayout',
    props: ['fetchError'],
    template:
      '<div class="asset-operation-layout"><slot name="form" /><slot name="actions" /><button class="retry-btn" @click="$emit(\'retry\')">重试</button></div>',
    emits: ['retry'],
  },
  'el-form': {
    name: 'ElForm',
    template: '<form class="el-form"><slot /></form>',
    methods: {
      validate(callback?: (valid: boolean) => void) {
        if (typeof callback === 'function') callback(true)
        return Promise.resolve(true)
      },
    },
  },
  'el-form-item': {
    template: '<div class="el-form-item"><slot /></div>',
    props: ['label', 'prop'],
  },
  'el-select': {
    name: 'ElSelect',
    props: ['modelValue', 'placeholder', 'loading', 'clearable'],
    emits: ['update:modelValue'],
    template:
      '<select class="el-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
  },
  'el-option': {
    name: 'ElOption',
    props: ['label', 'value'],
    template: '<option class="el-option" :value="value">{{ label }}</option>',
  },
  'el-input': {
    name: 'ElInput',
    modelValue: String,
    props: ['type', 'rows', 'placeholder', 'modelValue'],
    template:
      '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    emits: ['update:modelValue'],
  },
  'el-input-number': {
    name: 'ElInputNumber',
    props: ['modelValue', 'min', 'max'],
    emits: ['update:modelValue'],
    template:
      '<input class="el-input-number" type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
  },
  'el-button': {
    name: 'ElButton',
    props: ['type', 'loading', 'disabled'],
    template:
      '<button class="el-button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    emits: ['click'],
  },
  'el-icon': { template: '<span class="el-icon"><slot /></span>' },
}

const mountView = () =>
  mount(RecycleAssetView, {
    global: { stubs, directives: { loading: {} } },
  })

const findSubmitBtn = (wrapper: ReturnType<typeof mountView>) =>
  wrapper.findAll('button').find((b) => b.text().includes('确认回收'))

describe('RecycleAssetView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAssetByCodeMock.mockResolvedValue(ASSET)
    getRecyclableMock.mockResolvedValue(RECYCLABLE_HIT)
    createRecycleMock.mockResolvedValue(undefined)
    storageGetListMock.mockResolvedValue([
      { storage_code: 'ST-001', storage_name: '回收仓A' },
      { storage_code: 'ST-002', storage_name: '回收仓B' },
    ])
  })

  it('挂载后按 asset_code 解析活跃出库单，命中后启用提交按钮', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(getRecyclableMock).toHaveBeenCalledWith({
      asset_code: 'DEMO-A001',
      page: 1,
      page_size: 100,
    })
    const submitBtn = findSubmitBtn(wrapper)
    expect(submitBtn).toBeTruthy()
    expect(submitBtn!.attributes('disabled')).toBeUndefined()
  })

  it('无活跃出库单：warning 提示且禁用提交按钮（空结果阻断）', async () => {
    getRecyclableMock.mockResolvedValue({ count: 0, results: [] })

    const wrapper = mountView()
    await flushPromises()

    expect(elMessageWarning).toHaveBeenCalledWith('该资产暂无可回收的在用出库记录，无法提交回收')
    const submitBtn = findSubmitBtn(wrapper)
    expect(submitBtn!.attributes('disabled')).toBeDefined()
  })

  it('精确过滤防 icontains 子串误命中：仅取 asset_code 全等的出库单', async () => {
    getRecyclableMock.mockResolvedValue({
      count: 2,
      results: [
        { recordcode: 'OUT-WRONG', asset_code: 'DEMO-A0011' },
        { recordcode: 'OUT-RC-001', asset_code: 'DEMO-A001' },
      ],
    })

    const wrapper = mountView()
    await flushPromises()

    const submitBtn = findSubmitBtn(wrapper)
    await submitBtn!.trigger('click')
    await flushPromises()

    expect(createRecycleMock).toHaveBeenCalledWith(
      expect.objectContaining({ outasset_recordcode: 'OUT-RC-001' }),
    )
  })

  it('提交载荷含 F2 契约四必填字段，成功后回跳详情页', async () => {
    const wrapper = mountView()
    await flushPromises()

    const submitBtn = findSubmitBtn(wrapper)
    await submitBtn!.trigger('click')
    await flushPromises()

    expect(createRecycleMock).toHaveBeenCalledWith({
      outasset_recordcode: 'OUT-RC-001',
      storage_code: 'ST-001',
      recycle_asset_number: 1,
      recycle_asset_date: '2026-10-15',
      recycle_type: 'normal',
      recycle_asset_description: '',
    })
    expect(elMessageSuccess).toHaveBeenCalledWith('回收操作成功')
    expect(backMock).toHaveBeenCalled()
  })

  it('仓库下拉默认回填资产当前仓库编码，可切换为其他仓库', async () => {
    const wrapper = mountView()
    await flushPromises()

    const select = wrapper.find('select.el-select')
    expect(select.element.value).toBe('ST-001')

    await select.setValue('ST-002')
    const submitBtn = findSubmitBtn(wrapper)
    await submitBtn!.trigger('click')
    await flushPromises()

    expect(createRecycleMock).toHaveBeenCalledWith(
      expect.objectContaining({ storage_code: 'ST-002' }),
    )
  })

  it('加载失败时向 layout 传递 fetchError，@retry 重新拉取资产（M-4 回归屏障）', async () => {
    getAssetByCodeMock.mockRejectedValueOnce(new Error('boom'))

    const wrapper = mountView()
    await flushPromises()

    const layout = wrapper.findComponent({ name: 'AssetOperationLayout' })
    expect(layout.props('fetchError')).toBe(true)

    getAssetByCodeMock.mockResolvedValue(ASSET)
    await layout.find('.retry-btn').trigger('click')
    await flushPromises()

    expect(getAssetByCodeMock).toHaveBeenCalledTimes(2)
    expect(layout.props('fetchError')).toBe(false)
  })
})
