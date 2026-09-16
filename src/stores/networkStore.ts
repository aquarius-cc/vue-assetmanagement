/**
 * @file 网络连通性测试 Store — 后端连通性检测（仅用于开发调试）
 * @module stores/networkStore
 * @exports
 *   - useNetworkStore: 网络测试状态 Store
 * @callers
 *   - views/LogIn.vue
 * @dependsOn
 *   - api/network: 网络连通性测试 API
 */
import { defineStore } from 'pinia'
import { networkAPI } from '@/api/network'

/**
 * 网络测试 Store
 */
export const useNetworkStore = defineStore('network', () => {
  /**
   * 测试后端连接
   * @returns 连接测试结果
   */
  async function testConnection() {
    return networkAPI.testConnection()
  }

  /**
   * 测试登录接口
   * @returns 登录接口测试结果
   */
  async function testLoginAPI() {
    return networkAPI.testLoginAPI()
  }

  return {
    testConnection,
    testLoginAPI,
  }
})
