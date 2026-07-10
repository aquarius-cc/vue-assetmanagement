/**
 * 认证模块 API
 * 对应后端接口: /api/auth/
 * 所有字段名采用 snake_case 与后端序列化器保持一致
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  LoginRequest,
  LoginResponse,
  VerifyTokenResponse,
  AuthUser,
  LogoutResponse,
} from '@/utils/AuthUser'

/**
 * 认证模块 API
 * 后端基础路径: /api/auth/
 * 所有方法遵循后端 API 规范
 */
export const authAPI = {
  /**
   * 用户登录
   * @description 调用 POST /api/auth/login/ 接口
   * @param data 登录请求参数 (LoginRequest)
   *   - auth_username: 用户名
   *   - password: 密码
   * @returns Promise<LoginResponse>
   *   - code: 200 表示成功
   *   - data.user: 用户信息对象
   *   - data.access: 访问令牌
   *   - data.refresh: 刷新令牌
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      const response: LoginResponse = await request.post('/auth/login/', data)

      // 根据后端 API 文档，成功条件为 code === 200 或 code === 201
      const isSuccess = response.code === 200 || response.code === 201

      if (isSuccess) {
        return response
      }

      // 如果有错误消息则抛出，否则使用默认错误
      const errorMsg = response.msg || '登录失败'
      throw new Error(errorMsg)
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('登录失败:', error.message)
      } else if (typeof error === 'string') {
        console.error('登录失败:', error)
      } else {
        console.error('登录失败:', '未知错误')
      }
      throw error
    }
  },

  /**
   * 用户退出登录
   * @description 调用后端 POST /api/auth/logout/ 接口，通知服务端作废 Token
   * @param refreshToken - 刷新令牌，传递给后端用于在黑名单中作废
   * @returns Promise<LogoutResponse> 后端返回的退出登录响应
   *
   * 后端接口规范:
   *   - 路径: POST /api/auth/logout/
   *   - 认证: Bearer Token (access_token)
   *   - 请求体: { "refresh": "<refresh_token>" }
   *   - 成功响应 (200): { code: 200, msg: "退出成功，Token 已作废", data: {} }
   *   - 错误响应 (400): { code: 400, msg: "Token 无效或已过期: ...", data: {} }
   */
  async logout(refreshToken: string): Promise<LogoutResponse> {
    try {
      // 调用后端退出登录接口，携带 refresh_token 使服务端作废 Token
      const response: LogoutResponse = await unwrapResponse(request.post<LogoutResponse>('/auth/logout/', {
        refresh: refreshToken,
      }))
      return response
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('退出登录接口调用失败:', error.message)
      } else if (typeof error === 'string') {
        console.error('退出登录接口调用失败:', error)
      } else {
        console.error('退出登录接口调用失败:', '未知错误')
      }
      // 即使后端接口调用失败，也向上抛出错误
      // 由 Store 层决定是否仍然清除本地状态
      throw error
    }
  },

  /**
   * 验证 Token
   * @description 调用 POST /api/auth/token/verify/ 接口
   * @returns Promise<VerifyTokenResponse>
   */
  async verifyToken(): Promise<VerifyTokenResponse> {
    try {
      const response: VerifyTokenResponse = await request.post<VerifyTokenResponse>('/auth/token/verify/')
      return response
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Token验证失败:', error.message)
      } else if (typeof error === 'string') {
        console.error('Token验证失败:', error)
      } else {
        console.error('Token验证失败:', '未知错误')
      }
      throw error
    }
  },

  // [HR-04] 已删除 resetPassword、resetPasswordWithFeedback、changePassword 方法
  // 原因：后端 /auth/reset-password/ 和 /auth/change-password/ 端点已无效

  /**
   * 获取当前用户信息
   * @description 调用 GET /api/auth/profile/ 接口
   * @returns Promise<AuthUser>
   */
  getCurrentUserProfile: (): Promise<AuthUser> => {
    return unwrapResponse(request.get<AuthUser>('/auth/profile/'))
  },

  /**
   * 更新当前用户信息
   * @description 调用 PUT /api/auth/profile/ 接口
   * @param data 用户信息（可选字段）
   * @returns Promise<AuthUser>
   */
  updateCurrentUserProfile: (data: Partial<AuthUser>): Promise<AuthUser> => {
    return unwrapResponse(request.put<AuthUser>('/auth/profile/', data))
  },

  /**
   * 用户注册
   * @description 调用 POST /api/auth/register/ 接口
   * @param data 注册请求参数
   *   - auth_username: 用户名
   *   - email: 邮箱
   *   - password: 密码
   *   - auth_nickname?: 昵称（可选）
   *   - auth_phone?: 手机号（可选）
   * @returns Promise<LoginResponse>
   */
  register: (data: {
    auth_username: string
    email: string
    password: string
    auth_nickname?: string
    auth_phone?: string
  }): Promise<LoginResponse> => {
    return request.post('/auth/register/', data)
  },
}
