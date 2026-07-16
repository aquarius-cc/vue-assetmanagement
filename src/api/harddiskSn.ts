/**
 * 硬盘序列号管理 API
 * 对应后端接口: /api/assets/harddisk-sn/
 * 所有字段名采用 snake_case 与后端序列化器保持一致
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  HardDiskSN,
  HardDiskSNCreateForm,
  HardDiskSNUpdateForm,
  HardDiskSNBatchSaveForm,
} from '@/utils/HardDiskSN'

/**
 * 硬盘序列号列表响应类型
 */
interface HardDiskSNListResponse {
  count: number
  next: string | null
  previous: string | null
  results: HardDiskSN[]
}

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
   * 获取硬盘序列号详情（通过 lookup_field harddisksn_asset）
   * GET /api/assets/harddisk-sn/{harddisksn_asset}/
   * @param harddisksn_asset 资产 recordcode（后端 lookup_field）
   * @returns 硬盘序列号详情
   */
  getHardDiskSN: (harddisksn_asset: string): Promise<HardDiskSN> => {
    return unwrapResponse(
      request.get<HardDiskSN>(`/assets/harddisk-sn/${harddisksn_asset}/`, undefined, true, 300000),
    )
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
   * PUT /api/assets/harddisk-sn/{harddisksn_asset}/
   * @param harddisksn_asset 资产 recordcode（后端 lookup_field）
   * @param data 硬盘序列号更新表单数据
   * @returns 更新后的硬盘序列号记录
   */
  updateHardDiskSN: (harddisksn_asset: string, data: HardDiskSNUpdateForm): Promise<HardDiskSN> => {
    return unwrapResponse(request.put<HardDiskSN>(`/assets/harddisk-sn/${harddisksn_asset}/`, data))
  },

  /**
   * 删除硬盘序列号记录
   * DELETE /api/assets/harddisk-sn/{harddisksn_asset}/
   * @param harddisksn_asset 资产 recordcode（后端 lookup_field）
   */
  deleteHardDiskSN: (harddisksn_asset: string): Promise<void> => {
    return unwrapResponse(request.delete<void>(`/assets/harddisk-sn/${harddisksn_asset}/`))
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
   * 提交 { asset_code, disks } 数组
   * 后端根据每条记录是否有 id 决定新增或更新
   * @param data 批量保存表单数据
   * @returns 保存结果（包含 success、created、updated、errors 数组）
   */
  saveHardDiskSNBatch: (
    data: HardDiskSNBatchSaveForm,
  ): Promise<{
    success: boolean
    created: number
    updated: number
    errors: Array<{ index: number; message: string }>
  }> => {
    return unwrapResponse(request.post('/assets/harddisk-sn/batch/', data))
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
