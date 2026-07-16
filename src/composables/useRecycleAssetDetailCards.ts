/**
 * useRecycleAssetDetailCards.ts
 * 回收资产详情卡片配置 composable
 *
 * @module composables/useRecycleAssetDetailCards
 * @description 根据回收资产详情数据及其关联数据，生戀5 一InfoCardConfig 配置对象＀ * 用于驱动 InfoCard 组件展示基本信息、合同信息、使用人信息、回收人信息、仓库信息　 */

import { computed, type Ref } from 'vue'
import type { InfoCardConfig } from '@/types/info-card'
import type { RecycleAssetExtended } from '@/utils/RecycleAsset'
import type { EmployeeExtended } from '@/utils/User'
import type { Contract } from '@/types/contract'
import type { Storage } from '@/utils/Storage'
import { formatDate } from '@/utils/Format'
// import { userAPI } from '@/api'

/**
 * 回收资产详情卡片数据満 *
 * @description 包含回收资产主详情及其关联数据（合同、回收人、仓库）
 * 【v1.1.0 对齐】移陀usingPerson（后端已删除 recycle_asset_using_person_jobcode），
 * 使用人信息通过序列化器 FK 链自动返回（detail.using_person_name / detail.using_person_jobcode＀ */
export interface RecycleAssetDetailCardData {
  /** 回收资产主详惀*/
  detail: RecycleAssetExtended | null
  /** 通过 assetAPI.getContractByAssetCode(recycle_asset) 获取 */
  contractDetail: Contract | null
  /** 通过 userStore.getById(recycle_asset_recycle_person_jobcode) 获取 */
  recyclePerson: EmployeeExtended | null
  /** 通过 storageStore.getById(recycle_asset_storage_code) 获取 */
  storageDetail: Storage | null
}

/**
 * 回收资产详情卡片配置 composable
 *
 * @description
 * 接收回收资产详情数据源，返回 5 个计算属性（InfoCardConfig）：
 * - basicInfoConfig: 基本信息卡片＀ 个字段，双列布局＀ * - contractInfoConfig: 合同信息卡片＀ 个字段，双列布局＀ * - usingPersonInfoConfig: 使用人信息卡片（2 个字段，单列布局＀ * - recyclePersonInfoConfig: 回收人信息卡片（2 个字段，单列布局＀ * - storageInfoConfig: 仓库信息卡片＀ 个字段，双列布局＀ *
 * @param data - 响应式数据源，包吀detail、contractDetail、usingPerson、recyclePerson、storageDetail
 * @returns 5 一InfoCardConfig 计算属态 *
 * @example
 * ```ts
 * const cardData = computed(() => ({
 *   detail: detailData.value,
 *   contractDetail: contractDetail.value,
 *   usingPerson: usingPerson.value,
 *   recyclePerson: recyclePerson.value,
 *   storageDetail: storageDetail.value,
 * }))
 * const { basicInfoConfig, contractInfoConfig, usingPersonInfoConfig, recyclePersonInfoConfig, storageInfoConfig }
 *   = useRecycleAssetDetailCards(cardData)
 * ```
 */
