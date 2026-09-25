/**
 * @file 资产扫码查询 API，封装公开扫码页面的资产信息查询端点
 * @module api/scan
 * @exports
 *   - scanAPI: 扫码查询 API 对象
 *   - PublicScanAsset: 公开扫码资产信息类型（自 @/types/scan 转出）
 * @callers
 *   - stores/assetStore: 资产 Store 代理本端点
 * @dependsOn
 *   - api/request.ts: 使用 request 实例与 unwrapResponse 解包
 *   - types/scan: 公开扫码资产信息类型
 */
import { request, unwrapResponse } from '@/api/index'
import type { PublicScanAsset } from '@/types/scan'

export type { PublicScanAsset }

/**
 * 资产扫码查询 API
 */
export const scanAPI = {
  /**
   * 按资产记录码查询公开扫码信息
   * GET /api/v1/assets/public/scan/{recordcode}/
   * @param recordcode 资产记录码
   * @returns 资产公开信息
   * @throws 业务 code !== 0 时由 unwrapResponse 抛出 Error
   */
  fetchPublicScanAsset: (recordcode: string): Promise<PublicScanAsset> => {
    return unwrapResponse(request.get<PublicScanAsset>(`/assets/public/scan/${recordcode}/`))
  },
}
