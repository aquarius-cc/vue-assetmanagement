// composables/useAssetFormHelpers.ts
import { ref, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { AssetType } from '@/utils/AssetType'
import type { Contract } from '@/types/contract'
import type { Storage } from '@/utils/Storage'
import type { PaginationQuery } from '@/stores/createEntityStore'

// 向后兼容：useEmployeeLinkage 已拆分至独立文件
export { useEmployeeLinkage } from './useEmployeeLinkage'

// ======================== 公共类型 ========================

/** 自动完成建议项基础类型 */
interface SuggestionItem {
  value: string
}

/** 合同建议 */
export interface ContractSuggestion extends SuggestionItem {
  contract_name: string
  contract_code: string
  recordcode: string
}

/** 用户建议 */
export interface UserSuggestion extends SuggestionItem {
  user_name: string
  user_jobcode: string
  department_name: string
}

// ======================== 基础关联数据加载 ========================

export function useAssetFormAssociations(
  assetTypeStore: { getList: (params?: PaginationQuery) => Promise<AssetType[]> },
  contractStore: { getList: (params?: PaginationQuery) => Promise<Contract[]> },
  storageStore: { getList: (params?: PaginationQuery) => Promise<Storage[]> },
) {
  const assetTypes = ref<AssetType[]>([]) as Ref<AssetType[]>
  const contracts = ref<Contract[]>([]) as Ref<Contract[]>
  const storages = ref<Storage[]>([]) as Ref<Storage[]>

  const loadAssociations = async () => {
    try {
      const [types, contractList, storageList] = await Promise.all([
        assetTypeStore.getList({ page: 1, page_size: 100 }),
        contractStore.getList({ page: 1, page_size: 100 }),
        storageStore.getList({ page: 1, page_size: 100 }),
      ])
      assetTypes.value = types
      contracts.value = contractList
      storages.value = storageList
    } catch {
      ElMessage.error('获取基础数据失败')
    }
  }

  return { assetTypes, contracts, storages, loadAssociations }
}

// ======================== 合同/仓库联动方法 ========================

export function useAssetFormAssociationMethods(
  contracts: Ref<readonly Contract[]>,
  storages: Ref<readonly Storage[]>,
  getContractByName: (name: string) => Promise<Contract[]>,
  onContractUpdate: (name: string, code: string) => void,
  onStorageCodeUpdate: (code: string) => void,
) {
  /** 合同自动完成 */
  const fetchContractSuggestions = async (
    queryString: string,
    cb: (results: ContractSuggestion[]) => void,
  ) => {
    if (!queryString) {
      cb([])
      return
    }
    try {
      const results = await getContractByName(queryString)
      const suggestions: ContractSuggestion[] = results.map((c) => ({
        value: c.contract_name,
        contract_name: c.contract_name,
        contract_code: c.contract_code,
        recordcode: c.recordcode,
      }))
      cb(suggestions)
    } catch {
      cb([])
    }
  }

  /** 合同选中 */
  const handleContractSelect = (item: ContractSuggestion) => {
    onContractUpdate(item.contract_name, item.contract_code)
  }

  /** 合同名变更 */
  const handleContractNameChange = (name: string) => {
    if (!name) {
      onContractUpdate('', '')
      return
    }
    const selected = contracts.value.find((c) => c.contract_name === name)
    if (selected) {
      onContractUpdate(selected.contract_name, selected.contract_code)
    } else {
      onContractUpdate(name, '')
    }
  }

  /** 合同编码变更 */
  const handleContractCodeChange = (code: string) => {
    if (!code) {
      onContractUpdate('', '')
      return
    }
    const selected = contracts.value.find((c) => c.contract_code === code)
    if (selected) {
      onContractUpdate(selected.contract_name, selected.contract_code)
    } else {
      onContractUpdate('', code)
    }
  }

  /** 仓库变更 */
  const handleStorageNameChange = (name: string) => {
    if (!name) {
      onStorageCodeUpdate('')
      return
    }
    const selected = storages.value.find((s) => s.storage_name === name)
    onStorageCodeUpdate(selected?.storage_code ?? '')
  }

  return {
    fetchContractSuggestions,
    handleContractSelect,
    handleContractNameChange,
    handleContractCodeChange,
    handleStorageNameChange,
  }
}
