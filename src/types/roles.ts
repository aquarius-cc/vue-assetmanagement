/**
 * @file 角色管理数据模型定义，包括角色基础、表单、列表响应等类型
 * @module types/roles
 * @exports
 *   - Role: 角色基础接口
 *   - RoleCreateUpdateForm: 角色创建/更新表单接口
 *   - RoleListResponse: 角色列表响应接口
 * @callers
 *   - stores/rolesStore（角色状态管理）
 *   - composables/*（组合式函数）
 *   - components/*（组件）
 */

import type { PaginatedResponse } from '@/types/common'

/** 角色基础接口（对应后端 RoleSerializer） */
export interface Role {
  id: number
  recordcode: string
  role_code: string
  role_name: string
  role_level: number
  description: string
  is_system: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

/** 角色创建/更新表单接口（对应后端 RoleCreateUpdateSerializer） */
export interface RoleCreateUpdateForm {
  role_code: string
  role_name: string
  role_level: number
  description?: string
  is_system?: boolean
  sort_order?: number
}

/** 角色列表响应 */
export type RoleListResponse = PaginatedResponse<Role>
