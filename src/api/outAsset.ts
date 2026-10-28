/**
 * @file 出库资产管理 API，提供出库资产的增删改查、批量操作等接口
 * @module api/outAsset
 * @exports
 *   - outAssetAPI: 出库资产管理 API 对象（包含所有出库资产相关方法）
 *   - OutAssetBatchCreateResult: 批量创建出库资产响应类型
 * @callers
 *   - stores/outAssetStore: 出库资产状态管理
 *   - composables/useRecyclableOutAssets: 可回收出库资产列表
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/outasset: 出库资产相关类型定义
 *   - stores/createEntityStore: 批量删除结果类型
 */
import { request, unwrapResponse, getBlob } from '@/api/index'
import { invalidateAssetCache } from './assetCache'
import type { BlobDownload } from '@/api/request'
import type {
  OutAssetDetail,
  OutAssetCreateForm,
  OutAssetUpdateForm,
  OutAssetResponse,
  OutAssetQueryParams,
  RecyclableOutAssetResponse,
} from '@/types/outasset'
import type { BatchDeleteResult } from '@/stores/createEntityStore'
import type { BatchCreateResult } from '@/types/common'

/**
 * 批量创建出库记录响应
 * 对应后端 OutAssetViewSet.batch_create action 返回格式
 * fail_items 格式与后端 BatchOperationMixin.batch_execute 对齐
 */
export type OutAssetBatchCreateResult = BatchCreateResult<OutAssetDetail, OutAssetCreateForm>

/**
 * 出库资产管理 API
 */
export const outAssetAPI = {
  /**
   * 获取出库记录列表
   * @param params 查询参数
   * @returns 出库记录列表响应
   */
  getOutAssets: (params?: OutAssetQueryParams): Promise<OutAssetResponse> => {
    return unwrapResponse(request.get<OutAssetResponse>('/assets/out-assets/', params))
  },

  /**
   * 获取可回收资产列表
   * @param params 查询参数
   * @returns 可回收资产列表响应
   */
  getRecyclableOutAssets: (params?: OutAssetQueryParams): Promise<RecyclableOutAssetResponse> => {
    return unwrapResponse(
      request.get<RecyclableOutAssetResponse>('/assets/out-assets/recyclable/', params),
    )
  },

  /**
   * 获取出库记录详情（启用缓存）
   * @param recordcode 出库记录编码
   * @returns 出库记录详情
   */
  getOutAssetByCode: (recordcode: string): Promise<OutAssetDetail> => {
    return unwrapResponse(
      request.get<OutAssetDetail>(
        `/assets/out-assets/${recordcode}/`,
        undefined,
        true, // 使用缓存
        300000, // 缓存时间 5 分钟
      ),
    )
  },

  /**
   * 创建出库记录
   * POST /api/assets/out-assets/
   *
   * 字段映射（前端表单 → 后端序列化器）：
   * - asset_recordcode → asset_recordcode (SlugRelatedField, slug: recordcode, 必填)
   *
   * 注意：outasset_code 仅用于前端展示，后端单条创建序列化器不接收；
   * 批量创建（batch_create）另走 outasset_asset (slug: asset_code)，不受此映射影响。
   * @param data 出库记录创建表单数据
   * @returns 创建的出库记录
   */
  createOutAsset: (data: OutAssetCreateForm): Promise<OutAssetDetail> => {
    const {
      outasset_code: _,
      asset_recordcode,
      ...rest
    } = data as unknown as Record<string, unknown>
    const backendData = {
      ...rest,
      ...(asset_recordcode !== undefined && asset_recordcode !== null && { asset_recordcode }),
    }
    // [M-RC-08] 出库改变资产状态，失效资产详情/列表缓存（解构自 Record<string,unknown>，需收窄）
    const result = unwrapResponse(request.post<OutAssetDetail>('/assets/out-assets/', backendData))
    invalidateAssetCache(typeof asset_recordcode === 'string' ? asset_recordcode : undefined)
    return result
  },

  /**
   * 更新出库记录
   * PUT /api/assets/out-assets/{recordcode}/
   *
   * 字段映射同 createOutAsset
   * @param data 出库记录更新表单数据（需包含 recordcode）
   * @returns 更新后的出库记录
   */
  updateOutAsset: (data: Partial<OutAssetUpdateForm>): Promise<OutAssetDetail> => {
    const recordcode = data.recordcode || data.outasset_recordcode
    if (!recordcode) {
      throw new Error('recordcode is required for update')
    }
    const {
      outasset_recordcode: _,
      outasset_code,
      ...rest
    } = data as unknown as Record<string, unknown>
    const backendData = {
      ...rest,
      ...(outasset_code !== undefined &&
        outasset_code !== null && { outasset_asset: outasset_code }),
    }
    return unwrapResponse(
      request.put<OutAssetDetail>(`/assets/out-assets/${recordcode}/`, backendData),
    )
  },

  /**
   * 删除出库记录
   * @param recordcode 出库记录编码
   */
  deleteOutAsset: (recordcode: string): Promise<void> => {
    // [M-RC-08] URL 为 out rc（非资产 rc），宽失效
    const result = unwrapResponse(request.delete<void>(`/assets/out-assets/${recordcode}/`))
    invalidateAssetCache()
    return result
  },

  /**
   * 批量删除出库资产
   * POST /api/assets/out-assets/batch-delete/
   * 对应后端 OutAssetViewSet.batch_delete action
   */
  batchDeleteOutAssets: (recordcodes: string[]): Promise<BatchDeleteResult> => {
    // [M-RC-08] 批量删除涉及多资产状态，宽失效全部资产缓存
    const result = unwrapResponse(
      request.post<BatchDeleteResult>('/assets/out-assets/batch-delete/', {
        ids: recordcodes,
      }),
    )
    invalidateAssetCache()
    return result
  },

  /**
   * 批量创建出库记录
   * POST /api/assets/out-assets/batch-create/
   * 对应后端 OutAssetViewSet.batch_create action
   * 一次性提交多条出库数据，后端逐条处理并返回成功/失败明细
   */
  batchCreateOutAssets: (items: OutAssetCreateForm[]): Promise<OutAssetBatchCreateResult> => {
    // [M-RC-08] 批量出库涉及多资产状态，宽失效全部资产缓存
    const result = unwrapResponse(
      request.post<OutAssetBatchCreateResult>('/assets/out-assets/batch-create/', {
        items,
      }),
    )
    invalidateAssetCache()
    return result
  },

  /**
   * 服务端 Excel 导出（P2-04）
   * 省略 limit/offset 时全量导出，总行数超 EXPORT_MAX_ROWS 会被后端拒绝（400）。
   */
  exportExcel: (params?: Record<string, unknown>): Promise<BlobDownload> => {
    return getBlob('/assets/out-assets/export/', params, 'out_assets.xlsx')
  },
}
