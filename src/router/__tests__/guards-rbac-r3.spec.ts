/**
 * @file R-3 前端权限面收口（M-RC-07 + M-RC-14）路由守卫契约
 * @module src/router/__tests__/guards-rbac-r3
 *
 * 覆盖四类断言：
 *  ① 7 条写入类路由 meta.requiredMinRole === 'asset_admin'（配置回改先红）
 *  ② regular_user 直达 4 条代表路径被拦（落点 /main + ElMessage.error）
 *  ③ 反向断言：只读父级/兄弟路由未被连带加固（防 requiredMinRole 误上提）
 *  ④ 正对照：asset_admin / dept_manager 放行（等级制不误伤更高角色）
 *
 * @note
 *  本文件 mock 脚手架与 guards.spec.ts 存在复制（已知重复，登记于文档 §3.1.3）。
 *  未抽取公共 harness 的原因：guards.spec.ts 为 978 行存量超限文件，改动会触发
 *  DR-5 拆分义务；本文件自带最小脚手架、独立收口。
 *
 * @see src/router/guards.ts:59-83 checkRoleAccess（meta 优先 → roleWhitelist 回退 → 放行）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ElMessage } from 'element-plus'
import { setupAuthGuard } from '../guards'
import { routesMainSystem } from '../routes-main-system'
import { routesMainCore } from '../routes-main-core'
import { routesMainOperations } from '../routes-main-operations'
import { routesStandalone } from '../routes-standalone'

vi.mock('@/utils/tokenObfuscator', () => ({
  decodeToken: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
}))

const mockInitAuthState = vi.fn()
const mockSilentLogout = vi.fn()
const mockGetAuthInfo = vi.fn().mockResolvedValue(undefined)
const mockLoadMyPermissions = vi.fn().mockResolvedValue(undefined)
const mockInitAppState = vi.fn()
const mockSetLoading = vi.fn()
const mockSetPageTitle = vi.fn()
const mockSetBreadcrumbs = vi.fn()

const mockAuthStore = {
  authInfo: null as unknown,
  isLoggedIn: false,
  access_token: null as string | null,
  userRole: 'regular_user',
  isSuperuser: false,
  authInitialized: true,
  permissions: [] as string[],
  permissionsLoaded: false,
  initAuthState: mockInitAuthState,
  silentLogout: mockSilentLogout,
  getAuthInfo: mockGetAuthInfo,
  loadMyPermissions: mockLoadMyPermissions,
}

const mockAppStore = {
  setLoading: mockSetLoading,
  setPageTitle: mockSetPageTitle,
  setBreadcrumbs: mockSetBreadcrumbs,
  initAppState: mockInitAppState,
}

vi.mock('@/stores/auth', () => ({ useAuthStore: vi.fn(() => mockAuthStore) }))
vi.mock('@/stores/app', () => ({ useAppStore: vi.fn(() => mockAppStore) }))

const mockSessionStore = { pendingRestore: false, clear: vi.fn() }
vi.mock('@/stores/groupedAssetSession', () => ({
  useGroupedAssetSession: vi.fn(() => mockSessionStore),
}))

vi.mock('@/utils/tokenRefresh', () => ({ refreshAccessToken: vi.fn() }))
vi.mock('@/utils/device', () => ({ detectAuthChannel: vi.fn(() => 'cookie') }))

/** 路由记录的递归查找视图（仅取 name/meta/children，规避 RouteRecordRaw 联合类型差异） */
interface RouteLike {
  name?: string
  meta?: Record<string, unknown>
  children?: RouteLike[]
}

/** 深度优先定位路由记录（routesMainCore 为三层嵌套，故需递归） */
function findRoute(routes: RouteLike[], name: string): RouteLike | undefined {
  for (const record of routes) {
    if (record.name === name) return record
    const hit = record.children ? findRoute(record.children, name) : undefined
    if (hit) return hit
  }
  return undefined
}

/** 断言所需的 7 条写入类路由：记录名 → 所在路由表 */
const REQUIRED_MIN_ROLE_ROUTES: Array<[string, RouteLike[]]> = [
  ['AssetFormDirect', routesMainSystem],
  ['AssetForm', routesMainCore],
  ['AssetBatchImport', routesMainCore],
  ['ScrapAsset', routesStandalone],
  ['OutAssetForm', routesMainOperations],
  ['OutAssetBatchImport', routesMainOperations],
  ['RecycleAssetForm', routesMainOperations],
]

/**
 * 禁补清单（防扩权）：这 4 条的父前缀 /main/damagedassetdetails、
 * /main/unregisteredassetdetails 已在 roleWhitelist（仅 system_admin/dept_manager）。
 * checkRoleAccess 中 meta 优先于前缀回退，补 asset_admin(3 级) 会把 4/5 级门槛降到 3 级。
 */
const FORBIDDEN_MIN_ROLE_ROUTES: Array<[string, RouteLike[]]> = [
  ['DamagedAssetForm', routesMainOperations],
  ['DamagedAssetBatchImport', routesMainOperations],
  ['UnregisteredAssetForm', routesMainOperations],
  ['UnregisteredAssetBatchImport', routesMainOperations],
]

