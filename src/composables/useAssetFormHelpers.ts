// composables/useAssetFormHelpers.ts
import { ref, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { AssetType } from '@/utils/AssetType'
import type { Contract } from '@/types/contract'
import type { Storage } from '@/utils/Storage'
import type { PaginationQuery } from '@/stores/createEntityStore'

// ======================== 公共类型 ========================

/** 自动完成建议项基础类型 */
interface SuggestionItem {
  value: string
}

/** 合同建议页*/
export interface ContractSuggestion extends SuggestionItem {
  contract_name: string
  contract_code: string
  recordcode: string
}

/** 用户建议页*/
export interface UserSuggestion extends SuggestionItem {
  user_name: string
  user_jobcode: string
  department_name: string
}

/** 用户基本数据结构（用于联动回调） */
interface EmployeeData {
  employee_name: string
  employee_jobcode: string
  employee_department_name?: string | null
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

  /** 合同名变曀*/
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

// ======================== 姓名/工号联动（通用＀========================

export function useEmployeeLinkage(
  getUserByName: (name: string) => Promise<EmployeeData[]>,
  getUserByCode: (code: string) => Promise<EmployeeData | null>,
  onUpdate: (name: string, code: string) => void,
) {
  const selectFlag = ref(true)

  /** 自动完成建议 */
  const fetchSuggestions = async (
    queryString: string,
    cb: (results: UserSuggestion[]) => void,
  ) => {
    if (!queryString) {
      cb([])
      return
    }
    try {
      const users = await getUserByName(queryString)
      const suggestions: UserSuggestion[] = users.map((u) => ({
        value: u.employee_name,
        user_name: u.employee_name,
        user_jobcode: u.employee_jobcode,
        department_name: u.employee_department_name ?? '',
      }))
      cb(suggestions)
    } catch {
      cb([])
    }
  }

  /** 选中建议页*/
  const handleSelect = (item: UserSuggestion) => {
    selectFlag.value = false
    onUpdate(item.user_name, item.user_jobcode)
  }

  /** 姓名输入变更 */
  const handleNameChange = async (name: string) => {
    if (!selectFlag.value) {
      selectFlag.value = true
      return
    }
    if (!name.trim()) {
      onUpdate('', '')
      return
    }
    try {
      const users = await getUserByName(name)
      if (users.length > 1) {
        const codes = users.map((u) => u.employee_jobcode).join(', ')
        onUpdate(name, `${codes} (请选择一个正确工号`)
      } else if (users.length === 1) {
        onUpdate(users[0].employee_name, users[0].employee_jobcode)
      } else {
        onUpdate(name, '姓名错误，无对应工号')
      }
    } catch {
      onUpdate(name, '查询失败，无法验证工号')
    }
  }

  /** 工号变更 */
  const handleCodeChange = async (code: string) => {
    if (!code) {
      onUpdate('', '')
      return
    }
    try {
      const user = await getUserByCode(code)
      if (user) {
        onUpdate(user.employee_name ?? '', user.employee_jobcode)
      } else {
        onUpdate('工号错误，无对应姓名', code)
      }
    } catch {
      onUpdate('查询失败', code)
    }
  }

  return { fetchSuggestions, handleSelect, handleNameChange, handleCodeChange }
}
