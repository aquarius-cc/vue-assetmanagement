/**
 * useOutAssetDetailCards.ts
 * 出库资产详情卡片配置 composable
 *
 * @module composables/useOutAssetDetailCards
 * @description 根据出库资产详情数据，生戀4 一InfoCardConfig 配置对象＀ * 用于驱动 InfoCard 组件展示基本信息、合同信息、申请人信息、保管人信息　 */

import { computed, type Ref } from 'vue'
import type { InfoCardConfig } from '@/types/info-card'
import type { OutAssetDetail } from '@/utils/OutAsset'
import type { EmployeeExtended } from '@/utils/User'
import type { AssetDetail } from '@/types/asset'
import { formatDate, outassetStatusMapping, outassetTypeMapping } from '@/utils/Format'

/**
 * 出库资产详情卡片数据満 *
 * @description 包含出库资产主详情及其关联数据（申请人、保管人、合同）
 */
export interface OutAssetDetailCardData {
  /** 出库资产主详惀*/
  detail: OutAssetDetail | null
  /** 申请人详细信息*/
  applicantUser: EmployeeExtended | null
  /** 保管人详细信息*/
  managerUser: EmployeeExtended | null
  /** 关联资产（含合同信息＀*/
  assetContract: AssetDetail | null
}

/**
 * 获取资产状态文最 *
 * @param value 状态值（妀'in_use', 'returned' 等）
 * @returns 可读的中文状态，空值返囀'未知'
 */
const getOutAssetStatusText = (value: string | null | undefined): string => {
  if (!value) return '未知'
  return outassetStatusMapping[value] || value
}

/**
 * 获取出库类型文本
 *
 * @param value 类型值（妀'normal', 'scrap' 等）
 * @returns 可读的中文类型，空值返囀'未知'
 */
const getOutAssetTypeText = (value: string | null | undefined): string => {
  if (!value) return '未知'
  return outassetTypeMapping[value] || value
}

/**
 * 出库资产详情卡片配置 composable
 *
 * @description
 * 接收出库资产详情数据源，返回 4 个计算属性（InfoCardConfig）：
 * - basicInfoConfig: 基本信息卡片＀1 个字段，双列布局＀ * - contractInfoConfig: 合同信息卡片＀ 个字段，单列布局＀ * - applicantInfoConfig: 申请人信息卡片（2 个字段，单列布局＀ * - managerInfoConfig: 保管人信息卡片（2 个字段，单列布局＀ *
 * @param data - 响应式数据源，包吀detail、applicantUser、managerUser、assetContract
 * @returns 4 一InfoCardConfig 计算属态 *
 * @example
 * ```ts
 * const cardData = computed(() => ({
 *   detail: showOutAssetDetails.value,
 *   applicantUser: applicantUser.value,
 *   managerUser: managerUser.value,
 *   assetContract: assetContract.value,
 * }))
 * const { basicInfoConfig, contractInfoConfig, applicantInfoConfig, managerInfoConfig }
 *   = useOutAssetDetailCards(cardData)
 * ```
 */

export function useOutAssetDetailCards(data: Ref<OutAssetDetailCardData>) {
  /**
   * 基本信息卡片配置
   *
   * 包含 11 个字段，双列网格布局＀   * - 左列：ID、出库唯一标识码、资产码、出库时间、资产状态、使用地点   * - 右列：资产名称、规格型号、归还日期、出库类型、备注描迀   */
  const basicInfoConfig = computed<InfoCardConfig>(() => {
    const d = data.value.detail
    return {
      title: '基本信息',
      icon: 'Document',
      fields: [
        [
          { label: '出库唯一标识码', value: d?.recordcode, defaultValue: 'N/A' },
          { label: '入库唯一标识码', value: d?.asset_recordcode, defaultValue: 'N/A' },
          { label: '资产码', value: d?.asset_code },
          {
            label: '出库时间',
            value: d?.outasset_date,
            formatter: (v) => formatDate(v as string) ?? '',
          },
          {
            label: '资产状态',
            value: d?.outasset_current_status,
            formatter: (v) => getOutAssetStatusText(v as string),
          },
          { label: '使用地点', value: d?.using_location, defaultValue: 'N/A' },
        ],
        [
          { label: '资产名称', value: d?.asset_name, defaultValue: 'N/A' },
          { label: '规格型号', value: d?.asset_specification, defaultValue: 'N/A' },
          {
            label: '归还日期',
            value: d?.return_date,
            formatter: (v) => formatDate(v as string) ?? '',
          },
          {
            label: '出库类型',
            value: d?.outasset_type,
            formatter: (v) => getOutAssetTypeText(v as string),
          },
          { label: '备注描述', value: d?.outasset_description, defaultValue: 'N/A' },
        ],
      ],
    }
  })

  /**
   * 合同信息卡片配置
   *
   * 包含 2 个字段，单列布局：所在合同号、所在合同名称   */
  const contractInfoConfig = computed<InfoCardConfig>(() => {
    const c = data.value.detail?.contract
    return {
      title: '合同信息',
      icon: 'Tickets',
      fields: [
        [
          { label: '所在合同号', value: c?.contract_code, defaultValue: 'N/A' },
          { label: '供应商', value: c?.contract_supplier, defaultValue: 'N/A' },
        ],
        [
          { label: '所在合同名称', value: c?.contract_name, defaultValue: 'N/A' },
          { label: '合同总价', value: c?.contract_price, defaultValue: 'N/A' },
        ],
      ],
    }
  })

  /**
   * 申请人信息卡片配置   *
   * 包含 2 个字段，单列布局：申请人（姓吀部门）、申请人工号
   */
  const applicantInfoConfig = computed<InfoCardConfig>(() => {
    // const u = data.value.detail?.outasset_applicant
    const d = data.value.detail
    return {
      title: '申请人信息',
      icon: 'User',
      fields: [
        [
          {
            label: '部门',
            value: d?.outasset_applicant?.employee_department_name,
            defaultValue: 'N/A',
          },
        ],
        [
          {
            label: '申请人',
            value:
              d?.outasset_applicant?.employee_name &&
              d?.outasset_applicant?.employee_department_name
                ? `${d.outasset_applicant.employee_name}`
                : null,
            defaultValue: 'N/A',
          },
        ],
        [
          {
            label: '申请人工号',
            value:
              d?.outasset_applicant?.employee_jobcode || d?.outasset_applicant?.employee_jobcode,
            defaultValue: 'N/A',
          },
        ],
      ],
    }
  })

  /**
   * 保管人信息卡片配置   *
   * 包含 2 个字段，单列布局：保管人（姓吀部门）、保管人工号
   */
  const managerInfoConfig = computed<InfoCardConfig>(() => {
    // const u = data.value.managerUser
    const d = data.value.detail
    return {
      title: '保管人信息',
      icon: 'UserFilled',
      fields: [
        [
          {
            label: '部门',
            value: d?.outasset_manager?.employee_department_name,
            defaultValue: 'N/A',
          },
        ],
        [
          {
            label: '保管人',
            value:
              d?.outasset_manager?.employee_name && d?.outasset_manager?.employee_department_name
                ? `${d.outasset_manager.employee_name}`
                : null,
            defaultValue: 'N/A',
          },
        ],
        [
          {
            label: '保管人工号',
            value: d?.outasset_manager?.employee_jobcode || d?.outasset_manager?.employee_jobcode,
            defaultValue: 'N/A',
          },
        ],
      ],
    }
  })

  return {
    basicInfoConfig,
    contractInfoConfig,
    applicantInfoConfig,
    managerInfoConfig,
  }
}
