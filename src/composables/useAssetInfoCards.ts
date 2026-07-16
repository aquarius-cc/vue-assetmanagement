/**
 * useAssetInfoCards.ts
 * 资产详情页面卡片配置 composable
 *
 * 基础卡片（基本信息/类型/合同/录入人）在此文件定义。
 * 扩展卡片（申请人/保管人/仓库/描述）已拆分至 useAssetExtendedInfoCards.ts。
 */

import { computed } from 'vue'
import type { Ref } from 'vue'
import type { AssetDetail } from '@/types/asset'
import type { InfoCardConfig } from '@/types/info-card'
import {
  formatDate,
  formatNumber,
  getStatusDisplay,
  contractTypeMapping,
  contractSettlementStatusMapping,
} from '@/utils/Format'

// 向后兼容：扩展卡片通过 re-export 保持原有 API
export { useAssetExtendedInfoCards } from './useAssetExtendedInfoCards'
import { useAssetExtendedInfoCards } from './useAssetExtendedInfoCards'

export function useAssetInfoCards(assetDetail: Ref<AssetDetail | null>) {
  // ===== 基本信息卡片 =====
  const basicInfoCard = computed<InfoCardConfig>(() => {
    const asset = assetDetail.value
    return {
      title: '基本信息',
      icon: 'Document',
      fields: [
        [
          { label: '资产编码', value: asset?.asset_code },
          { label: '资产名称', value: asset?.asset_name },
          { label: '品牌', value: asset?.asset_brand },
        ],
        [
          {
            label: '资产单价',
            value: asset?.asset_purchase_price,
            isPrice: true,
            formatter: (v: unknown) => `¥${formatNumber(v as string | number)}`,
          },
          {
            label: '当前状态',
            value: asset?.asset_current_status,
            formatter: (v: unknown) => getStatusDisplay(v as string | undefined),
          },
          { label: '资产型号', value: asset?.asset_specification },
        ],
      ],
    }
  })

  // ===== 资产类型卡片 =====
  const assetTypeCard = computed<InfoCardConfig>(() => {
    const type = assetDetail.value?.asset_type
    return {
      title: '资产类型',
      icon: 'Document',
      visible: !!type,
      fields: [
        [{ label: '类型编码', value: type?.type_code }],
        [{ label: '类型名称', value: type?.type_name }],
      ],
    }
  })

  // ===== 合同信息卡片 =====
  const contractCard = computed<InfoCardConfig>(() => {
    const contract = assetDetail.value?.asset_contract
    return {
      title: '合同信息',
      icon: 'Tickets',
      visible: !!contract,
      fields: [
        [{ label: '合同编码', value: contract?.contract_code }],
        [{ label: '合同名称', value: contract?.contract_name }],
        [
          {
            label: '合同类型',
            value: contract?.contract_type,
            formatter: (v) => contractTypeMapping[v as string] ?? String(v ?? ''),
          },
          { label: '供应商', value: contract?.contract_supplier },
        ],
        [
          {
            label: '合同金额',
            value: contract?.contract_price,
            isPrice: true,
            formatter: (v: unknown) => `¥${formatNumber(v as string | number)}`,
          },
          {
            label: '签订日期',
            value: contract?.contract_signing_date,
            formatter: (v) => formatDate(v as string) ?? '',
          },
          {
            label: '结算状态',
            value: contract?.contract_settledment_status,
            formatter: (v) => contractSettlementStatusMapping[v as string] ?? String(v ?? ''),
          },
        ],
      ],
    }
  })

  // ===== 录入人信息卡片 =====
  const entryPersonCard = computed<InfoCardConfig>(() => {
    const person = assetDetail.value?.asset_entry_person
    return {
      title: '录入人信息',
      icon: 'User',
      visible: !!person,
      fields: [
        [{ label: '录入人工号', value: person?.employee_jobcode }],
        [{ label: '录入人姓名', value: person?.employee_name }],
      ],
    }
  })

  // ===== 合并扩展卡片 =====
  const { applicantCard, managerCard, storageCard, descriptionCard } =
    useAssetExtendedInfoCards(assetDetail)

  return {
    basicInfoCard,
    assetTypeCard,
    contractCard,
    entryPersonCard,
    applicantCard,
    managerCard,
    storageCard,
    descriptionCard,
  }
}
