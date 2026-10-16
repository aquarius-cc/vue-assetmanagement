/**
 * @file FoundAssetView 回归测试（CT-4 回归屏障）
 *
 * 背景（C-4）：视图模板 el-form 有 ref="formRef"，但解构 useAssetOperationForm 返回值时
 * 漏了 formRef，导致模板 ref 绑定不到 composable 内部的 ref（useAssetOperationForm.ts:78），
 * handleSubmit 的 if (!formRef.value) return 恒早退，「确认找回」按钮完全失效。
 * 本套件锁定修复后的行为：点击「确认找回」→ foundAsset 被调用 → router.back() 被触发。
 *
 * 环境约束（vitest.config.ts 为独立 plugins:[vue()]，不合并 vite.config.ts）：
 * unplugin-vue-components / ElementPlusResolver 不生效 → 所有 el-* 必须显式 stub。
 */
import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { elMessageSuccess, elMessageError, pushMock, backMock, getAssetByCodeMock, foundAssetMock } =
  vi.hoisted(() => ({
    elMessageSuccess: vi.fn(),
    elMessageError: vi.fn(),
    pushMock: vi.fn(),
    backMock: vi.fn(),
    getAssetByCodeMock: vi.fn(),
    foundAssetMock: vi.fn(),
  }))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { code: 'ASSET-2026-001' } }),
  useRouter: () => ({ push: pushMock, back: backMock }),
}))

vi.mock('@/api/asset', () => ({
  assetAPI: { getAssetByCode: getAssetByCodeMock },
}))

vi.mock('@/stores', () => ({
  useLostAssetStore: () => ({ foundAsset: foundAssetMock }),
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

import FoundAssetView from '../FoundAssetView.vue'

const ASSET = {
  recordcode: 'ASSET-2026-001',
  asset_code: 'DEMO-A001',
  asset_name: '笔记本',
  asset_specification: '规格X',
  asset_current_status: 'lost',
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
    template:
      '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    emits: ['update:modelValue'],
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
  mount(FoundAssetView, {
    global: { stubs, directives: { loading: {} } },
  })

describe('FoundAssetView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAssetByCodeMock.mockReset()
    foundAssetMock.mockReset()
    pushMock.mockReset()
    backMock.mockReset()
    getAssetByCodeMock.mockResolvedValue(ASSET)
    foundAssetMock.mockResolvedValue(undefined)
  })

  it('点击「确认找回」：foundAsset 被调用且 router.back() 被触发（C-4 回归屏障）', async () => {
    const wrapper = mountView()
    await flushPromises()

    const submitBtn = wrapper.findAll('button').find((b) => b.text().includes('确认找回'))
    expect(submitBtn).toBeTruthy()
    await submitBtn!.trigger('click')
    await flushPromises()

    expect(foundAssetMock).toHaveBeenCalledWith('ASSET-2026-001', {
      found_location: undefined,
      found_description: undefined,
    })
    expect(elMessageSuccess).toHaveBeenCalledWith('遗失资产已找回并加入已回收待发放状态')
    expect(backMock).toHaveBeenCalled()
  })

  it('提交成功后表单字段数据随 submitFn 传递', async () => {
    const wrapper = mountView()
    await flushPromises()

    const inputs = wrapper.findAll('input')
    expect(inputs.length).toBe(2)
    await inputs[0]!.setValue('仓库A')
    await inputs[1]!.setValue('在仓库角落找到')

    const submitBtn = wrapper.findAll('button').find((b) => b.text().includes('确认找回'))
    await submitBtn!.trigger('click')
    await flushPromises()

    expect(foundAssetMock).toHaveBeenCalledWith('ASSET-2026-001', {
      found_location: '仓库A',
      found_description: '在仓库角落找到',
    })
  })

  it('提交失败：foundAsset 抛错时显示错误消息且不调用 router.back()', async () => {
    foundAssetMock.mockRejectedValue(new Error('network down'))

    const wrapper = mountView()
    await flushPromises()

    const submitBtn = wrapper.findAll('button').find((b) => b.text().includes('确认找回'))
    await submitBtn!.trigger('click')
    await flushPromises()

    expect(foundAssetMock).toHaveBeenCalled()
    expect(elMessageError).toHaveBeenCalledWith('找回操作失败，请重试')
    expect(backMock).not.toHaveBeenCalled()
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
