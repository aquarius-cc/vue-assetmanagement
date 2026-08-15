import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'
import { permissionsAPI } from '@/api/permissions'
import { ElMessage } from 'element-plus'

vi.mock('@/api/auth', () => ({
  authAPI: {
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUserProfile: vi.fn(),
  },
}))

vi.mock('@/api/permissions', () => ({
  permissionsAPI: {
    getMyPermissions: vi.fn(),
  },
}))

vi.mock('@/utils/tokenCrypto', () => ({
  setEncryptedToken: vi.fn(),
  getDecryptedToken: vi.fn(),
  clearAllAuthTokens: vi.fn(),
  removeToken: vi.fn(),
}))

vi.mock('@/utils/device', () => ({
  detectAuthChannel: vi.fn().mockReturnValue('bearer'),
}))

vi.mock('@/utils/tokenMemory', () => ({
  setInMemoryAccessToken: vi.fn(),
  clearInMemoryAccessToken: vi.fn(),
  getInMemoryAccessToken: vi.fn(),
}))

vi.mock('@/utils/tokenRefresh', () => ({
  refreshAccessToken: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('AuthStore permissionsLoaded (N1)', () => {
  let authStore: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    authStore = useAuthStore()

    vi.clearAllMocks()
    vi.mocked(permissionsAPI.getMyPermissions).mockResolvedValue({
      permissions: [],
      data_scope: {
        scope_type: 'departments',
        department_codes: [],
        include_children: false,
      },
    })
  })

  it('should be false initially', () => {
    expect(authStore.permissionsLoaded).toBe(false)
  })

  it('should set true after successful loadMyPermissions', async () => {
    vi.mocked(permissionsAPI.getMyPermissions).mockResolvedValue({
      permissions: ['asset:read'],
      data_scope: { scope_type: 'all' },
    })

    await authStore.loadMyPermissions()

    expect(authStore.permissionsLoaded).toBe(true)
    expect(authStore.permissions).toEqual(['asset:read'])
  })

  it('should stay false when loadMyPermissions fails (guard retries next navigation)', async () => {
    vi.mocked(permissionsAPI.getMyPermissions).mockRejectedValue(new Error('网络异常'))

    await authStore.loadMyPermissions()

    expect(authStore.permissionsLoaded).toBe(false)
    expect(authStore.permissions).toEqual([])
    expect(ElMessage.warning).toHaveBeenCalled()
  })

  it('should dedupe concurrent calls and mark loaded once', async () => {
    vi.mocked(permissionsAPI.getMyPermissions).mockResolvedValue({
      permissions: ['asset:read'],
      data_scope: { scope_type: 'all' },
    })

    await Promise.all([authStore.loadMyPermissions(), authStore.loadMyPermissions()])

    expect(permissionsAPI.getMyPermissions).toHaveBeenCalledTimes(1)
    expect(authStore.permissionsLoaded).toBe(true)
  })

  it('should remain false after initAuthState restores cached permissions (guard refreshes online)', async () => {
    const { getDecryptedToken } = vi.mocked(await import('@/utils/tokenCrypto'))
    const payload = { role: 'asset_admin', department_code: 'DEP001' }
    const token = `header.${btoa(JSON.stringify(payload))}.signature`
    vi.mocked(getDecryptedToken).mockImplementation((key: string) => {
      const map: Record<string, string> = {
        authInfo: JSON.stringify({ auth_id: 1, auth_username: 'admin', isactive: true }),
        access_token: token,
        refresh_token: 'refresh-token',
        myPermissions: JSON.stringify({
          permissions: ['asset:read'],
          data_scope: {
            scope_type: 'departments',
            department_codes: ['DEP001'],
            include_children: true,
          },
        }),
      }
      return map[key as string] || null
    })

    const result = await authStore.initAuthState()

    expect(result).toBe(true)
    expect(authStore.permissions).toEqual(['asset:read'])
    expect(authStore.permissionsLoaded).toBe(false)
  })

  it('should reset to false on silentLogout', async () => {
    vi.mocked(permissionsAPI.getMyPermissions).mockResolvedValue({
      permissions: ['asset:read'],
      data_scope: { scope_type: 'all' },
    })
    await authStore.loadMyPermissions()
    expect(authStore.permissionsLoaded).toBe(true)

    authStore.silentLogout()

    expect(authStore.permissionsLoaded).toBe(false)
  })

  it('should reset to false on logout', async () => {
    vi.mocked(permissionsAPI.getMyPermissions).mockResolvedValue({
      permissions: ['asset:read'],
      data_scope: { scope_type: 'all' },
    })
    await authStore.loadMyPermissions()
    expect(authStore.permissionsLoaded).toBe(true)

    authStore.refresh_token = 'refresh-token-123'
    const { authAPI } = await import('@/api/auth')
    vi.mocked(authAPI.logout).mockResolvedValue(undefined)

    await authStore.logout()

    expect(authStore.permissionsLoaded).toBe(false)
  })
})
