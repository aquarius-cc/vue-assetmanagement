/**
 * @file 合同管理 API，提供合同的增删改查、统计、批量操作等接口
 * @module api/contract
 * @exports
 *   - contractAPI: 合同管理 API 对象（包含所有合同相关方法）
 *   - ContractBatchCreateResult: 批量创建合同响应类型
 * @callers
 *   - stores/contractStore: 合同状态管理
 *   - composables/useContractBatchImport: 合同批量导入
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/contract: 合同相关类型定义
 *   - stores/createEntityStore: 批量删除结果类型
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  Contract,
  ContractCreateForm,
  ContractUpdateForm,
  ContractListResponse,
  ContractStats,
  ContractQueryParams,
  PaidRecord,
} from '@/types/contract'
import type { BatchDeleteResult } from '@/stores/createEntityStore'

/**
 * 批量创建合同响应
 * 对应后端 ContractViewSet.batch_create action 返回格式
 * fail_items 格式与后端BatchOperationMixin.batch_execute 对齐
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
 * 支付记录操作响应
 * 对应后端 payment_record/delete/approve action 返回格式
 */
export interface PaymentRecordResponse {
  contract: Contract
  paid_record: PaidRecord
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
   * 根据 recordcode 获取合同详情（启用缓存）
   * @param recordcode 合同 recordcode
   * @returns 合同详情
   */
  getContractByRecordcode: (recordcode: string): Promise<Contract> => {
    return unwrapResponse(
      request.get<Contract>(`/assets/contracts/${recordcode}/`, undefined, true, 300000),
    )
  },

  /**
   * 按名称搜索合同
   * GET /api/assets/contracts/getcontractByname/{name}/
   * 对应后端 ContractViewSet.getcontractByname action
   */
  getContractByName: (contract_name: string): Promise<ContractListResponse> => {
    return unwrapResponse(
      request.get<ContractListResponse>(
        `/assets/contracts/getcontractByname/${encodeURIComponent(contract_name)}/`,
      ),
    )
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
   * @returns 创建的合同
   */
  createContract: (data: ContractCreateForm): Promise<Contract> => {
    return unwrapResponse(request.post<Contract>('/assets/contracts/', data))
  },

  /**
   * 更新合同信息
   * @param data 合同更新表单数据（需包含 contract_code）
   * @returns 更新后的合同
   */
  updateContract: (
    data: Partial<ContractUpdateForm> & { recordcode?: string },
  ): Promise<Contract> => {
    const recordcode = data.recordcode
    if (!recordcode) {
      throw new Error('recordcode is required for update')
    }
    return unwrapResponse(request.put<Contract>(`/assets/contracts/${recordcode}/`, data))
  },

  /**
   * 局部更新合同信息
   * @param data 合同更新表单数据（需包含 contract_code）
   * @returns 更新后的合同
   */
  partialUpdateContract: (
    data: Partial<ContractUpdateForm> & { recordcode?: string },
  ): Promise<Contract> => {
    const recordcode = data.recordcode
    if (!recordcode) {
      throw new Error('recordcode is required for update')
    }
    return unwrapResponse(request.patch<Contract>(`/assets/contracts/${recordcode}/`, data))
  },

  /**
   * 删除合同
   * @param recordcode 合同 recordcode
   */
  deleteContract: (recordcode: string): Promise<void> => {
    return unwrapResponse(request.delete<void>(`/assets/contracts/${recordcode}/`))
  },

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
   * POST /api/assets/contracts/{recordcode}/payment_record/
   * 对应后端 ContractViewSet.payment_record action
   * @param recordcode 合同 recordcode
   * @param data 付款记录数据
   * @returns 更新后的合同和支付记录
   */
  addPaymentRecord: (
    recordcode: string,
    data: { amount: number; description?: string },
  ): Promise<PaymentRecordResponse> => {
    return unwrapResponse(
      request.post<PaymentRecordResponse>(`/assets/contracts/${recordcode}/payment_record/`, data),
    )
  },

  /**
   * 删除支付记录（软删除）
   * POST /api/assets/contracts/{recordcode}/payment_record/{paymentId}/delete/
   * 对应后端 ContractViewSet.delete_payment action
   * @param recordcode 合同 recordcode
   * @param paymentId 支付记录 ID
   * @returns 更新后的合同和支付记录
   */
  deletePaymentRecord: (recordcode: string, paymentId: string): Promise<PaymentRecordResponse> => {
    return unwrapResponse(
      request.post<PaymentRecordResponse>(
        `/assets/contracts/${recordcode}/payment_record/${paymentId}/delete/`,
      ),
    )
  },

  /**
   * 审核支付记录
   * POST /api/assets/contracts/{recordcode}/payment_record/{paymentId}/approve/
   * 对应后端 ContractViewSet.approve_payment action
   * @param recordcode 合同 recordcode
   * @param paymentId 支付记录 ID
   * @returns 更新后的合同和支付记录
   */
  approvePaymentRecord: (recordcode: string, paymentId: string): Promise<PaymentRecordResponse> => {
    return unwrapResponse(
      request.post<PaymentRecordResponse>(
        `/assets/contracts/${recordcode}/payment_record/${paymentId}/approve/`,
      ),
    )
  },

  /**
   * 更新合同结算状态
   * POST /api/assets/contracts/{recordcode}/update_settlement_status/
   * 对应后端 ContractViewSet.update_settlement_status action
   */
  updateSettlementStatus: (
    recordcode: string,
    status: 'pending' | 'settled',
  ): Promise<Contract> => {
    return unwrapResponse(
      request.post<Contract>(`/assets/contracts/${recordcode}/update_settlement_status/`, {
        status,
      }),
    )
  },

  /**
   * 批量创建合同
   * POST /api/assets/contracts/batch-create/
   * 对应后端 ContractViewSet.batch_create action
   * 一次性提交多条合同数据，后端逐条处理并返回成功失败明细
   */
  batchCreateContracts: (items: ContractCreateForm[]): Promise<ContractBatchCreateResult> => {
    return unwrapResponse(
      request.post<ContractBatchCreateResult>('/assets/contracts/batch-create/', {
        items,
      }),
    )
  },
}