/** 只读父级/兄弟路由：meta 不得上提，否则连带拦掉受限角色的只读访问 */
const READ_ONLY_ROUTES: Array<[string, RouteLike[]]> = [
  ['AssetContentDetails', routesMainCore],
  ['BasicAssetDetails', routesMainCore],
  ['OutAssetDetails', routesMainOperations],
  ['RecycleAssetDetails', routesMainOperations],
]

/** 直达拦截的 4 条代表路径：路径 → 记录名（路径参数按真实 asset_code 取值） */
const DENY_TARGETS: Array<[string, string]> = [
  ['/main/assetform', 'AssetFormDirect'],
  ['/main/assetdetails/A001/assetform', 'AssetForm'],
  ['/main/outassetdetails/A001/outassetform', 'OutAssetForm'],
  ['/assets/A001/scrap', 'ScrapAsset'],
]

function metaOf(name: string, table: RouteLike[]): Record<string, unknown> {
  return findRoute(table, name)?.meta ?? {}
}

describe('R-3 路由权限面（M-RC-07 + M-RC-14）', () => {
  let mockRouter: { beforeEach: unknown; afterEach: unknown }
  let beforeEachCallback: (to: unknown, from: unknown) => Promise<string | true>

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthStore.authInfo = null
    mockAuthStore.isLoggedIn = false
    mockAuthStore.access_token = null
    mockAuthStore.userRole = 'regular_user'
    mockAuthStore.isSuperuser = false
    mockAuthStore.authInitialized = true
    mockAuthStore.permissions = []
    mockAuthStore.permissionsLoaded = false
    mockSessionStore.pendingRestore = false

    mockRouter = {
      beforeEach: vi.fn((cb: (to: unknown, from: unknown) => Promise<string | true>) => {
        beforeEachCallback = cb
      }),
      afterEach: vi.fn(),
    }
  })

  /** 以指定角色 + 有效 token 走一次守卫，返回落点（true = 放行） */
  async function navigateAs(role: string, path: string, meta: Record<string, unknown>) {
    mockAuthStore.isLoggedIn = true
    mockAuthStore.access_token = 'valid-token'
    mockAuthStore.userRole = role
    mockAuthStore.authInfo = { auth_id: 1, auth_username: 'test' }

    setupAuthGuard(mockRouter as never)
    return beforeEachCallback({ path, meta }, { path: '/' })
  }

  describe('① 路由 meta 锚定（配置回改先红）', () => {
    it.each(REQUIRED_MIN_ROLE_ROUTES)('%s 声明 requiredMinRole = asset_admin', (name, table) => {
      expect(findRoute(table, name)?.meta?.requiredMinRole).toBe('asset_admin')
    })

    it.each(FORBIDDEN_MIN_ROLE_ROUTES)('%s 保持无 requiredMinRole（补了即扩权）', (name, table) => {
      expect(findRoute(table, name)?.meta?.requiredMinRole).toBeUndefined()
    })

    it.each(READ_ONLY_ROUTES)('%s 保持无 requiredMinRole（只读不得连带加固）', (name, table) => {
      expect(findRoute(table, name)?.meta?.requiredMinRole).toBeUndefined()
    })
  })

  describe('② regular_user 直达被拦', () => {
    it.each(DENY_TARGETS)('%s → 落点 /main 且提示无权限', async (path, name) => {
      const table = REQUIRED_MIN_ROLE_ROUTES.find(([n]) => n === name)?.[1] ?? []
      const result = await navigateAs('regular_user', path, metaOf(name, table))

      expect(result).toBe('/main')
      expect(ElMessage.error).toHaveBeenCalledWith('您没有权限访问该页面')
    })

    it('auditor 同样被拦（矩阵禁止 auditor 写入）', async () => {
      const result = await navigateAs(
        'auditor',
        '/main/assetform',
        metaOf('AssetFormDirect', routesMainSystem),
      )

      expect(result).toBe('/main')
    })
  })

  describe('③ 反向断言：只读路由未被误伤', () => {
    it('regular_user 访问资产基本信息详情仍放行', async () => {
      const result = await navigateAs(
        'regular_user',
        '/main/assetdetails/A001/basicassetdetails',
        metaOf('BasicAssetDetails', routesMainCore),
      )

      expect(result).toBe(true)
      expect(ElMessage.error).not.toHaveBeenCalled()
    })

    it('regular_user 访问资产列表仍放行', async () => {
      const result = await navigateAs(
        'regular_user',
        '/main/assetdetails',
        metaOf('AssetContentDetails', routesMainCore),
      )

      expect(result).toBe(true)
    })
  })

  describe('④ 正对照：更高角色不被误伤', () => {
    it.each(['asset_admin', 'dept_manager', 'system_admin'])(
      '%s 放行 4 条写入路由',
      async (role) => {
        for (const [path, name] of DENY_TARGETS) {
          const table = REQUIRED_MIN_ROLE_ROUTES.find(([n]) => n === name)?.[1] ?? []
          const result = await navigateAs(role, path, metaOf(name, table))
          expect(result).toBe(true)
        }
        expect(ElMessage.error).not.toHaveBeenCalled()
      },
    )
  })
})
