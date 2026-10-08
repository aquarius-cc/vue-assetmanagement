/**
 * F3 组件侧用例：src/components/__tests__/AssetDetails.spec.ts
 *
 * 覆盖（BF-078 需求3 二轮修正 · 方案 A″）：
 *   a grouped ↔ 详情互换必重挂：AssetDetails 的 router-view 无 key 时，
 *     两条子路由渲染同组件（AssetContentDetails）会被 Vue 同位置复用、
 *     setup 永不重跑（vue-router h() 不带 key）→ 返回分组页拿不到恢复快照。
 *   b 扁平 → assetform 表单不重挂（不变量锁）：key 派生取「AssetDetails 的直接子记录名」，
 *     孙路由 assetform 不改变 key——若未来 key 误用 route.name 之类，本用例先红。
 *   c 路径断言收口（真 setupAuthGuard + 真 session store，mock auth/app store 同 guards.spec）：
 *     分组→表单直跳 / 返回分组 均在 /main/assetdetails 子树内 → 恢复旗保留；
 *     出子树（/main）→ afterEach 清空快照。
 *
 * 【mock 口径】auth/app store 桩与 src/router/__tests__/guards.spec.ts 同构
 * （那侧测守卫逻辑，这侧测真接线）；groupedAssetSession 不 mock，走真实 store。
 * 【时序口径】须先 mount + isReady 让初始导航（落 /main）走完再 save——
 * 否则初始导航的 afterEach 会按「出子树」正确清除先种的旗（守卫无错，时序错）。
 */
import { mount } from '@vue/test-utils'
import { nextTick, h } from 'vue'
import { RouterView, createRouter, createMemoryHistory } from 'vue-router'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mockInitAuthState = vi.fn()
const mockSilentLogout = vi.fn()
const mockGetAuthInfo = vi.fn().mockResolvedValue(undefined)
const mockLoadMyPermissions = vi.fn().mockResolvedValue(undefined)

/** 同 guards.spec 的 auth/app 桩（护栏：本文件不 mock groupedAssetSession，走真 store） */
const mockAuthStore = {
  authInfo: null as unknown,
  isLoggedIn: false,
  access_token: null as string | null,
  userRole: 'regular_user',
  isSuperuser: false,
  authInitialized: true,
  permissions: [] as string[],
  permissionsLoaded: true,
  initAuthState: mockInitAuthState,
  silentLogout: mockSilentLogout,
  getAuthInfo: mockGetAuthInfo,
  loadMyPermissions: mockLoadMyPermissions,
}

const mockAppStore = {
  setLoading: vi.fn(),
  setPageTitle: vi.fn(),
  setBreadcrumbs: vi.fn(),
  initAppState: vi.fn(),
}

vi.mock('@/stores/auth', () => ({ useAuthStore: vi.fn(() => mockAuthStore) }))
vi.mock('@/stores/app', () => ({ useAppStore: vi.fn(() => mockAppStore) }))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
}))

import AssetDetails from '@/components/AssetDetails.vue'
import { setupAuthGuard } from '@/router/guards'
import { useGroupedAssetSession } from '@/stores/groupedAssetSession'

/** ACD 位替身：两条子路由共用同一组件（复用行为的前提）；内部渲染孙路由 */
let acdSetupCount = 0
let formMountCount = 0

const AcdHarness = {
  name: 'AcdHarness',
  setup() {
    acdSetupCount += 1
    return () => h('div', { class: 'harness' }, [h(RouterView)])
  },
}

const FormHarness = {
  name: 'FormHarness',
  setup() {
    formMountCount += 1
    return () => h('div', { class: 'form-harness' })
  },
}

/** Dashboard 落点专用替身：与表单替身分离，避免初始导航 /main 污染 formMountCount */
const DashboardStub = { name: 'DashboardStub', setup: () => () => h('div', { class: 'dashboard' }) }

const Host = { name: 'Host', setup: () => () => h(RouterView) }

