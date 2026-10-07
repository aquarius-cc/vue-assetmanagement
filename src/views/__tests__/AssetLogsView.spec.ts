/**
 * @file AssetLogsView 回归测试（CT-4 回归屏障）
 *
 * 背景：视图曾用 Promise.all 并发取「资产详情」+「状态时间线」，且用同一个
 * route.params.code 同时满足两个后端取键契约（详情要 recordcode、时间线要 asset_code），
 * 导致 ① 时间线 404 时资产详情被连坐丢弃、② 弹「获取资产信息失败」。
 * 本套件锁定修复后的三条行为：详情不受时间线失败影响、时间线按 asset_code 派生、
 * 详情缺失时不发无意义的时间线请求。
 *
 * 环境约束（vitest.config.ts 为独立 plugins:[vue()]，不合并 vite.config.ts）：
 * unplugin-vue-components / ElementPlusResolver 不生效 → 所有 el-* 必须显式 stub，
 * 否则未解析组件会向 console 打 Vue warn 噪音，故告警断言一律走 @/utils/logger 的 spy。
 */
import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { elMessageError, logErrorSpy, logWarnSpy } = vi.hoisted(() => ({
  elMessageError: vi.fn(),
  logErrorSpy: vi.fn(),
  logWarnSpy: vi.fn(),
}))

const getByIdMock = vi.fn()
const getAssetTimelineMock = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { code: 'ASSET-20261004-E2270CFB' } }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/stores', () => ({
  useAssetStore: () => ({
    getById: getByIdMock,
    getAssetTimeline: getAssetTimelineMock,
  }),
}))

vi.mock('element-plus', () => ({
  ElMessage: { error: elMessageError, warning: vi.fn(), success: vi.fn() },
}))

vi.mock('@/utils/logger', () => ({
  logError: logErrorSpy,
  logWarn: logWarnSpy,
  logInfo: vi.fn(),
}))

import AssetLogsView from '../AssetLogsView.vue'

/** 详情夹具：asset_code 由后端生成，类型上必填（types/asset.ts:198-200） */
const ASSET = {
  recordcode: 'ASSET-20261004-E2270CFB',
  asset_code: 'DEMO-A038',
  asset_name: '笔记本',
}

/** 后端 timeline 真实字段经 api 层映射后的形态（见 api/asset.ts getAssetTimeline） */
const TIMELINE = [
  {
    status: 'in_store',
    timestamp: '2026-10-04T10:00:00+08:00',
    description: '创建资产',
    operator_name: '张三',
  },
]

/**
 * stub 集：vitest 下 EP 组件未解析，named slot 与 prop 驱动文本必须靠 stub 显式渲染
 * （el-card 带 #header 具名插槽、el-empty 靠 description prop、el-result 靠 title/subTitle）
 */
const stubs = {
  'el-card': {
    template: '<div class="el-card"><slot name="header" /><slot /></div>',
  },
  'el-result': {
    name: 'ElResult',
    props: ['icon', 'title', 'subTitle'],
    template: '<div class="el-result">{{ title }}{{ subTitle }}<slot name="extra" /></div>',
  },
  'el-descriptions': { template: '<div class="el-descriptions"><slot /></div>' },
  'el-descriptions-item': {
    name: 'ElDescriptionsItem',
    props: ['label'],
    template: '<div class="el-descriptions-item">{{ label }}：<slot /></div>',
  },
  'el-divider': { template: '<div class="el-divider" />' },
  'el-timeline': { template: '<div class="el-timeline"><slot /></div>' },
  'el-timeline-item': {
    name: 'ElTimelineItem',
    props: ['timestamp', 'placement'],
    template: '<div class="el-timeline-item"><span class="ts">{{ timestamp }}</span><slot /></div>',
  },
  'el-empty': {
    name: 'ElEmpty',
    props: ['description'],
    template: '<div class="el-empty">{{ description }}</div>',
  },
  'el-button': {
    name: 'ElButton',
    props: ['type'],
    template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>',
    emits: ['click'],
  },
  'el-icon': { template: '<span class="el-icon"><slot /></span>' },
}

const mountLogs = () => mount(AssetLogsView, { global: { stubs, directives: { loading: {} } } })

beforeEach(() => {
  vi.clearAllMocks()
  getByIdMock.mockReset()
  getAssetTimelineMock.mockReset()
})

describe('AssetLogsView', () => {
  it('用例1：时间线失败不连坐资产信息（CT-4 回归屏障）', async () => {
    getByIdMock.mockResolvedValue(ASSET)
    getAssetTimelineMock.mockRejectedValue(
      new Error('资产 ASSET-20261004-E2270CFB 没有状态变更记录'),
    )

    const wrapper = mountLogs()
    await flushPromises()

    expect(wrapper.text()).toContain('DEMO-A038')
    expect(wrapper.text()).toContain('笔记本')
    expect(wrapper.text()).toContain('暂无状态日志记录')
    expect(elMessageError).not.toHaveBeenCalled()
  })

  it('用例2：时间线按 asset_code 派生，映射后的状态项经真实 StatusTag 渲染', async () => {
    getByIdMock.mockResolvedValue(ASSET)
    getAssetTimelineMock.mockResolvedValue(TIMELINE)

    const wrapper = mountLogs()
    await flushPromises()

    // 取键契约：时间线必须用 asset_code 而非 route.params.code（recordcode）
    expect(getAssetTimelineMock).toHaveBeenCalledWith('DEMO-A038')
    expect(wrapper.text()).toContain('DEMO-A038')
    expect(wrapper.text()).toContain('2026-10-04T10:00:00+08:00')
    expect(wrapper.text()).toContain('在库')
    expect(wrapper.text()).toContain('创建资产')
    expect(wrapper.text()).toContain('操作人: 张三')
    // 告警只经 logger 出口断言（未解析 EP 组件会污染 console.warn）
    expect(logWarnSpy).not.toHaveBeenCalledWith(
      'components/commoncomponents/StatusTag',
      expect.stringContaining('[StatusTag] Invalid status'),
    )
  })

  it('用例3：详情失败才提示「获取资产信息失败」', async () => {
    getByIdMock.mockRejectedValue(new Error('network down'))

    const wrapper = mountLogs()
    await flushPromises()

    expect(elMessageError).toHaveBeenCalledWith('获取资产信息失败，请稍后重试')
    expect(wrapper.text()).toContain('暂无状态日志记录')
    expect(getAssetTimelineMock).not.toHaveBeenCalled()
  })

  it('用例4：详情为 null 时不发无意义的时间线请求', async () => {
    getByIdMock.mockResolvedValue(null)

    const wrapper = mountLogs()
    await flushPromises()

    expect(getAssetTimelineMock).not.toHaveBeenCalled()
    expect(elMessageError).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('暂无状态日志记录')
  })
})
