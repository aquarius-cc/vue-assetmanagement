/**
 * 资产管理 API
 * 对应后端接口: /api/assets/assets/
 * 与后�?AssetViewSet 接口完全一�? */
import { request, unwrapResponse } from '@/api/index'
import { isAxiosError, } from 'axios'
import type {
  Asset,
  AssetDetail,
  AssetCreateForm,
  AssetUpdateForm,
  AssetStatistics,
  AssetListResponse,
  AssetQueryParams,
  AssetChangeStatusForm,
  AssetListSimpleResponse,
} from '@/types/asset'
import type { Contract } from '@/types/contract'
import type { BatchDeleteResult } from '@/stores/createEntityStore'

/**
 * 批量创建资产响应
 * 对应后端 AssetViewSet.batch_create action 返回格式
 * fail_items 格式与后�?BatchOperationMixin.batch_execute 对齐
 */
export interface AssetBatchCreateResult {
  total: number
  success_count: number
  fail_count: number
  success_items: AssetDetail[]
  fail_items: Array<{
    index: number
    error_code: string
    error_message: string
    input_data: AssetCreateForm
    row_number?: number
  }>
}

/**
 * [LR-01] 资产操作历史记录�? * 对应 GET /api/assets/assets/{asset_code}/history/ 返回的每条记�? */
interface AssetHistoryItem {
  id: number
  operation_type: string
  operator_jobcode: string
  operator_name: string
  operation_time: string
  details: Record<string, unknown>
}

/**
 * [LR-01] 资产状态时间线�? * 对应 GET /api/assets/assets/{asset_code}/timeline/ 返回的每条记�? */
interface AssetTimelineItem {
  status: string
  timestamp: string
  description: string
  operator_name: string
}

/**
 * 资产管理 API
 */
