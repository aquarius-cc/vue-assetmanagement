/**
 * @file 认证模块 API，提供登录、登出等认证相关接口
 * @module api/auth
 * @exports
 *   - authAPI: 认证模块 API 对象（包含所有认证相关方法）
 * @callers
 *   - stores/auth: 认证状态管理
 *   - views/LogIn: 登录视图
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/authuser: 认证相关类型定义
 */
import { request, unwrapResponse } from '@/api/index'
import type { LoginRequest, LoginResponse, AuthUser, LogoutResponse } from '@/types/authuser'

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
   *   - code: 0 表示成功
   *   - data.user: 用户信息对象
   *   - data.access: 访问令牌
   *   - data.refresh: 刷新令牌
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      const response: LoginResponse = await request.post('/auth/login/', data)

      // 根据后端 API 文档，成功条件为 code === 0（AGENTS.md §3 跨端契约）
      const isSuccess = response.code === 0

      if (isSuccess) {
        return response
      }

      // 如果有错误消息则抛出，否则使用默认错误
      const errorMsg = response.message || '登录失败'
      throw new Error(errorMsg)
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('登录失败:', error.message)
      } else if (typeof error === 'string') {
        console.error('登录失败:', error)
      } else {
        console.error('登录失败:', '未知错误')
      }
      // 提取后端返回的错误信息，包装为 Error 抛出
      // 确保调用方（authStore.login）能通过 error.message 获取准确提示
      // 注意：业务失败时抛出的 Error 无 .response，需保留其原始 message
      const backendMsg = (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message
      const errMsg = backendMsg || (error instanceof Error ? error.message : '')
      throw new Error(errMsg || '登录失败，请稍后重试')
    }
  },

  /**
   * 用户退出登录
   * @description 调用后端 POST /api/auth/logout/ 接口，通知服务端作废 Token
   * @param refreshToken - 可选刷新令牌（bearer 通道传入作废黑名单；cookie 通道省略，由后端读 HttpOnly Cookie）
   * @returns Promise<LogoutResponse> 后端返回的退出登录响应
   *
   * 后端接口规范:
   *   - 路径: POST /api/auth/logout/
   *   - 认证: Bearer Token (access_token) 或 HttpOnly Cookie（cookie 通道）
   *   - 请求体: { "refresh": "<refresh_token>" }（bearer）；cookie 通道传空对象
   *   - 成功响应 (200): { code: 0, message: "退出成功，Token 已作废", data: {} }
   *   - 错误响应 (400): { code: <业务错误码>, message: "Token 无效或已过期: ...", data: {} }
   */
  async logout(refreshToken?: string): Promise<LogoutResponse> {
    try {
      // 调用后端退出登录接口（cookie 通道必须调用，即使无 body token，后端据此删除 Cookie）
      const response: LogoutResponse = await unwrapResponse(
        request.post<LogoutResponse>(
          '/auth/logout/',
          refreshToken ? { refresh: refreshToken } : {},
        ),
      )
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
}
