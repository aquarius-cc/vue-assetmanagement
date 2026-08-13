// 新建文件
export const ROLE_HIERARCHY: Record<string, number> = {
  system_admin: 5,
  dept_manager: 4,
  asset_admin: 3,
  auditor: 2,
  regular_user: 1,
}

export const ROLE_NAMES = Object.keys(ROLE_HIERARCHY)

export const ROLE_CODES = {
  SYSTEM_ADMIN: 'system_admin',
  DEPT_MANAGER: 'dept_manager',
  ASSET_ADMIN: 'asset_admin',
  AUDITOR: 'auditor',
  REGULAR_USER: 'regular_user',
} as const

export const DEFAULT_ROLE = ROLE_CODES.REGULAR_USER
