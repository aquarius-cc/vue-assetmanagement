// network.ts
// 网络连通性测试模块
// 注意：此模块仅用于开发调试，生产环境应隐藏相关按钮
import { request } from '@/api/index'
import { isAxiosError } from 'axios'

// 从环境变量获取后端地址（与request.ts保持一致）
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://127.0.0.1:8000'

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
            message: `服务器可达（状态码: ${error.response.status}）`,
          }
        }
      }
      return {
        status: 'error',
        message: `连接测试失败: ${String(error)}`,
      }
    }
  },

  /**
   * 测试API接口
   * 测试后端API基础路径是否可访问
   */
  testAPI: async (): Promise<{ status: string; message: string; details?: unknown }> => {
    try {
      const response = await request.get('/test/')
      return {
        status: 'success',
        message: 'API接口连接正常',
        details: response,
      }
    } catch (error: unknown) {
      let errorMessage = '未知错误'
      let errorDetails: unknown = undefined

      if (isAxiosError(error)) {
        errorMessage = String(error.message || errorMessage)
        errorDetails = {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url,
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      return {
        status: 'error',
        message: `API接口测试失败: ${errorMessage}`,
        details: errorDetails,
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
      const response = await fetch(`${SERVER_URL}/api/auth/login/`, {
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
          message: `登录接口不可用: ${response.status} ${response.statusText}`,
          details: {
            status: response.status,
            statusText: response.statusText,
          },
        }
      }
    } catch (error: unknown) {
      return {
        status: 'error',
        message: `登录接口连接失败: ${String(error)}`,
        details: error,
      }
    }
  },
}
