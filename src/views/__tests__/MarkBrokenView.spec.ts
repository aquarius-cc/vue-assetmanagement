/**
 * @file MarkBrokenView 回归测试（M-4 / BF-095）
 *
 * ① 加载失败时向 AssetOperationLayout 传递 fetchError，@retry 重新拉取资产；
 * ② 损坏登记载荷与成功回跳（C-4 formRef 回归屏障同型加固）。
 *
 * 环境约束（vitest.config.ts 为独立 plugins:[vue()]，不合并 vite.config.ts）：
 * unplugin-vue-components / ElementPlusResolver 不生效 → 所有 el-* 必须显式 stub。
 */
import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { elMessageSuccess, elMessageError, backMock, getAssetByCodeMock, markBrokenMock } =
  vi.hoisted(() => ({
    elMessageSuccess: vi.fn(),
    elMessageError: vi.fn(),
    backMock: vi.fn(),
    getAssetByCodeMock: vi.fn(),
    markBrokenMock: vi.fn(),
  }))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { code: 'ASSET-MB-001' } }),
  useRouter: () => ({ push: vi.fn(), back: backMock }),
}))

vi.mock('@/api/asset', () => ({
  assetAPI: { getAssetByCode: getAssetByCodeMock },
}))

vi.mock('@/stores', () => ({
  useAssetStore: () => ({ markAssetAsBroken: markBrokenMock }),
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

import MarkBrokenView from '../MarkBrokenView.vue'

const ASSET = {
  recordcode: 'ASSET-MB-001',
  asset_code: 'DEMO-M001',
  asset_name: '显示器',
  asset_current_status: 'in_use',
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
  'el-input': {
    name: 'ElInput',
    modelValue: String,
    props: ['modelValue', 'type', 'rows', 'placeholder'],
    template:
      '<input class="el-input" :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    emits: ['update:modelValue'],
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
  mount(MarkBrokenView, {
    global: { stubs, directives: { loading: {} } },
  })

describe('MarkBrokenView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAssetByCodeMock.mockReset()
    markBrokenMock.mockReset()
    getAssetByCodeMock.mockResolvedValue(ASSET)
    markBrokenMock.mockResolvedValue(undefined)
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

  it('损坏登记：markAssetAsBroken 载荷正确且成功后回跳', async () => {
    const wrapper = mountView()
    await flushPromises()

    const inputs = wrapper.findAll('input')
    const reasonInput = inputs.find((i) => i.attributes('placeholder')?.includes('损坏原因'))
    await reasonInput!.setValue('意外摔落')

    const submitBtn = wrapper.findAll('button').find((b) => b.text().includes('确认损坏'))
    expect(submitBtn).toBeTruthy()
    await submitBtn!.trigger('click')
    await flushPromises()

    expect(markBrokenMock).toHaveBeenCalledWith('ASSET-MB-001', {
      broken_reason: '意外摔落',
      broken_description: undefined,
      broken_date: undefined,
    })
    expect(elMessageSuccess).toHaveBeenCalledWith('损坏登记成功')
    expect(backMock).toHaveBeenCalled()
  })
})
