/**
 * @file 损坏资产管理 API，提供损坏资产的增删改查、批量操作等接口
 * @module api/damagedAsset
 * @exports
 *   - damagedAssetAPI: 损坏资产管理 API 对象（包含所有损坏资产相关方法）
 * @callers
 *   - stores/damagedAssetStore: 损坏资产状态管理
 *   - components/componentsdetails/DamagedAssetDetails: 损坏资产管理视图
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/damagedasset: 损坏资产相关类型定义
 *   - stores/createEntityStore: 批量删除结果类型
 */
import { request, unwrapResponse, getBlob } from '@/api/index'
import { invalidateAssetCache } from './assetCache'
import type { BlobDownload } from '@/api/request'
import type {
  DamagedAsset,
  DamagedAssetCreateForm,
  DamagedAssetUpdateForm,
  DamagedAssetListResponse,
  DamagedAssetQueryParams,
} from '@/types/damagedasset'
import type { BatchDeleteResult } from '@/stores/createEntityStore'

/**
 * 损坏资产管理 API
 */
export const damagedAssetAPI = {
  /**
   * 获取损坏资产列表
   * @param params 查询参数
   * @returns 损坏资产列表响应
   */
  getDamagedAssets: (params?: DamagedAssetQueryParams): Promise<DamagedAssetListResponse> => {
    return unwrapResponse(request.get<DamagedAssetListResponse>('/assets/damaged-assets/', params))
  },

  /**
   * 获取损坏资产详情（启用缓存）
   * @param code 损坏资产编码
   * @returns 损坏资产详情
   */
  getDamagedAsset: (code: string): Promise<DamagedAsset> => {
    return unwrapResponse(
      request.get(
        `/assets/damaged-assets/${code}/`,
        undefined,
        true, // 使用缓存
        300000, // 缓存时间 5 分钟
      ),
    )
  },

  /**
   * 创建损坏记录
   * @param data 损坏记录创建表单数据
   * @returns 创建的损坏记录
   */
  createDamagedAsset: (data: DamagedAssetCreateForm): Promise<DamagedAsset> => {
    // [M-RC-08] 待报废改变资产状态；表单 asset_recordcode 可空 → 空值降级宽失效
    const result = unwrapResponse(request.post<DamagedAsset>('/assets/damaged-assets/', data))
    invalidateAssetCache(data.asset_recordcode)
    return result
  },

  /**
   * 更新损坏记录
   * @param code 损坏资产编码
   * @param data 损坏记录更新表单数据
   * @returns 更新后的损坏记录
   */
  updateDamagedAsset: (
    code: string,
    data: Partial<DamagedAssetUpdateForm>,
  ): Promise<DamagedAsset> => {
    return unwrapResponse(request.put<DamagedAsset>(`/assets/damaged-assets/${code}/`, data))
  },

  /**
   * 删除损坏记录
   * @param code 损坏资产编码
   */
  deleteDamagedAsset: (code: string): Promise<void> => {
    // [M-RC-08] URL 为 damaged rc（非资产 rc），宽失效
    const result = unwrapResponse(request.delete<void>(`/assets/damaged-assets/${code}/`))
    invalidateAssetCache()
    return result
  },

  /**
   * 批量删除待报废资产
   * POST /api/assets/damaged-assets/batch-delete/
   * 对应后端 DamagedAssetViewSet.batch_delete action
   */
  batchDeleteDamagedAssets: (codes: string[]): Promise<BatchDeleteResult> => {
    // [M-RC-08] 批量删除涉及多资产状态，宽失效全部资产缓存
    const result = unwrapResponse(
      request.post<BatchDeleteResult>('/assets/damaged-assets/batch-delete/', {
        ids: codes,
      }),
    )
    invalidateAssetCache()
    return result
  },

  /**
   * 根据资产编码获取损坏记录
   * @param asset_code 资产编码
   * @returns 损坏记录列表响应
   */
  getDamagedAssetsByAsset: (asset_code: string): Promise<DamagedAssetListResponse> => {
    return unwrapResponse(
      request.get<DamagedAssetListResponse>(`/assets/damaged-assets/by-asset/${asset_code}/`),
    )
  },

  /**
   * 审批通过待报废资产
   * @param code 损坏资产编码
   * @param data 审批数据（可选 approver_jobcode 和 operator_name）
   * @returns 审批结果
   */
  approveDamagedAsset: (
    code: string,
    data?: { approver_jobcode?: string; operator_name?: string },
  ): Promise<{
    damaged_asset: DamagedAsset
    waste_asset: Record<string, unknown>
  }> => {
    // [M-RC-08] 审批改变资产状态（→已报废），URL 为 damaged rc，宽失效
    const result = unwrapResponse<{
      damaged_asset: DamagedAsset
      waste_asset: Record<string, unknown>
    }>(request.post(`/assets/damaged-assets/${code}/approve/`, data))
    invalidateAssetCache()
    return result
  },

  /**
   * 审批拒绝待报废资产
   * @param code 损坏资产编码
   * @param data 审批数据（可选 approver_jobcode 和 operator_name）
   * @returns 审批结果
   */
  rejectDamagedAsset: (
    code: string,
    data?: { approver_jobcode?: string; operator_name?: string },
  ): Promise<DamagedAsset> => {
    // [M-RC-08] 驳回改变资产状态（回到在用），URL 为 damaged rc，宽失效
    const result = unwrapResponse<DamagedAsset>(
      request.post(`/assets/damaged-assets/${code}/reject/`, data),
    )
    invalidateAssetCache()
    return result
  },

  /**
   * 服务端 Excel 导出（P2-04）
   * 省略 limit/offset 时全量导出，总行数超 EXPORT_MAX_ROWS 会被后端拒绝（400）。
   */
  exportExcel: (params?: Record<string, unknown>): Promise<BlobDownload> => {
    return getBlob('/assets/damaged-assets/export/', params, 'damaged_assets_export.xlsx')
  },
}