export function useRecycleAssetDetailCards(data: Ref<RecycleAssetDetailCardData>) {
  /**
   * 基本信息卡片配置
   *
   * 包含 8 个字段，双列网格布局＀   * - 左列：ID、资产编码、资产名称、规格型号   * - 右列：回收时间、回收数量、回收描述、出库记录编码   */
  const basicInfoConfig = computed<InfoCardConfig>(() => {
    const d = data.value.detail
    return {
      title: '基本信息',
      icon: 'Document',
      fields: [
        [
          { label: '回收标识码', value: d?.recordcode, defaultValue: 'N/A' },
          { label: '出库标识码', value: d?.outasset_recordcode, defaultValue: 'N/A' },
          { label: '资产码', value: d?.asset?.asset_code, defaultValue: 'N/A' },
          { label: '资产名称', value: d?.asset?.asset_name, defaultValue: 'N/A' },
          { label: '规格型号', value: d?.asset?.asset_specification, defaultValue: 'N/A' },
        ],
        [
          {
            label: '回收时间',
            value: d?.recycle_asset_date,
            formatter: (v) => formatDate(v as string) ?? '',
          },
          { label: '回收数量', value: d?.recycle_asset_number },
          { label: '回收描述', value: d?.recycle_asset_description, defaultValue: 'N/A' },
          { label: '出库记录编码', value: d?.outasset_recordcode, defaultValue: 'N/A' },
        ],
      ],
    }
  })

  /**
   * 合同信息卡片配置
   *
   * 包含 8 个字段，双列网格布局＀   * - 左列：合同编码、合同名称、合同金额、合同供应商
   * - 右列：签订日期、保修期、初验日期、终验日最   * 数据来源：通过 assetAPI.getContractByAssetCode 直接获取皀Contract 对象
   */
  const contractInfoConfig = computed<InfoCardConfig>(() => {
    const c = data.value.detail?.asset?.asset_contract
    return {
      title: '合同信息',
      icon: 'Tickets',
      fields: [
        [
          { label: '合同编码', value: c?.contract_code, defaultValue: 'N/A' },
          { label: '合同名称', value: c?.contract_name, defaultValue: 'N/A' },
          { label: '合同金额', value: c?.contract_price, isPrice: true },
          { label: '合同供应商', value: c?.contract_supplier, defaultValue: 'N/A' },
        ],
        [
          {
            label: '签订日期',
            value: c?.contract_signing_date,
            formatter: (v) => formatDate(v as string) ?? '',
          },
          {
            label: '保修期',
            value: c?.contract_warranty_period,
            formatter: (v) => (v !== null && v !== undefined ? `${v} 年` : ''),
          },
          {
            label: '初验日期',
            value: c?.contract_preliminary_acceptance_date,
            formatter: (v) => formatDate(v as string) ?? '',
          },
          {
            label: '终验日期',
            value: c?.contract_final_acceptance_date,
            formatter: (v) => formatDate(v as string) ?? '',
          },
        ],
      ],
    }
  })

  /**
   * 使用人信息卡片配置   *
   * 包含 2 个字段，单列布局：使用人姓名、使用人工号
   * 【v1.1.0 对齐】数据来源改一detail 中的 read_only 字段（using_person_name / using_person_jobcode），
   * 后端通过 FK 链自动获取：outasset_recordcode ↀoutasset_code ↀasset_applicant_jobcode
   */
  const usingPersonInfoConfig = computed<InfoCardConfig>(() => {
    const d = data.value.detail?.asset?.asset_manager
    return {
      title: '使用人信息',
      icon: 'User',
      fields: [
        [{ label: '使用人', value: d?.employee_name, defaultValue: 'N/A' }],
        [{ label: '使用人工号', value: d?.employee_jobcode, defaultValue: 'N/A' }],
        [
          {
            label: '使用人部闀',
            value: d?.employee_department?.department_name,
            defaultValue: 'N/A',
          },
        ],
      ],
    }
  })

  /**
   * 回收人信息卡片配置   *
   * 包含 2 个字段，单列布局：回收人（姓吀部门）、回收人工号
   * 数据来源：通过 userStore.getById 获取皀EmployeeExtended 对象
   */
  const recyclePersonInfoConfig = computed<InfoCardConfig>(() => {
    const d = data.value.detail
    return {
      title: '回收人信息',
      icon: 'UserFilled',
      fields: [
        [
          {
            label: '回收人姓名',
            value: d?.recycle_person_name,
            defaultValue: 'N/A',
          },
        ],
        [{ label: '回收人工号', value: d?.recycle_person_jobcode, defaultValue: 'N/A' }],
        [{ label: '回收人部闀', value: d?.recycle_person_department, defaultValue: 'N/A' }],
      ],
    }
  })

  /**
   * 仓库信息卡片配置
   *
   * 包含 5 个字段，双列网格布局＀   * - 左列：仓库编码、仓库名称、仓库地址
   * - 右列：仓库类型、仓库描迀   * 数据来源：通过 storageStore.getById 获取皀Storage 对象
   */
  const storageInfoConfig = computed<InfoCardConfig>(() => {
    const s = data.value.detail?.asset?.asset_storage
    return {
      title: '仓库信息',
      icon: 'Location',
      fields: [
        [
          { label: '仓库编码', value: s?.storage_code, defaultValue: 'N/A' },
          { label: '仓库名称', value: s?.storage_name, defaultValue: 'N/A' },
          { label: '仓库地址', value: s?.storage_address, defaultValue: 'N/A' },
        ],
        [
          { label: '仓库类型', value: s?.storage_type, defaultValue: 'N/A' },
          { label: '仓库描述', value: s?.storage_description, defaultValue: 'N/A' },
        ],
      ],
    }
  })

  return {
    basicInfoConfig,
    contractInfoConfig,
    usingPersonInfoConfig,
    recyclePersonInfoConfig,
    storageInfoConfig,
  }
}
