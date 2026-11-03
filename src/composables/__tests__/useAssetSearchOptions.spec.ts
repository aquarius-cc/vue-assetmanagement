/**
 * useAssetSearchOptions 单元 spec（OP-07，FR-6 榜单 71 行件）
 *
 * 锚定面（消费方 useAssetListConfig 选项数据源，此处锚单元语义）：
 *   1. 两种「资产类型」值空间共用一次请求（DR-1）：type_code 平铺口径 / recordcode 分组口径
 *   2. recordcode 空条目被剔除（value=undefined 会让 el-select 匹配失效）
 *   3. 截断告警：count > results.length → logError 提示仅展示前 N 条
 *   4. 仓库仅分组模式下 onMounted 加载（enableGrouping 开关）
 *   5. 仓库选项 value = recordcode，无 recordcode 条目剔除
 *   6. 拉取失败保持空选项不抛错（不影响列表主流程）
 */
import { createApp, defineComponent, h, nextTick, type App } from 'vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const getAssetTypes = vi.fn()
const getStorages = vi.fn()

vi.mock('@/api/assetType', () => ({
  assetTypeAPI: { getAssetTypes: (...a: unknown[]) => getAssetTypes(...a) },
}))
vi.mock('@/api/storage', () => ({
  storageAPI: { getStorages: (...a: unknown[]) => getStorages(...a) },
}))
vi.mock('@/utils/logger', () => ({ logError: vi.fn(), logWarn: vi.fn(), logInfo: vi.fn() }))

import { logError } from '@/utils/logger'
import { useAssetSearchOptions } from '@/composables/useAssetSearchOptions'

function withSetup(comp: App): void {
  const el = document.createElement('div')
  const app = createApp(comp)
  app.mount(el)
  app.unmount()
}

function mountWith(
  cfg: { enableGrouping?: boolean } = {},
): ReturnType<typeof useAssetSearchOptions> {
  let ret!: ReturnType<typeof useAssetSearchOptions>
  const Comp = defineComponent({
    setup() {
      ret = useAssetSearchOptions(cfg)
      return () => h('div')
    },
  })
  withSetup(Comp)
  return ret
}

const typeRes = (count: number, records: { recordcode?: string }[]) => ({
  count,
  results: records.map((r, i) => ({
    type_code: `TC${i}`,
    type_name: `类型${i}`,
    recordcode: r.recordcode,
  })),
})

beforeEach(() => {
  getAssetTypes.mockReset()
  getStorages.mockReset()
  vi.mocked(logError).mockClear()
})

describe('useAssetSearchOptions', () => {
  it('两值空间共用一次请求：type_code 平铺口径 / recordcode 分组口径并剔除空码', async () => {
    getAssetTypes.mockResolvedValue(typeRes(3, [{ recordcode: 'RC0' }, {}, { recordcode: 'RC2' }]))
    const opts = mountWith()
    await nextTick()
    expect(getAssetTypes).toHaveBeenCalledTimes(1)
    expect(getAssetTypes).toHaveBeenCalledWith({ page: 1, page_size: 100 })
    expect(opts.assetTypeOptions.value.map((o) => o.value)).toEqual(['TC0', 'TC1', 'TC2'])
    expect(opts.assetTypeRecordcodeOptions.value.map((o) => o.value)).toEqual(['RC0', 'RC2'])
    expect(getStorages).not.toHaveBeenCalled()
  })

  it('截断告警：count > 单页返回数 → logError 一次', async () => {
    getAssetTypes.mockResolvedValue(typeRes(120, [{ recordcode: 'RC0' }]))
    mountWith()
    await nextTick()
    expect(vi.mocked(logError)).toHaveBeenCalledTimes(1)
    expect(String(vi.mocked(logError).mock.calls[0][1])).toContain('120')
  })

  it('仓库仅 enableGrouping 时随挂载加载，value=recordcode 且剔除空码', async () => {
    getAssetTypes.mockResolvedValue(typeRes(0, []))
    getStorages.mockResolvedValue({
      count: 2,
      results: [
        { storage_name: '一号仓', recordcode: 'WRC1' },
        { storage_name: '缺码仓', recordcode: '' },
      ],
    })
    const opts = mountWith({ enableGrouping: true })
    await nextTick()
    expect(getStorages).toHaveBeenCalledTimes(1)
    expect(opts.storageOptions.value).toEqual([{ label: '一号仓', value: 'WRC1' }])
  })

  it('拉取失败保持空选项不抛错', async () => {
    getAssetTypes.mockRejectedValue(new Error('net down'))
    getStorages.mockRejectedValue(new Error('net down'))
    const opts = mountWith({ enableGrouping: true })
    await nextTick()
    expect(opts.assetTypeOptions.value).toEqual([])
    expect(opts.storageOptions.value).toEqual([])
  })

  it('手动 loadStorageOptions 平铺模式也可显式调用', async () => {
    getStorages.mockResolvedValue({ count: 1, results: [{ storage_name: '仓', recordcode: 'W9' }] })
    const opts = mountWith()
    await opts.loadStorageOptions()
    expect(opts.storageOptions.value).toEqual([{ label: '仓', value: 'W9' }])
  })
})
