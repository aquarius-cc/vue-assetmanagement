/**
 * @file 硬盘序列号管理 API，提供硬盘序列号的增删改查、批量操作等接口
 * @module api/harddiskSn
 * @exports
 *   - harddiskSnAPI: 硬盘序列号管理 API 对象（包含所有硬盘序列号相关方法）
 * @callers
 *   - stores/harddiskSnStore: 硬盘序列号状态管理
 *   - views/HarddiskSnManage: 硬盘序列号管理视图
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/harddisksn: 硬盘序列号相关类型定义
 *   - stores/createEntityStore: 批量删除结果类型
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  HardDiskSN,
  HardDiskSNCreateForm,
  HardDiskSNUpdateForm,
  HardDiskSNBatchSaveForm,
  HardDiskSNListResponse,
} from '@/types/harddisksn'

/**
 * 硬盘序列号查询参数类型
 */
interface HardDiskSNQueryParams {
  page?: number
  page_size?: number
  search?: string
  asset_code?: string
  harddisk_type?: string
  harddisk_status?: string
  /** 索引签名：允许任意 string key，兼容 request.get 的 params 类型 */
  [key: string]: string | number | boolean | null | undefined
}

/**
 * 硬盘序列号管理 API
 */
export const harddiskSnAPI = {
  /**
   * 获取硬盘序列号列表
   * @param params 查询参数（分页、搜索、筛选）
   * @returns 硬盘序列号列表响应
   */
  getHardDiskSNs: (params?: HardDiskSNQueryParams): Promise<HardDiskSNListResponse> => {
    return unwrapResponse(request.get<HardDiskSNListResponse>('/assets/harddisk-sn/', params))
  },

  /**
   * 获取硬盘序列号详情
   * GET /api/assets/harddisk-sn/{recordcode}/
   * @param recordcode 硬盘记录 recordcode
   * @returns 硬盘序列号详情
   */
  getHardDiskSN: (recordcode: string): Promise<HardDiskSN> => {
    return unwrapResponse(request.get<HardDiskSN>(`/assets/harddisk-sn/${recordcode}/`))
  },

  /**
   * 获取硬盘序列号详情（启用缓存）
   * @param harddisk_sn_code 硬盘序列号
   * @returns 硬盘序列号详情
   */
  getHardDiskSNByCode: (harddisk_sn_code: string): Promise<HardDiskSN> => {
    return unwrapResponse(
      request.post('/assets/harddisk-sn/search_by_serial_number/', {
        harddisk_sn_code: harddisk_sn_code,
      }),
    )
  },

  /**
   * 创建硬盘序列号记录
   * @param data 硬盘序列号创建表单数据
   * @returns 创建的硬盘序列号记录
   */
  createHardDiskSN: (data: HardDiskSNCreateForm): Promise<HardDiskSN> => {
    return unwrapResponse(request.post<HardDiskSN>('/assets/harddisk-sn/', data))
  },

  /**
   * 更新硬盘序列号记录
   * PUT /api/assets/harddisk-sn/{recordcode}/
   * @param recordcode 硬盘记录 recordcode
   * @param data 硬盘序列号更新表单数据
   * @returns 更新后的硬盘序列号记录
   */
  updateHardDiskSN: (recordcode: string, data: HardDiskSNUpdateForm): Promise<HardDiskSN> => {
    return unwrapResponse(request.put<HardDiskSN>(`/assets/harddisk-sn/${recordcode}/`, data))
  },

  /**
   * 删除硬盘序列号记录
   * DELETE /api/assets/harddisk-sn/{recordcode}/
   * @param recordcode 硬盘记录 recordcode
   */
  deleteHardDiskSN: (recordcode: string): Promise<void> => {
    return unwrapResponse(request.delete<void>(`/assets/harddisk-sn/${recordcode}/`))
  },
  /**
   * 删除硬盘序列号记录
   * @param id 硬盘序列号主键 ID
   */
  deleteHardDiskSNByCode: (harddisk_sn_code: string): Promise<void> => {
    return unwrapResponse(request.delete<void>(`/assets/harddisk-sn/${harddisk_sn_code}/`))
  },

  /**
   * 批量保存硬盘序列号记录（新增和编辑统一）
   * 提交 { asset_recordcode, disks } 数组
   * 后端根据每条记录是否有 recordcode 决定新增或更新
   * @param data 批量保存表单数据
   * @returns 保存结果（包含 created、updated、total、asset_recordcode）
   */
  saveHardDiskSNBatch: (
    data: HardDiskSNBatchSaveForm,
  ): Promise<{
    created: number
    updated: number
    total: number
    asset_recordcode: string
  }> => {
    return unwrapResponse(request.post('/assets/harddisk-sn/batch-save/', data))
  },

  /**
   * 根据资产编码获取硬盘序列号列表
   * @param asset_code 资产编码
   * @returns 硬盘序列号列表响应
   */
  getHardDiskSNsByAsset: (asset_code: string): Promise<HardDiskSNListResponse> => {
    return unwrapResponse(
      request.get<HardDiskSNListResponse>(`/assets/harddisk-sn/by-asset/${asset_code}/`),
    )
  },
}
