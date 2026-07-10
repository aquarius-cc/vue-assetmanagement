/**
 * 合同管理 Store
 * 基于 createEntityStore 工厂创建
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
  idKey: 'contract_code',
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
    getById: (code) => contractAPI.getContractByCodeOrId(code),
    getByName: async (name) => {
      const response = await contractAPI.getContractByName(name)
      return response.results as Contract[]
    },
    create: (data) => contractAPI.createContract(data as ContractCreateForm),
    update: (data) => contractAPI.updateContract(data as ContractUpdateForm),
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
