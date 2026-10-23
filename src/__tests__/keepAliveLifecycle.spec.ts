/**
 * @file keep-alive 生命周期实证（BF-138 #3 阶段0/CT-4 先红后绿）
 * @module __tests__/keepAliveLifecycle
 * @description 真实载体验证「返回即最新 A+D」的三条期望态（先证红后转绿）：
 *   P0-1 跨板块返回：列表实例存活（未 prune 销毁）+ 不重复初始加载 + reload 恰一次
 *   P0-2 板块内返回：child → parent 触发 reload 恰一次；子路由间切换不触发（反向锚）
 *   P0-3 首挂锚：初始加载恰一次、reload 零次（非 immediate）
 *
 * 载体与降级声明（计划阶段0条款）：
 *   - 真实件：MainView（include 派生/keep-alive/transition）、routesMain（真实 meta 与
 *     路由结构）、useKeepAliveReload（真实 composable，由假列表页接入）。
 *   - 替换件：重型页面模块（ContractDetails 及其子页、DashboardPage）以 vi.mock 轻量假件
 *     替代——vitest 环境无 ElementPlusResolver（AssetLogsView.spec 头注同因），真页整树
 *     stub 成本过高；假列表页通过 defineComponent name 对齐 meta.componentName、setup 内
 *     调用真实 composable，承载实例存活/加载/刷新三类计数断言。
 *   - 真实页面组件的 name 与 meta 匹配由 keepAliveComponentNames.spec.ts 静态锚定（P0-4）。
 */
import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'

const counters = vi.hoisted(() => ({
  /** 初始加载次数（fake 列表页 onMounted） */
  fetch: vi.fn(),
  /** composable 触发的 reload 次数 */
  reload: vi.fn(),
  /** 实例序号：每次 setup 递增 —— 断言同一实例存活（返回后仍为 1） */
  instanceSeq: { value: 0 },
}))

vi.mock('@/components/AsideMenu.vue', () => ({
  default: { name: 'AsideMenu', template: '<div class="fake-aside" />' },
}))
vi.mock('@/components/commoncomponents/AppBreadcrumb.vue', () => ({
  default: { name: 'AppBreadcrumb', template: '<div class="fake-breadcrumb" />' },
}))

vi.mock('@/components/DashboardPage.vue', () => ({
  default: { name: 'DashboardPage', template: '<div class="fake-dashboard" />' },
}))

vi.mock('@/components/componentsdetails/ContractDetails.vue', async () => {
  const { defineComponent, ref, onMounted, h } = await import('vue')
  const { useKeepAliveReload } = await import('@/composables/useKeepAliveReload')
  return {
    default: defineComponent({
      name: 'ContractDetails',
      setup() {
        // 实例序号在 setup 期递增（setup=实例创建，缓存复用不再跑 setup）
        // ——首渲染即可读到 ≥1；若放 onMounted，首渲染读 0 且非响应式计数不触发重渲染
        counters.instanceSeq.value += 1
        const local = ref('initial')
        onMounted(() => {
          counters.fetch()
        })
        useKeepAliveReload(() => counters.reload())
        return () =>
          h(
            'div',
            { class: 'fake-contract-list' },
            `contract-list:instance-${counters.instanceSeq.value}:${local.value}`,
          )
      },
    }),
  }
})

const fakeChild = (name: string) => ({
  default: { name, template: `<div class="fake-${name}" />` },
})
vi.mock('@/components/componentsdetails/detils/ContractOfDetails.vue', () =>
  fakeChild('ContractOfDetails'),
)
vi.mock('@/components/componentsdetails/detils/ContractForm.vue', () => fakeChild('ContractForm'))
vi.mock('@/components/componentsdetails/detils/ContractBatchImport.vue', () =>
  fakeChild('ContractBatchImport'),
)

import MainView from '@/views/MainView.vue'
import { routesMain } from '@/router/routes-main'

