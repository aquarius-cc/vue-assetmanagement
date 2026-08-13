/**
 * @file 网络连通性测试模块，提供后端连通性检测功能（仅用于开发调试）
 * @module api/network
 * @exports
 *   - networkAPI: 网络连通性测试 API 对象（包含连通性检测方法）
 * @callers
 *   - views/NetworkTest: 网络测试视图
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - axios: 错误处理
 */
import { request } from '@/api/index'
import { isAxiosError } from 'axios'

// 从环境变量获取后端地址（与request.ts保持一致）
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://127.0.0.1:8000'

/** HTML 实体转义，防止 XSS 注入 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 网络连通性测试
export const networkAPI = {
  /**
   * 测试后端连接
   * 注意：此测试仅检测网络连通性，不涉及认证
   * 生产环境中建议隐藏此功能（通过环境变量或feature flag控制）
   */
  testConnection: async (): Promise<{ status: string; message: string }> => {
    try {
      // 使用axios实例测试连接（自动携带token，如果有的话）
      // 不使用fetch + no-cors，因为no-cors会返回opaque响应，无法判断真实状态
      await request.get('/')
      return {
        status: 'success',
        message: 'Django服务器连接正常',
      }
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        if (error.code === 'ERR_NETWORK') {
          return {
            status: 'error',
            message: '网络连接失败，请检查网络设置',
          }
        }
        if (error.response) {
          return {
            status: 'success',
            message: `服务器可达（状态码: ${escapeHtml(String(error.response.status))}）`,
          }
        }
      }
      return {
        status: 'error',
        message: `连接测试失败: ${escapeHtml(String(error))}`,
      }
    }
  },

  /**
   * 测试登录接口
   * 使用OPTIONS方法测试登录端点是否可达
   */
  testLoginAPI: async (): Promise<{ status: string; message: string; details?: unknown }> => {
    try {
      // 使用环境变量中的服务器地址，而非硬编码
      const response = await fetch(`${SERVER_URL}/api/v1/auth/login/`, {
        method: 'OPTIONS',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        return {
          status: 'success',
          message: '登录接口存在且可访问',
          details: {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
          },
        }
      } else {
        return {
          status: 'error',
          message: `登录接口不可用: ${escapeHtml(String(response.status))} ${escapeHtml(response.statusText)}`,
          details: {
            status: response.status,
            statusText: response.statusText,
          },
        }
      }
    } catch (error: unknown) {
      return {
        status: 'error',
        message: `登录接口连接失败: ${escapeHtml(String(error))}`,
        details: error,
      }
    }
  },
}
