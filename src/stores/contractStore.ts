/**
 * @file 合同管理 Store，基于 createEntityStore 工厂创建
 * @module stores/contractStore
 * @exports
 *   - useContractStore: 合同管理状态 Store
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
import type { Contract, ContractCreateForm, ContractUpdateForm } from '@/types/contract'
import type { PaginationQuery } from '@/stores/createEntityStore'
import { ElMessage } from 'element-plus'

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