/** 确定性 matchMedia（isMobile=false → 桌面分支），happy-dom 兼容性防御 */
const installMatchMedia = () => {
  window.matchMedia = (() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

/** el-* 桩：vitest 无 ElementPlusResolver，MainView 模板中的 EP 组件需显式桩（同 AssetLogsView.spec） */
const epStubs = {
  'el-container': { template: '<div class="el-container-stub"><slot /></div>' },
  'el-aside': { template: '<div class="el-aside-stub"><slot /></div>' },
  'el-main': { template: '<div class="el-main-stub"><slot /></div>' },
  'el-icon': { template: '<span class="el-icon-stub"><slot /></span>' },
  'el-drawer': {
    props: ['modelValue', 'direction', 'size', 'withHeader'],
    emits: ['update:modelValue'],
    template: '<div class="el-drawer-stub" v-if="modelValue"><slot /></div>',
  },
}

describe('keep-alive 生命周期实证（BF-138 #3）', () => {
  let router: ReturnType<typeof createRouter>
  let wrapper: ReturnType<typeof mount>

  const go = async (path: string) => {
    await router.push(path)
    await flushPromises()
  }

  const mountMain = async () => {
    wrapper = mount(MainView, {
      global: {
        plugins: [router, createPinia()],
        stubs: epStubs,
      },
    })
    await flushPromises()
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    counters.instanceSeq.value = 0
    installMatchMedia()
    router = createRouter({
      history: createMemoryHistory(),
      routes: routesMain,
    })
    // 注：不 await router.isReady()——无 install/初始导航时其永挂（hook 10s 超时实证）；
    // 各用例先 push（未 install 亦可导航）再 mount，install 由 mount 的 plugins 完成
  })

  it('P0-3 首挂锚：初始加载恰一次、reload 零次（watch 非 immediate）', async () => {
    await go('/main/contractdetails')
    await mountMain()
    await flushPromises()

    expect(counters.fetch).toHaveBeenCalledTimes(1)
    expect(counters.reload).not.toHaveBeenCalled()
    expect(wrapper.find('.fake-contract-list').text()).toContain('instance-1')
  })

  it('P0-1 跨板块返回：实例存活 + 不重复初始加载 + reload 恰一次', async () => {
    await go('/main/contractdetails')
    await mountMain()
    expect(counters.fetch).toHaveBeenCalledTimes(1)

    // 离开板块（Dashboard 无 keepAlive → 旧实现 include 变空触发 prune 销毁）
    await go('/main')
    expect(wrapper.find('.fake-contract-list').exists()).toBe(false)

    // 返回
    await go('/main/contractdetails')
    await flushPromises()

    // 期望态（A1 静态 include 后）：缓存实例存活、onMounted 不重跑、composable 恰触发一次
    expect(counters.instanceSeq.value).toBe(1)
    expect(counters.fetch).toHaveBeenCalledTimes(1)
    expect(counters.reload).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.fake-contract-list').text()).toContain('instance-1')
  })

  it('P0-2 板块内返回触发 reload；子路由间切换不触发（反向锚）', async () => {
    await go('/main/contractdetails')
    await mountMain()
    expect(counters.fetch).toHaveBeenCalledTimes(1)

    // 列表 → 表单子路由（父页常驻，不触发）
    await go('/main/contractdetails/contractform')
    expect(counters.reload).not.toHaveBeenCalled()

    // 子页返回父列表（D 语义：恰一次）
    await go('/main/contractdetails')
    expect(counters.reload).toHaveBeenCalledTimes(1)

    // 子路由间切换（form → batchimport）：route.name 非父页名，不触发
    await go('/main/contractdetails/contractform')
    await go('/main/contractdetails/contractbatchimport')
    expect(counters.reload).toHaveBeenCalledTimes(1)

    // 再次返回列表：恰一次累计为 2
    await go('/main/contractdetails')
    expect(counters.reload).toHaveBeenCalledTimes(2)
  })
})
