/**
 * @file 合同管理 Store，基于 createEntityStore 工厂创建
 * @module stores/contractStore
 * @exports
 *   - useContractStore: 合同管理状态 Store
 *   - addPaymentRecord: 添加付款记录
 *   - deletePaymentRecord: 删除付款记录
 *   - approvePaymentRecord: 审核付款记录
 *   - batchCreateContracts: 批量创建合同
 * @callers
 *   - composables/useContractBatchImport.ts
 *   - components/componentsdetails/ContractDetails.vue
 *   - components/componentsdetails/detils/AssetForm.vue
 *   - components/componentsdetails/detils/ContractForm.vue
 *   - components/componentsdetails/detils/ContractBatchImport.vue
 *   - components/componentsdetails/detils/ContractOfDetails.vue
 *   - components/componentsdetails/detils/DamagedAssetForm.vue
 *   - components/componentsdetails/detils/WasteAssetForm.vue
 * @dependsOn
 *   - api/contract: 合同 API 接口
 *   - stores/createEntityStore: 实体 Store 工厂
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { contractAPI } from '@/api/contract'
import type { ContractBatchCreateResult, PaymentRecordResponse } from '@/api/contract'
import type { Contract, ContractCreateForm, ContractUpdateForm } from '@/types/contract'
import type { PaginationQuery } from '@/stores/createEntityStore'
import { ElMessage } from 'element-plus'

export type { ContractBatchCreateResult, PaymentRecordResponse } from '@/api/contract'

/**
 * 合同 Store
 */
export const useContractStore = createEntityStore<Contract, PaginationQuery>('contract', {
  idKey: 'recordcode',
  nameField: 'contract_name',
  displayName: '合同',
  api: {
    getList: async (params?: PaginationQuery) => {
      const safeParams: PaginationQuery = params || {
        page: 1,
        page_size: 20,
      }
      const response = await contractAPI.getContracts(safeParams)
      return {
        count: response.count,
        next: response.next,
        previous: response.previous,
        results: response.results as Contract[],
      }
    },
    getById: (code) => contractAPI.getContractByRecordcode(code),
    getByName: async (name) => {
      const response = await contractAPI.getContractByName(name)
      return response.results as Contract[]
    },
    create: (data) => contractAPI.createContract(data as ContractCreateForm),
    update: (data) =>
      contractAPI.updateContract(data as ContractUpdateForm & { recordcode?: string }),
    delete: (code) => contractAPI.deleteContract(code),
    batchDelete: (codes) => contractAPI.batchDeleteContracts(codes),
  },
  message: ElMessage,
  idToString: (id) => String(id),
  autoSync: true,
  enablePagination: true,
  defaultPageSize: 20,
  enableCache: false,
  cacheTTL: 5 * 60 * 1000,
})

// ==================== 支付记录扩展方法 ====================

/**
 * 添加付款记录
 * @param recordcode 合同 recordcode
 * @param data 付款记录数据（金额、说明）
 * @returns 更新后的合同与支付记录
 */
export const addPaymentRecord = (
  recordcode: string,
  data: { amount: number; description?: string },
): Promise<PaymentRecordResponse> => {
  return contractAPI.addPaymentRecord(recordcode, data)
}

/**
 * 删除付款记录（软删除）
 * @param recordcode 合同 recordcode
 * @param paymentId 支付记录 ID
 * @returns 更新后的合同与支付记录
 */
export const deletePaymentRecord = (
  recordcode: string,
  paymentId: string,
): Promise<PaymentRecordResponse> => {
  return contractAPI.deletePaymentRecord(recordcode, paymentId)
}

/**
 * 审核付款记录
 * @param recordcode 合同 recordcode
 * @param paymentId 支付记录 ID
 * @returns 更新后的合同与支付记录
 */
export const approvePaymentRecord = (
  recordcode: string,
  paymentId: string,
): Promise<PaymentRecordResponse> => {
  return contractAPI.approvePaymentRecord(recordcode, paymentId)
}

/**
 * 批量创建合同
 * @param items 待创建的合同列表
 * @returns 批量创建结果（含成功/失败明细）
 */
export const batchCreateContracts = (
  items: ContractCreateForm[],
): Promise<ContractBatchCreateResult> => {
  return contractAPI.batchCreateContracts(items)
}