const makeRouter = (installGuards = false) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/main/assetdetails',
        name: 'AssetDetails',
        component: AssetDetails,
        meta: { requiresAuth: false },
        children: [
          {
            path: 'grouped',
            name: 'AssetGroupedContent',
            component: AcdHarness,
            props: { enableGrouping: true },
            meta: { requiresAuth: false },
          },
          {
            path: ':asset_code?',
            name: 'AssetContentDetails',
            component: AcdHarness,
            meta: { requiresAuth: false },
            children: [
              {
                path: 'assetform',
                name: 'AssetForm',
                component: FormHarness,
                meta: { requiresAuth: false },
              },
            ],
          },
        ],
      },
      { path: '/main', name: 'Dashboard', component: DashboardStub, meta: { requiresAuth: false } },
      { path: '/:pathMatch(.*)*', redirect: '/main' },
    ],
  })
  if (installGuards) setupAuthGuard(router)
  return router
}

const flush = async () => {
  await nextTick()
}

describe('AssetDetails · 子路由视图 key（BF-078 需求3 二轮修正）', () => {
  beforeEach(() => {
    acdSetupCount = 0
    formMountCount = 0
    setActivePinia(createPinia())
    mockAuthStore.authInfo = null
    mockAuthStore.isLoggedIn = false
    mockAuthStore.access_token = null
    mockAuthStore.authInitialized = true
  })

  it('a：grouped ↔ 详情互换必重挂，setup 每次重跑（返回分组页才有机会水合快照）', async () => {
    const router = makeRouter()
    mount(Host, { global: { plugins: [router] } })
    await router.isReady()

    await router.push('/main/assetdetails/grouped')
    await flush()
    expect(acdSetupCount).toBe(1)

    await router.push('/main/assetdetails/AST001')
    await flush()
    expect(acdSetupCount).toBe(2)

    await router.push('/main/assetdetails/grouped')
    await flush()
    expect(acdSetupCount).toBe(3)
  })

  it('b：扁平 → assetform → 扁平，ACD 层 setup 计数不变（key 不得误伤孙路由复用）', async () => {
    const router = makeRouter()
    mount(Host, { global: { plugins: [router] } })
    await router.isReady()

    await router.push('/main/assetdetails/AST001')
    await flush()
    expect(acdSetupCount).toBe(1)
    expect(formMountCount).toBe(0)

    await router.push('/main/assetdetails/AST001/assetform')
    await flush()
    expect(acdSetupCount).toBe(1) // ACD 层不重挂，仅孙组件换渲染
    expect(formMountCount).toBe(1)

    await router.push('/main/assetdetails/AST001')
    await flush()
    expect(acdSetupCount).toBe(1) // 回扁平仍复用
    expect(formMountCount).toBe(1) // 表单卸载不产生新挂载
  })

  it('c：真守卫接线——子树内（含分组→表单直跳）保留恢复旗，出子树清除', async () => {
    const router = makeRouter(true)
    mount(Host, { global: { plugins: [router] } })
    await router.isReady() // 初始导航先落 /main 走完，再种旗（防初始 afterEach 按出子树规则误清种子）

    const session = useGroupedAssetSession()
    session.save({
      filters: {},
      page: 2,
      expandedKeys: ['G1'],
      childPages: {},
      selectedCodes: [],
      scrollTop: 0,
    })

    await router.push('/main/assetdetails/grouped')
    await flush()
    expect(session.pendingRestore).toBe(true)

    // 分组 → 表单直跳：仍在 /main/assetdetails 子树内，不得误清（guards.spec 为 mock 级同断言）
    await router.push('/main/assetdetails/RC-1/assetform')
    await flush()
    expect(session.pendingRestore).toBe(true)

    // 返回分组：旗仍在（消费方为真实 ACD 的 setup，替身不消费）
    await router.push('/main/assetdetails/grouped')
    await flush()
    expect(session.pendingRestore).toBe(true)

    // 出子树：快照整体作废
    await router.push('/main')
    await flush()
    expect(session.pendingRestore).toBe(false)
    expect(session.snapshot).toBeNull()
  })
})
