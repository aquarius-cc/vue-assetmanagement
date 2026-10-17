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

/** 资产 B：仓库不同且无可回收出库单，用于复现 A→B 切换后的陈旧值残留（P1-03） */
const ASSET_B = {
  recordcode: 'ASSET-RC-002',
  asset_code: 'DEMO-B002',
  asset_name: '台式机',
  asset_current_status: 'in_use',
  asset_storage_code: 'ST-002',
}

const EMPTY_RECYCLABLE = { count: 0, results: [] }

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

/**
 * 同实例切换资产：重设资产/出库单 mock 后走 layout 的 @retry 触发 fetchAsset，
 * 使 `asset` ref 在**同一组件实例**内由 A 变为 B —— 这正是 P1-03 陈旧值残留的成因
 * （重挂载会清空状态，复现不了缺陷）。route→fetch 的转发链由 useAssetOperationForm.spec 覆盖，
 * 本套件聚焦 watch 对 `asset` 变更的处理。
 */
const switchAsset = async (
  wrapper: ReturnType<typeof mountView>,
  asset: typeof ASSET,
  recyclable: { count: number; results: unknown[] },
) => {
  getAssetByCodeMock.mockResolvedValue(asset)
  getRecyclableMock.mockResolvedValue(recyclable)
  const layout = wrapper.findComponent({ name: 'AssetOperationLayout' })
  await layout.find('.retry-btn').trigger('click')
  await flushPromises()
}

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

  it('【P1-03】A→B 切换：清空 A 的出库单残留，canSubmit 归 false 且提交被拦截', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(findSubmitBtn(wrapper)!.attributes('disabled')).toBeUndefined()

    await switchAsset(wrapper, ASSET_B, EMPTY_RECYCLABLE)

    expect(elMessageWarning).toHaveBeenCalledWith('该资产暂无可回收的在用出库记录，无法提交回收')
    const submitBtn = findSubmitBtn(wrapper)
    expect(submitBtn!.attributes('disabled')).toBeDefined()

    // 即便按钮事件被触发，submitFn 也因缺少出库单拒绝，不得对错误出库单建回收记录
    await submitBtn!.trigger('click')
    await flushPromises()
    expect(createRecycleMock).not.toHaveBeenCalled()
  })

  it('【P1-03】A→B→A 往返：出库单与仓库恢复为 A 的值（重置不误伤正常路径）', async () => {
    const wrapper = mountView()
    await flushPromises()

    await switchAsset(wrapper, ASSET_B, EMPTY_RECYCLABLE)
    await switchAsset(wrapper, ASSET, RECYCLABLE_HIT)

    expect(findSubmitBtn(wrapper)!.attributes('disabled')).toBeUndefined()
    expect(wrapper.find('select.el-select').element.value).toBe('ST-001')

    const submitBtn = findSubmitBtn(wrapper)
    await submitBtn!.trigger('click')
    await flushPromises()

    expect(createRecycleMock).toHaveBeenCalledWith(
      expect.objectContaining({ outasset_recordcode: 'OUT-RC-001', storage_code: 'ST-001' }),
    )
  })

  it('【P1-03】切到 B 后 storage_code 为 B 的仓库码，而非残留 A 的 ST-001', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('select.el-select').element.value).toBe('ST-001')

    await switchAsset(wrapper, ASSET_B, EMPTY_RECYCLABLE)

    expect(wrapper.find('select.el-select').element.value).toBe('ST-002')
  })

  it('【P1-03】竞态：A 的晚到响应不得写回已切到 B 的出库单', async () => {
    let releaseA: (() => void) | undefined
    getRecyclableMock.mockImplementation((params: { asset_code?: string }) => {
      if (params.asset_code === 'DEMO-A001') {
        return new Promise((resolve) => {
          releaseA = () => resolve(RECYCLABLE_HIT)
        })
      }
      return Promise.resolve(EMPTY_RECYCLABLE)
    })

    const wrapper = mountView()
    await flushPromises() // A 的 recyclable 请求仍挂起

    await switchAsset(wrapper, ASSET_B, EMPTY_RECYCLABLE)
    expect(findSubmitBtn(wrapper)!.attributes('disabled')).toBeDefined()

    releaseA!()
    await flushPromises()

    expect(findSubmitBtn(wrapper)!.attributes('disabled')).toBeDefined()
    expect(createRecycleMock).not.toHaveBeenCalled()
  })
})