export const assetAPI = {
  /**
   * 获取资产列表
   * GET /api/assets/assets/
   * 查询参数: page, page_size, asset_current_status, asset_type_code, asset_storage_code, keyword, ordering
   */
  getAssets: (params?: AssetQueryParams): Promise<AssetListResponse> => {
    return unwrapResponse(request.get<AssetListResponse>('/assets/assets/', params))
  },

  /**
   * 创建资产
   * POST /api/assets/assets/
   *
   * 后端规则�?   * - asset_code 由后端自动生�?   * - �?asset_purchase_number > 1 时，后端创建多条 Asset 记录
   * - 返回 List[AssetDetail]，单条时数组长度�?
   *
   * 字段映射（前�?AssetCreateForm �?后端 AssetCreateSerializer）：
   * - asset_type �?SlugRelatedField(slug_field='asset_type_code')
   * - asset_contract �?SlugRelatedField(slug_field='contract_code')
   * - asset_storage �?SlugRelatedField(slug_field='storage_code')
   * - asset_entry_person �?SlugRelatedField(slug_field='employee_jobcode')
   * - asset_applicant �?SlugRelatedField(slug_field='employee_jobcode')
   * - asset_manager �?SlugRelatedField(slug_field='employee_jobcode')
   */
  createAsset: (data: AssetCreateForm): Promise<AssetDetail[]> => {
    return unwrapResponse(request.post<AssetDetail[]>('/assets/assets/', data))
  },

  /**
   * 获取资产详情
   * GET /api/assets/assets/{asset_code}/
   * 包含嵌套的关联对�?   */
  getAssetByCode: async (asset_code: string): Promise<AssetDetail | null> => {
    try {
      return unwrapResponse(request.get<AssetDetail>(
        `/assets/assets/${asset_code}/`,
        undefined,
        true, // 使用缓存
        300000, // 缓存时间 5 分钟
      ))
    } catch (error) {
      // 使用isAxiosError守卫进行类型安全的错误处�?      if (isAxiosError(error) && error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  /**
   * 更新资产
   * PUT /api/assets/assets/{asset_code}/
   *
   * 字段映射�?createAsset
   */
  updateAsset: (data: AssetUpdateForm): Promise<AssetDetail> => {
    if (!data.asset_code) {
      throw new Error('asset_code is required for update')
    }
    const { asset_code, ...payload } = data
    return unwrapResponse(request.put<AssetDetail>(`/assets/assets/${asset_code}/`, payload))
  },

  /**
   * 删除资产（软删除�?   * DELETE /api/assets/assets/{asset_code}/
   */
  deleteAsset: (asset_code: string): Promise<void> => {
    return unwrapResponse(request.delete<void>(`/assets/assets/${asset_code}/`))
  },

  /**
   * 按名称搜索资�?   * GET /api/assets/assets/getassetbyname/{name}/
   */
  getAssetByName: async (name: string): Promise<AssetListResponse | null> => {
    try {
      return unwrapResponse(request.get<AssetListResponse>(
        `/assets/assets/getassetbyname/${encodeURIComponent(name)}/`,
      ))
    } catch (error) {
      // 使用isAxiosError守卫进行类型安全的错误处�?      if (isAxiosError(error) && error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  /**
   * 获取可用资产（状态为 in_store�?   * GET /api/assets/assets/search_available/
   */
  searchAvailableAssets: (params?: { page?: number; page_size?: number }): Promise<AssetListSimpleResponse> => {
    return unwrapResponse(request.get<AssetListSimpleResponse>('/assets/assets/search_available/', params))
  },

  /**
   * 全局搜索资产（使用后�?search_assets action�?   * GET /api/assets/assets/search/
   *
   * 后端 AssetSelector.search_assets() 会：
   * - 过滤 is_deleted=False
   * - 预加载关联信息（asset_type, storage, contract 等）
   * - 支持多条件组合搜�?   *
   * @param params 搜索参数
   *   - keyword: 搜索关键词（匹配资产名称、编码等�?   *   - status: 资产状态筛�?   *   - asset_type: 资产类型编码筛�?   *   - storage_code: 仓库编码筛�?   *   - contract_code: 合同编码筛�?   *   - page: 页码
   *   - page_size: 每页条数
   */
  searchAssets: (params: {
    keyword?: string
    status?: string
    asset_type?: string
    storage_code?: string
    contract_code?: string
    page?: number
    page_size?: number
  }): Promise<AssetListResponse> => {
    return unwrapResponse(request.get<AssetListResponse>('/assets/assets/search/', params))
  },

  /**
   * 联合搜索资产（多条件组合搜索�?   * GET /api/assets/assets/combine_search/
   *
   * 后端 CombineSearchSerializer 支持的参数：
   * - asset_name: 资产名称（模糊匹配）
   * - asset_specification: 型号规格（模糊匹配）
   * - asset_brand: 品牌（模糊匹配）
   * - asset_current_status: 当前状态（精确匹配�?   * - asset_type: 资产类型编码（精确匹配）
   * - asset_type_category: 资产分类（精确匹配）
   * - asset_storage: 仓库编码（精确匹配）
   * - asset_contract: 合同编码（精确匹配）
   *
   * @param params 搜索参数
   */
  combineSearch: (params: {
    asset_name?: string
    asset_specification?: string
    asset_brand?: string
    asset_current_status?: string
    asset_type?: string
    asset_type_category?: string
    asset_storage?: string
    asset_contract?: string
    page?: number
    page_size?: number
  }): Promise<AssetListResponse> => {
    return unwrapResponse(request.get<AssetListResponse>('/assets/assets/combine_search/', params))
  },

  /**
   * 获取资产合同详情
   * GET /api/assets/assets/{asset_code}/contract/
   */
  getContractByAssetCode: (asset_code: string): Promise<Contract> => {
    return unwrapResponse(request.get<Contract>(`/assets/assets/contract_by_asset/${asset_code}/`))
  },

  /**
   * 变更资产状�?   * POST /api/assets/assets/{asset_code}/change_status/
   * 请求参数: status (必填), description (可�?
   */
  changeAssetStatus: (asset_code: string, data: AssetChangeStatusForm): Promise<Asset> => {
    return unwrapResponse(request.post<Asset>(
      `/assets/assets/${asset_code}/change_status/`,
      data,
    ))
  },

  /**
   * 获取资产组合详情
   * GET /api/assets/assets/combined_details/
   * 查询参数: asset_code (必填)
   */
  getCombinedDetails: (asset_code: string): Promise<AssetDetail> => {
    return unwrapResponse(request.get<AssetDetail>('/assets/assets/combined_details/', { asset_code }))
  },

  /**
   * 获取资产统计信息
   * GET /api/assets/assets/statistics/
   */
  getAssetStatistics: (): Promise<AssetStatistics> => {
    return unwrapResponse(request.get<AssetStatistics>('/assets/assets/statistics/'))
  },

  /**
   * 获取资产操作历史
   * 对应 spec.md: GET /api/assets/assets/{code}/history/
   * @param asset_code 资产编码
   * @returns 操作历史列表
   */
  getAssetHistory: (asset_code: string): Promise<AssetHistoryItem[]> => {
    return unwrapResponse(request.get<AssetHistoryItem[]>(`/assets/assets/${asset_code}/history/`))
  },

  /**
   * 获取资产状态变更时间线
   * 对应 spec.md: GET /api/assets/assets/{code}/timeline/
   * @param asset_code 资产编码
   * @returns 状态时间线数据
   */
  getAssetTimeline: (asset_code: string): Promise<AssetTimelineItem[]> => {
    return unwrapResponse(request.get<AssetTimelineItem[]>(`/assets/assets/${asset_code}/timeline/`))
  },

  /**
   * 批量删除资产
   * POST /api/assets/assets/batch-delete/
   * 对应后端 AssetViewSet.batch_delete action
   */
  batchDeleteAssets: (codes: string[]): Promise<BatchDeleteResult> => {
    return unwrapResponse(
      request.post<BatchDeleteResult>('/assets/assets/batch-delete/', {
        ids: codes,
      }),
    )
  },

  /**
   * 批量创建资产
   * POST /api/assets/assets/batch-create/
   * 对应后端 AssetViewSet.batch_create action
   * 一次性提交多条资产数据，后端逐条处理并返回成�?失败明细
   */
  batchCreateAssets: (items: AssetCreateForm[]): Promise<AssetBatchCreateResult> => {
    return unwrapResponse(
      request.post<AssetBatchCreateResult>('/assets/assets/batch-create/', {
        items,
      }),
    )
  },
}
