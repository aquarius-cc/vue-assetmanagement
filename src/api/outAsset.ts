/**
 * @file 出库资产管理 API，提供出库资产的增删改查、批量操作等接口
 * @module api/outAsset
 * @exports
 *   - outAssetAPI: 出库资产管理 API 对象（包含所有出库资产相关方法）
 *   - OutAssetBatchCreateResult: 批量创建出库资产响应类型
 * @callers
 *   - stores/outAssetStore: 出库资产状态管理
 *   - composables/useOutAssetForm: 出库资产表单组合式函数
 *   - composables/useRecyclableOutAssets: 可回收出库资产列表
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/outasset: 出库资产相关类型定义
 *   - stores/createEntityStore: 批量删除结果类型
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  OutAssetDetail,
  OutAssetCreateForm,
  OutAssetUpdateForm,
  OutAssetResponse,
  OutAssetQueryParams,
  RecyclableOutAssetResponse,
} from '@/types/outasset'
import type { BatchDeleteResult } from '@/stores/createEntityStore'

/**
 * 批量创建出库记录响应
 * 对应后端 OutAssetViewSet.batch_create action 返回格式
 * fail_items 格式与后端 BatchOperationMixin.batch_execute 对齐
 */
export interface OutAssetBatchCreateResult {
  total: number
  success_count: number
  fail_count: number
  success_items: OutAssetDetail[]
  fail_items: Array<{
    index: number
    error_code: string
    error_message: string
    input_data: OutAssetCreateForm
    row_number?: number
  }>
}

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
   * - outasset_code → outasset_asset (SlugRelatedField, slug: asset_code)
   *
   * 注意：outasset_contract_code 在后端模型/序列化器中不存在，已从请求中移除
   * @param data 出库记录创建表单数据
   * @returns 创建的出库记录
   */
  createOutAsset: (data: OutAssetCreateForm): Promise<OutAssetDetail> => {
    const { outasset_code, ...rest } = data as unknown as Record<string, unknown>
    const backendData = {
      ...rest,
      ...(outasset_code !== undefined &&
        outasset_code !== null && { outasset_asset: outasset_code }),
    }
    return unwrapResponse(request.post<OutAssetDetail>('/assets/out-assets/', backendData))
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
    return unwrapResponse(request.delete<void>(`/assets/out-assets/${recordcode}/`))
  },

  /**
   * 批量删除出库资产
   * POST /api/assets/out-assets/batch-delete/
   * 对应后端 OutAssetViewSet.batch_delete action
   */
  batchDeleteOutAssets: (recordcodes: string[]): Promise<BatchDeleteResult> => {
    return unwrapResponse(
      request.post<BatchDeleteResult>('/assets/out-assets/batch-delete/', {
        ids: recordcodes,
      }),
    )
  },

  /**
   * 批量创建出库记录
   * POST /api/assets/out-assets/batch-create/
   * 对应后端 OutAssetViewSet.batch_create action
   * 一次性提交多条出库数据，后端逐条处理并返回成功/失败明细
   */
  batchCreateOutAssets: (items: OutAssetCreateForm[]): Promise<OutAssetBatchCreateResult> => {
    return unwrapResponse(
      request.post<OutAssetBatchCreateResult>('/assets/out-assets/batch-create/', {
        items,
      }),
    )
  },

  /**
   * 根据资产编码获取出库记录
   * @param asset_code 资产编码
   * @returns 出库记录列表响应
   */
  getOutAssetsByAsset: (asset_code: string): Promise<OutAssetResponse> => {
    return unwrapResponse(
      request.get<OutAssetResponse>(`/assets/out-assets/by-asset/${asset_code}/`),
    )
  },

  /**
   * 获取出库统计信息
   * @returns 出库统计数据
   */
  getOutAssetStatistics: (): Promise<{
    total_out_assets: number
    by_type: Record<string, { name: string; count: number }>
  }> => {
    return unwrapResponse(request.get('/assets/out-assets/statistics/'))
  },

  /**
   * [MR-07] 按申请人工号查询出库记录
   * @param applicant_jobcode 申请人工号
   * @returns 出库记录列表响应
   */
  getOutAssetsByApplicant: (applicant_jobcode: string): Promise<OutAssetResponse> => {
    return unwrapResponse(
      request.get<OutAssetResponse>(`/assets/out-assets/by-applicant/${applicant_jobcode}/`),
    )
  },
}
