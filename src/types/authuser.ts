/**
 * @file 认证用户数据模型定义，包括登录、认证、用户管理等类型
 * @module types/authuser
 * @exports
 *   - AuthUserCreateForm/AuthUserUpdateForm: 认证用户表单接口
 *   - AuthUser: 认证用户基础接口
 *   - LoginForm/AuthInfo/LoginRequest/LoginResponse: 登录相关接口
 *   - LogoutResponse: 认证响应接口
 *   - AuthUserQueryParams: 认证用户查询参数
 *   - AuthUserListResponse: 认证用户列表响应接口
 * @callers
 *   - stores/authuserStore（认证用户状态管理）
 *   - composables/*（组合式函数）
 *   - components/*（组件）
 */

import type { PaginatedResponse } from '@/types/common'

/**
 * 认证用户数据模型
 * 对应后端数据库表: auth_user_management_table
 * 后端 API 路径: /api/auth/
 */

// ======================== 基础接口定义 ========================

/**
 * 认证用户创建表单接口
 * 用于创建新用户时的表单数据
 */
export interface AuthUserCreateForm {
  /** 用户名 */
  auth_username: string
  /** 密码 */
  password: string
  /** 邮箱 (可选) */
  email?: string | null
  /** 是否激活 (可选) */
  auth_is_active?: boolean
  /** 是否员工 (可选) */
  auth_is_staff?: boolean
  /** 联系电话 */
  auth_phone: string
  /** 最后登录时间 (可选) */
  last_login?: string | null
}

/**
 * 认证用户更新表单接口
 * 用于更新用户信息时的表单数据
 */
export interface AuthUserUpdateForm extends Partial<AuthUserCreateForm> {
  /** 用户ID (用于定位要更新的记录) */
  auth_id?: number
  /** 密码不包含在更新表单中 (单独处理) */
  password?: string
}

/**
 * 认证用户基础接口
 * 对应后端数据库表 auth_user_management_table 的基础字段
 * 根据 API 文档补充了完整字段
 */
export interface AuthUser {
  /** 用户ID */
  auth_id: number
  /** 用户名 */
  auth_username: string
  /** 邮箱 */
  email: string | null
  /** 是否激活 */
  auth_is_active: boolean
  /** 是否员工 */
  auth_is_staff: boolean
  /** 联系电话 */
  auth_phone: string
  /** 创建时间 */
  auth_date_create: string
  /** 更新时间 */
  auth_date_update: string
  /** 排序顺序 */
  sort_order: number
  /** 最后登录时间 */
  last_login: string | null
  /** 绑定的员工信息（后端列表接口返回，仅 list/list_active 包含此字段） */
  bound_employee?: {
    employee_jobcode: string
    employee_name: string
  } | null
}

// ======================== 登录相关接口 ========================

/**
 * 登录表单接口
 * 用于登录页面表单数据绑定
 * 字段名与后端 API 请求参数保持一致
 */
export interface LoginForm {
  /** 用户名 (对应后端 auth_username 字段) */
  auth_username: string
  /** 密码 */
  password: string
  /** 记住密码 */
  rememberMe?: boolean
}

/**
 * 认证信息接口
 * 用于存储登录用户的核心信息
 */
export interface AuthInfo {
  /** 用户ID */
  auth_id: number
  /** 用户名 */
  auth_username: string
  /** 是否激活 */
  isactive: boolean
}

/**
 * 登录请求接口
 * 对应后端 POST /api/auth/login/ 接口
 */
export interface LoginRequest {
  /** 用户名 (必填) */
  auth_username: string
  /** 密码 (必填) */
  password: string
}

/**
 * 登录响应接口
 * 对应后端 POST /api/auth/login/ 响应格式
 * 后端返回结构: { code, message, data: { user, access, refresh } }
 */
export interface LoginResponse {
  /** 状态码，0 表示成功 */
  code: number
  /** 响应消息 */
  message: string
  /** 响应数据 */
  data: {
    /** 用户信息 */
    user: AuthUser
    /** 访问令牌 */
    access: string
    /** 刷新令牌 */
    refresh: string
  }
}

// [HR-04] 已删除 ResetPasswordRequest、ResetPasswordResponse 类型
// 原因：后端 /auth/reset-password/ 和 /auth/change-password/ 端点已无效，前端对应方法已删除

/**
 * 退出登录响应接口
 * 对应后端 POST /api/auth/logout/ 响应格式
 * 后端返回结构: { code: 0, message: "退出成功，Token 已作废", data: {} }
 */
export interface LogoutResponse {
  /** 状态码，0 表示成功 */
  code: number
  /** 响应消息 */
  message: string
  /** 响应数据（退出登录时为空对象） */
  data: Record<string, never>
}

// ======================== 查询参数接口 ========================

/**
 * 认证用户查询参数接口
 * 用于用户列表查询时的筛选条件
 */
export interface AuthUserQueryParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  page_size?: number
  /** 搜索关键词 */
  search?: string
  /** 用户名 */
  auth_username?: string
  /** 是否激活 */
  auth_is_active?: boolean
  /** 排序字段 */
  ordering?: string
  /** 索引签名：允许任意 string key，但值必须是 string/number/boolean/null/undefined */
  [key: string]: string | number | boolean | null | undefined
}

// ======================== 响应接口 ========================

/** 认证用户列表响应 */
export type AuthUserListResponse = PaginatedResponse<AuthUser>
