/**
 * 合同管理 API
 * 对应后端接口: /api/assets/contracts/
 * 所有字段名采用 snake_case 与后端序列化器保持一�? */
import { request, unwrapResponse } from '@/api/index'
import type {
  Contract,
  ContractCreateForm,
  ContractUpdateForm,
  ContractListResponse,
  ContractStats,
  ContractQueryParams,
} from '@/types/contract'
import type { BatchDeleteResult } from '@/stores/createEntityStore'

/**
 * 批量创建合同响应
 * 对应后端 ContractViewSet.batch_create action 返回格式
 * fail_items 格式与后�?BatchOperationMixin.batch_execute 对齐
 */
export interface ContractBatchCreateResult {
  total: number
  success_count: number
  fail_count: number
  success_items: Contract[]
  fail_items: Array<{
    index: number
    error_code: string
    error_message: string
    input_data: ContractCreateForm
    row_number?: number
  }>
}

/**
 * 合同管理 API
 */
export const contractAPI = {
  /**
   * 获取合同列表
   * @param params 查询参数
   * @returns 合同列表响应
   */
  getContracts: (params?: ContractQueryParams): Promise<ContractListResponse> => {
    return unwrapResponse(request.get<ContractListResponse>('/assets/contracts/', params))
  },

  /**
   * 根据合同编码获取合同详情（启用缓存）
   * @param contract_code 合同编码
   * @returns 合同详情
   */
  getContractByCode: (contract_code: string): Promise<Contract> => {
    return unwrapResponse(request.get<Contract>(`/assets/contracts/${contract_code}/`,
      undefined,
      true, // 使用缓存
      300000, // 缓存时间 5 分钟
    ))
  },

  /**
   * 根据合同编码�?ID 获取合同详情
   * @param code 合同编码�?ID
   * @returns 合同详情
   */
  getContractByCodeOrId: (code: string): Promise<Contract> => {
    return unwrapResponse(request.get<Contract>(`/assets/contracts/${code}/`,
      undefined,
      true, // 使用缓存
      300000, // 缓存时间 5 分钟
    ))
  },

  /**
   * 按名称搜索合�?   * GET /api/assets/contracts/getcontractByname/{name}/
   * 对应后端 ContractViewSet.getcontractByname action
   */
  getContractByName: (contract_name: string): Promise<ContractListResponse> => {
    return unwrapResponse(request.get<ContractListResponse>(
      `/assets/contracts/getcontractByname/${encodeURIComponent(contract_name)}/`
    ))
  },

  /**
   * 全局模糊搜索合同
   * @param params 搜索参数
   * @returns 合同列表响应
   */
  getFuzzySearch: (params: {
    keyword: string
    page?: number
    page_size?: number
  }): Promise<ContractListResponse> => {
    return unwrapResponse(request.get<ContractListResponse>('/assets/contracts/search/', params))
  },

  /**
   * 创建合同
   * @param data 合同创建表单数据
   * @returns 创建的合�?   */
  createContract: (data: ContractCreateForm): Promise<Contract> => {
    return unwrapResponse(request.post<Contract>('/assets/contracts/', data))
  },

  /**
   * 更新合同信息
   * @param data 合同更新表单数据（需包含 contract_code�?   * @returns 更新后的合同
   */
  updateContract: (data: Partial<ContractUpdateForm>): Promise<Contract> => {
    if (!data.contract_code) {
      throw new Error('contract_code is required for update')
    }
    return unwrapResponse(request.put<Contract>(`/assets/contracts/${data.contract_code}/`, data))
  },

  /**
   * 局部更新合同信�?   * @param data 合同更新表单数据（需包含 contract_code�?   * @returns 更新后的合同
   */
  partialUpdateContract: (data: Partial<ContractUpdateForm>): Promise<Contract> => {
    if (!data.contract_code) {
      throw new Error('contract_code is required for update')
    }
    return unwrapResponse(request.patch<Contract>(`/assets/contracts/${data.contract_code}/`, data))
  },

  /**
   * 删除合同
   * @param contract_code 合同编码
   */
  deleteContract: (contract_code: string): Promise<void> => {
    return unwrapResponse(request.delete<void>(`/assets/contracts/${contract_code}/`))
  },

  /**
   * 批量删除合同
   * @param contract_codes 合同编码数组
   * @returns 批量删除结果
   */
  /**
   * 批量删除合同
   * POST /api/assets/contracts/batch-delete/
   * 对应后端 ContractViewSet.batch_delete action
   */
  batchDeleteContracts: (contract_codes: string[]): Promise<BatchDeleteResult> => {
    return unwrapResponse(
      request.post<BatchDeleteResult>('/assets/contracts/batch-delete/', {
        ids: contract_codes,
      }),
    )
  },

  /**
   * 获取合同统计信息
   * @returns 合同统计数据
   */
  getContractStatistics: (): Promise<ContractStats> => {
    return unwrapResponse(request.get<ContractStats>('/assets/contracts/statistics/'))
  },

  /**
   * 添加付款记录
   * @param contract_code 合同编码
   * @param data 付款记录数据
   * @returns 更新后的合同信息
   */
  addPaymentRecord: (contract_code: string, data: { amount: number; description?: string }): Promise<Contract> => {
    return unwrapResponse(request.post<Contract>(`/assets/contracts/${contract_code}/payment_record/`, data))
  },

  /**
   * 更新合同结算状�?   * POST /api/assets/contracts/{contract_code}/update_settlement_status/
   * 对应后端 ContractViewSet.update_settlement_status action
   */
  updateSettlementStatus: (contract_code: string, status: 'pending' | 'settled'): Promise<Contract> => {
    return unwrapResponse(request.post<Contract>(
      `/assets/contracts/${contract_code}/update_settlement_status/`,
      { status }
    ))
  },

  /**
   * 批量创建合同
   * POST /api/assets/contracts/batch-create/
   * 对应后端 ContractViewSet.batch_create action
   * 一次性提交多条合同数据，后端逐条处理并返回成�?失败明细
   */
  batchCreateContracts: (items: ContractCreateForm[]): Promise<ContractBatchCreateResult> => {
    return unwrapResponse(
      request.post<ContractBatchCreateResult>('/assets/contracts/batch-create/', {
        items,
      }),
    )
  },
}
