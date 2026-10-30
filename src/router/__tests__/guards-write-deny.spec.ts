/**
 * @file M-19 仅写 deny 路由守卫契约 + write 路由完整性不变量
 * @module src/router/__tests__/guards-write-deny
 *
 * 覆盖四类断言：
 *  ① write 路由兜底 deny：to.meta.write === true 且无 requiredMinRole/白名单前缀 → 拒绝
 *  ② write 路由完整性不变量（缺口1）：凡 meta.write === true 的路由必须满足
 *     「自身有 requiredMinRole」或「路径命中 roleWhitelist 前缀」之一——
 *     漏标门槛即上线对非 superuser 锁死，本不变量将其变成 CI 断言
 *  ③ 死循环防御锚点：/main、NotFound、/scan/:recordcode 不被误伤
 *  ④ write 清单冻结：25 条写叶子路由必须带 write:true（防回改丢失标记）
 *
 * @note
 *  mock 脚手架与 guards-rbac-r3.spec.ts 存在复制（同前例，见其 @note）。
 *  guards.spec.ts 为 978 行存量超限文件（TECHNICAL_DEBT），本文件独立收口不触它，
 *  也不改 guards.spec.ts / guards-rbac-r3.spec.ts 的任何既有断言。
 *
 * @see src/router/guards.ts checkRoleAccess（[M-19] 仅写 deny）/ hasExplicitWriteGate
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ElMessage } from 'element-plus'
import { hasExplicitWriteGate, setupAuthGuard } from '../guards'
import { routesMainCore } from '../routes-main-core'
import { routesMainOperations } from '../routes-main-operations'
import { routesMainSystem } from '../routes-main-system'
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

interface RouteLike {
  path?: string
  name?: string
  meta?: Record<string, unknown>
  children?: RouteLike[]
}

interface WriteLeaf {
  name: string
  path: string
  meta: Record<string, unknown>
}

/** 深度优先展平路由表，拼出完整路径（routes-main-* 为 /main 子树；standalone 已是绝对路径） */
function flattenWriteLeaves(routes: RouteLike[], prefix = ''): WriteLeaf[] {
  const out: WriteLeaf[] = []
  for (const record of routes) {
    const isAbsolute = record.path?.startsWith('/')
    const full = isAbsolute
      ? (record.path ?? '')
      : `${prefix}/${record.path ?? ''}`.replace(/\/+$/, '')
    if (record.meta?.write === true) {
      out.push({ name: record.name ?? '', path: full, meta: record.meta ?? {} })
    }
    if (record.children?.length) {
      const childPrefix = isAbsolute ? '' : full
      out.push(...flattenWriteLeaves(record.children, childPrefix))
    }
  }
  return out
}

const WRITE_LEAVES: WriteLeaf[] = [
  ...flattenWriteLeaves(routesMainCore, '/main'),
  ...flattenWriteLeaves(routesMainOperations, '/main'),
  ...flattenWriteLeaves(routesMainSystem, '/main'),
  ...flattenWriteLeaves(routesStandalone),
]

/** 写叶子清单冻结（M-19 脚本化推导产物；防回改丢失 write 标记） */
const EXPECTED_WRITE_NAMES = [
  // core
  'AssetForm',
  'AssetBatchImport',
  'ContractForm',
  'ContractBatchImport',
  'AssetTypeForm',
  'AssetTypeBatchImport',
  'StorageForm',
  'StorageBatchImport',
  'UserForm',
  'UserBatchImport',
  // operations
  'OutAssetForm',
  'OutAssetBatchImport',
  'RecycleAssetForm',
  'DamagedAssetForm',
  'DamagedAssetBatchImport',
  'UnregisteredAssetForm',
  'UnregisteredAssetBatchImport',
  // system
  'HardDiskSNForm',
  'DeptUserForm',
  'DeptUserBatchImport',
  'DeptDepartmentBatchImport',
  'DepartmentForm',
  'DepartmentBatchImport',
  'AssetFormDirect',
  // standalone
  'ScrapAsset',
]

describe('M-19 仅写 deny 路由守卫', () => {
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

  describe('① write 路由兜底 deny', () => {
    it('meta.write=true 且无 requiredMinRole/白名单前缀 → regular_user 被拒', async () => {
      const result = await navigateAs('regular_user', '/main/some-unlisted-write-page', {
        write: true,
        requiresAuth: true,
      })
      expect(result).toBe('/main')
      expect(ElMessage.error).toHaveBeenCalledWith('您没有权限访问该页面')
    })

    it('同一 meta 撤掉 write 标记 → 恢复 allow-by-default（读路由不受影响）', async () => {
      const result = await navigateAs('regular_user', '/main/some-unlisted-write-page', {
        requiresAuth: true,
      })
      expect(result).toBe(true)
      expect(ElMessage.error).not.toHaveBeenCalled()
    })
  })

  describe('② write 路由完整性不变量（缺口1：漏标门槛 → CI 红）', () => {
    it.each(WRITE_LEAVES.map((l) => [l.name, l.path, l.meta] as const))(
      '%s 必有显式门槛（requiredMinRole 或白名单前缀）',
      (_name, path, meta) => {
        expect(hasExplicitWriteGate(path, meta.requiredMinRole as string | undefined)).toBe(true)
      },
    )
  })

  describe('③ 死循环防御锚点', () => {
    it('/main（Dashboard，无任何门槛）恒放行——拒绝落点自身不得被拒', async () => {
      const result = await navigateAs('regular_user', '/main', {})
      expect(result).toBe(true)
      expect(ElMessage.error).not.toHaveBeenCalled()
    })

    it('NotFound（/:pathMatch(.*)*，meta 无 requiresAuth）不被误伤', async () => {
      const result = await navigateAs('regular_user', '/nonexistent-page', {})
      expect(result).toBe(true)
    })

    it('/scan/:recordcode（requiresAuth:false）走旁路放行', async () => {
      const result = await navigateAs('regular_user', '/scan/R001', {
        requiresAuth: false,
      })
      expect(result).toBe(true)
    })
  })

  describe('④ write 清单冻结（脚本化推导产物）', () => {
    it('25 条写叶子路由全部带 write:true（缺失即回改回归）', () => {
      const marked = new Set(WRITE_LEAVES.map((l) => l.name))
      const missing = EXPECTED_WRITE_NAMES.filter((n) => !marked.has(n))
      expect(missing).toEqual([])
    })

    it('write 标记只落在叶子路由（父→子合并会级联收紧，禁标父级）', () => {
      // flattenWriteLeaves 只收集 meta.write===true 的记录；若某父级被误标，
      // 其下只读子路由数量会被连带拦截——用 HardDiskSNBasicDetails（无 write）
      // 的存在性反证其父级未标 write：父级若标了 write，行为上仍以 ① 的规则生效，
      // 此处静态断言硬Disk 父页 meta 无 write
      const parent = findRecord(routesMainSystem, 'HardDiskSNDetails')
      expect(parent?.meta?.write).toBeUndefined()
    })
  })
})

function findRecord(routes: RouteLike[], name: string): RouteLike | undefined {
  for (const record of routes) {
    if (record.name === name) return record
    const hit = record.children ? findRecord(record.children, name) : undefined
    if (hit) return hit
  }
  return undefined
}
