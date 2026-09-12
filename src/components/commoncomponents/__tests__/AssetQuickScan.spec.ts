import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AssetQuickScan from '../AssetQuickScan.vue'
import { ElMessage } from 'element-plus'

// mock store 层（组件经 useAssetStore 消费 API，架构分层规则）
const getByIdMock = vi.fn()
const combineSearchMock = vi.fn()
vi.mock('@/stores/assetStore', () => ({
  useAssetStore: () => ({
    getById: getByIdMock,
    combineSearch: combineSearchMock,
  }),
}))

// 折叠态由 app store 驱动（测试固定展开态）
vi.mock('@/stores/app', () => ({
  useAppStore: () => ({ sidebarCollapsed: false }),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

// 路由 mock：记录 push 调用
const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRoute: () => ({ fullPath: '/main', params: {}, query: {} }),
  useRouter: () => ({ push: pushMock }),
}))

const stubs = {
  'el-input': {
    template:
      '<input class="scan-input-el" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keyup.enter="$emit(\'keyup.enter\')" />',
    props: ['modelValue', 'placeholder', 'clearable', 'disabled'],
    emits: ['update:modelValue', 'keyup.enter'],
  },
  'el-icon': { template: '<span class="el-icon"><slot /></span>' },
  'el-popover': { template: '<div class="el-popover"><slot name="reference" /><slot /></div>' },
  Iphone: { template: '<span />' },
  Search: { template: '<span />' },
}

const mountOptions = {
  global: { stubs },
}

describe('AssetQuickScan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pushMock.mockReset()
  })

  const setInput = async (wrapper: ReturnType<typeof mount>, value: string) => {
    const input = wrapper.find('input')
    await input.setValue(value)
  }

  const pressEnter = async (wrapper: ReturnType<typeof mount>) => {
    await wrapper.find('input').trigger('keyup.enter')
    await flushPromises()
  }

  it('recordcode 直查命中即跳 BasicAssetDetails', async () => {
    getByIdMock.mockResolvedValue({ asset_code: 'A001' } as never)

    const wrapper = mount(AssetQuickScan, mountOptions)
    await setInput(wrapper, 'REC-2024-0001')
    await pressEnter(wrapper)

    expect(getByIdMock).toHaveBeenCalledWith('REC-2024-0001')
    expect(pushMock).toHaveBeenCalledWith({
      name: 'BasicAssetDetails',
      query: { code: 'REC-2024-0001' },
    })
  })

  it('直查未命中时按 asset_code 组合搜索解析 recordcode', async () => {
    getByIdMock.mockResolvedValue(null as never)
    combineSearchMock.mockResolvedValue({
      count: 1,
      results: [{ recordcode: 'REC-FROM-CODE', asset_code: 'A-X' }],
    } as never)

    const wrapper = mount(AssetQuickScan, mountOptions)
    await setInput(wrapper, 'A-X')
    await pressEnter(wrapper)

    expect(combineSearchMock).toHaveBeenCalledWith(expect.objectContaining({ asset_code: 'A-X' }))
    expect(pushMock).toHaveBeenCalledWith({
      name: 'BasicAssetDetails',
      query: { code: 'REC-FROM-CODE' },
    })
  })

  it('完整 URL 抽取末段作为 recordcode 直查', async () => {
    getByIdMock.mockResolvedValue({ asset_code: 'A001' } as never)

    const wrapper = mount(AssetQuickScan, mountOptions)
    await setInput(wrapper, 'http://host/main/assetdetails/REC-IN-URL')
    await pressEnter(wrapper)

    expect(getByIdMock).toHaveBeenCalledWith('REC-IN-URL')
    expect(pushMock).toHaveBeenCalledWith({
      name: 'BasicAssetDetails',
      query: { code: 'REC-IN-URL' },
    })
  })

  it('两败不跳转并 warning', async () => {
    getByIdMock.mockResolvedValue(null as never)
    combineSearchMock.mockResolvedValue({ count: 0, results: [] } as never)

    const wrapper = mount(AssetQuickScan, mountOptions)
    await setInput(wrapper, 'NOT-EXIST')
    await pressEnter(wrapper)

    expect(pushMock).not.toHaveBeenCalled()
    expect(ElMessage.warning).toHaveBeenCalled()
  })

  it('组合搜索多条命中时 warning 不跳', async () => {
    getByIdMock.mockResolvedValue(null as never)
    combineSearchMock.mockResolvedValue({
      count: 2,
      results: [{ recordcode: 'R1' }, { recordcode: 'R2' }],
    } as never)

    const wrapper = mount(AssetQuickScan, mountOptions)
    await setInput(wrapper, 'A-MULTI')
    await pressEnter(wrapper)

    expect(pushMock).not.toHaveBeenCalled()
    expect(ElMessage.warning).toHaveBeenCalled()
  })

  it('JSON 二维码内容提取 recordcode/asset_code 键（L2 兼容 qr_code 原设计形态）', async () => {
    getByIdMock.mockResolvedValue({ asset_code: 'A001' } as never)

    const wrapper = mount(AssetQuickScan, mountOptions)
    // 形态 1：qr_code 字段原设计 JSON（recordcode 键）
    await wrapper
      .find('input')
      .setValue('{"recordcode": "ASSET-20240912-AAA1", "asset_code": "A001"}')
    await wrapper.find('input').trigger('keyup.enter')
    await flushPromises()
    expect(getByIdMock).toHaveBeenCalledWith('ASSET-20240912-AAA1')
    expect(pushMock).toHaveBeenCalledWith({
      name: 'BasicAssetDetails',
      query: { code: 'ASSET-20240912-AAA1' },
    })
  })

  it('空输入不触发查询', async () => {
    const wrapper = mount(AssetQuickScan, mountOptions)
    await setInput(wrapper, '   ')
    await pressEnter(wrapper)

    expect(getByIdMock).not.toHaveBeenCalled()
    expect(combineSearchMock).not.toHaveBeenCalled()
  })

  it('查询后成功跳转清空输入', async () => {
    getByIdMock.mockResolvedValue({ asset_code: 'A001' } as never)

    const wrapper = mount(AssetQuickScan, mountOptions)
    await setInput(wrapper, 'REC-CLEAR')
    await pressEnter(wrapper)

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
  })
})
