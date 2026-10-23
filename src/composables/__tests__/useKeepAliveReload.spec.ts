/**
 * @file useKeepAliveReload 单元测试（BF-138 #3 A+D，先红后绿体系的组成）
 * @module composables/__tests__/useKeepAliveReload
 * @description 锚定 watch 语义四象限：
 *   1. 首挂不触发（非 immediate，页面 onMounted 初始加载负责）
 *   2. 进入父页路由名（跨板块返回 / 子页返回）恰触发一次（A 跨板块 + D 板块内）
 *   3. 板块内子路由间切换不触发（route.name !== selfName）
 *   4. 非 keep-alive 路由挂载 = no-op；reload 失败被吞并 logError（不产生 unhandled）
 *   5. meta-only（仅 componentName）与缺名 keep-alive 路由不注册 watch（T16 变异反向锚）
 *   6. logError 模块参数精确锚定（T16 StringLiteral 补杀）
 *
 * 载体说明：宿主组件挂在 RouterView 之外恒存活（不随路由卸载），本文件只测 composable 的
 * watch 语义；keep-alive 缓存实例存活语义由 src/__tests__/keepAliveLifecycle.spec.ts 集成锚定。
 */
import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { defineComponent, h } from 'vue'

const { reloadMock, logErrorMock } = vi.hoisted(() => ({
  reloadMock: vi.fn(),
  logErrorMock: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logError: logErrorMock,
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}))

import { useKeepAliveReload } from '../useKeepAliveReload'

const stub = (name: string) => defineComponent({ name, setup: () => () => h('div', name) })

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'HomePage', component: stub('HomePage') },
      {
        path: '/list',
        name: 'ListPage',
        component: stub('ListPage'),
        meta: { keepAlive: true, componentName: 'ListPage' },
        children: [
          { path: 'form', name: 'ListForm', component: stub('ListForm') },
          { path: 'import', name: 'ListImport', component: stub('ListImport') },
        ],
      },
      {
        path: '/other',
        name: 'OtherPage',
        component: stub('OtherPage'),
        meta: { keepAlive: true, componentName: 'OtherPage' },
      },
      // 无 keepAlive meta 的普通路由（selfName 派生不到 → no-op）
      { path: '/plain', name: 'PlainPage', component: stub('PlainPage') },
      // 仅 componentName 无 keepAlive（meta-only：AND 短路，selfName 不得派生 → OR 变异反向锚）
      {
        path: '/metaonly',
        name: 'MetaOnlyPage',
        component: stub('MetaOnlyPage'),
        meta: { componentName: 'MetaOnlyPage' },
      },
      // keepAlive 但缺路由名（selfName 为 falsy → 不得注册 watch → 条件短路反向锚）
      {
        path: '/ka-unnamed',
        component: stub('KaUnnamed'),
        meta: { keepAlive: true, componentName: 'KaUnnamed' },
      },
    ],
  })

/** 宿主：恒存活（不随路由卸载），setup 内调用 composable —— 模拟 keep-alive 缓存实例的 watch 存活态 */
const Host = defineComponent({
  setup() {
    useKeepAliveReload(reloadMock)
    return () => h('div', 'host')
  },
})

describe('useKeepAliveReload（BF-138 #3 A+D watch 语义）', () => {
  let router: ReturnType<typeof createTestRouter>

  const go = async (path: string) => {
    await router.push(path)
    await flushPromises()
  }

  const mountHostAt = async (path: string) => {
    await go(path)
    return mount(Host, { global: { plugins: [router] } })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    router = createTestRouter()
  })

  it('首挂不触发 reload（非 immediate，初始加载由页面自身负责）', async () => {
    await mountHostAt('/list')
    await flushPromises()
    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('跨板块返回（进入父页路由名）触发恰一次 reload（A 语义）', async () => {
    await mountHostAt('/list')
    await go('/')
    expect(reloadMock).not.toHaveBeenCalled()

    await go('/list')
    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it('板块内子页返回父列表（child → parent）触发恰一次 reload（D 语义）', async () => {
    await mountHostAt('/list')
    await go('/list/form')
    expect(reloadMock).not.toHaveBeenCalled()

    await go('/list')
    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it('板块内子路由间切换不触发 reload（route.name !== selfName 反向锚）', async () => {
    await mountHostAt('/list')
    await go('/list/form')
    await go('/list/import')
    await go('/list/form')
    expect(reloadMock).not.toHaveBeenCalled()

    await go('/list')
    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it('非 keep-alive 路由挂载 = no-op（matched 无 keepAlive meta 时不注册 watch）', async () => {
    await mountHostAt('/plain')
    await go('/')
    await go('/plain')
    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('仅 componentName 而无 keepAlive 的路由不注册 watch（AND 短路反向锚）', async () => {
    await mountHostAt('/metaonly')
    await go('/')
    await go('/metaonly')
    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('keepAlive 路由缺路由名（selfName falsy）不注册 watch（条件早退反向锚）', async () => {
    await mountHostAt('/ka-unnamed')
    await go('/')
    await go('/ka-unnamed')
    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('reload 失败被吞并 logError（不产生 unhandled rejection，watch 存活可继续触发）', async () => {
    reloadMock.mockRejectedValueOnce(new Error('network down'))
    await mountHostAt('/list')

    await go('/')
    await go('/list') // 触发失败的 reload
    await flushPromises()

    expect(reloadMock).toHaveBeenCalledTimes(1)
    expect(logErrorMock).toHaveBeenCalledTimes(1)
    expect(logErrorMock.mock.calls[0]?.[0]).toBe('composables/useKeepAliveReload')
    expect(String(logErrorMock.mock.calls[0]?.[1])).toContain('reload failed')

    // 失败后 watch 仍存活：下一次进入仍可触发
    await go('/')
    await go('/list')
    expect(reloadMock).toHaveBeenCalledTimes(2)
  })

  it('reload 为同步函数（返回 void）也可安全触发', async () => {
    reloadMock.mockImplementation(() => undefined)
    await mountHostAt('/list')
    await go('/')
    await go('/list')
    await flushPromises()
    expect(reloadMock).toHaveBeenCalledTimes(1)
    expect(logErrorMock).not.toHaveBeenCalled()
  })
})
