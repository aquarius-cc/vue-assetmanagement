/**
 * @file RepairAssetView 回归测试（M-4 / BF-095）
 *
 * ① 加载失败时向 AssetOperationLayout 传递 fetchError，@retry 重新拉取资产；
 * ② 提交维修申请载荷与成功回跳（C-4 formRef 回归屏障同型加固）。
 *
 * 环境约束（vitest.config.ts 为独立 plugins:[vue()]，不合并 vite.config.ts）：
 * unplugin-vue-components / ElementPlusResolver 不生效 → 所有 el-* 必须显式 stub。
 */
import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { elMessageSuccess, elMessageError, backMock, getAssetByCodeMock, repairAssetMock } =
  vi.hoisted(() => ({
    elMessageSuccess: vi.fn(),
    elMessageError: vi.fn(),
    backMock: vi.fn(),
    getAssetByCodeMock: vi.fn(),
    repairAssetMock: vi.fn(),
  }))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { code: 'ASSET-RP-001' } }),
  useRouter: () => ({ push: vi.fn(), back: backMock }),
}))

vi.mock('@/api/asset', () => ({
  assetAPI: { getAssetByCode: getAssetByCodeMock },
}))

vi.mock('@/stores', () => ({
  useRepairAssetStore: () => ({ repairAsset: repairAssetMock }),
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
  ElMessage: { success: elMessageSuccess, error: elMessageError, warning: vi.fn() },
}))

import RepairAssetView from '../RepairAssetView.vue'

const ASSET = {
  recordcode: 'ASSET-RP-001',
  asset_code: 'DEMO-R001',
  asset_name: '服务器',
  asset_current_status: 'broken',
}

const stubs = {
  AssetOperationLayout: {
    name: 'AssetOperationLayout',
    props: ['fetchError'],
    template:
      '<div class="asset-operation-layout"><slot name="form" /><slot name="actions" /><button class="retry-btn" @click="$emit(\'retry\')">重试</button></div>',
    emits: ['retry'],
  },
  'el-alert': {
    template: '<div class="el-alert"><slot /></div>',
    props: ['type', 'title', 'closable'],
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
  'el-input': {
    name: 'ElInput',
    modelValue: String,
    props: ['modelValue', 'type', 'rows', 'placeholder'],
    template:
      '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    emits: ['update:modelValue'],
  },
  'el-input-number': {
    name: 'ElInputNumber',
    modelValue: Number,
    props: ['modelValue', 'min', 'max'],
    emits: ['update:modelValue'],
    template:
      '<input class="el-input-number" type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
  },
  'el-date-picker': {
    name: 'ElDatePicker',
    modelValue: String,
    props: ['modelValue', 'type', 'placeholder', 'format', 'value-format'],
    emits: ['update:modelValue'],
    template:
      '<input class="el-date-picker" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
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
  mount(RepairAssetView, {
    global: { stubs, directives: { loading: {} } },
  })

describe('RepairAssetView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAssetByCodeMock.mockReset()
    repairAssetMock.mockReset()
    getAssetByCodeMock.mockResolvedValue(ASSET)
    repairAssetMock.mockResolvedValue(undefined)
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

  it('提交维修申请：repairAsset 载荷正确且成功后回跳', async () => {
    const wrapper = mountView()
    await flushPromises()

    const submitBtn = wrapper.findAll('button').find((b) => b.text().includes('提交维修申请'))
    expect(submitBtn).toBeTruthy()
    await submitBtn!.trigger('click')
    await flushPromises()

    expect(repairAssetMock).toHaveBeenCalledWith('ASSET-RP-001', {
      repair_asset_number: 1,
      repair_date: '',
      repair_reason: '',
      repair_description: null,
    })
    expect(elMessageSuccess).toHaveBeenCalledWith('维修申请已提交')
    expect(backMock).toHaveBeenCalled()
  })
})
