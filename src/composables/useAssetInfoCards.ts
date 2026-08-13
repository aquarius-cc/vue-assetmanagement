/**
 * @file 资产详情页面卡片配置（基础 + 扩展），驱动生成 InfoCard 组件
 * @module composables/useAssetInfoCards
 * @exports
 *   - useAssetInfoCards: 生成资产详情全部卡片配置（8 张卡片）
 *   - useAssetExtendedInfoCards: 扩展卡片配置（re-export）
 * @callers
 *   - components/componentsdetails/detils/BasicAssetDetails.vue
 * @dependsOn
 *   - types/asset: 资产详情类型
 *   - types/info-card: 卡片配置类型
 *   - utils/Format: 日期/数字格式化、状态/合同类型映射
 *   - composables/useAssetExtendedInfoCards: 扩展卡片组合
 */
import { computed } from 'vue'
import type { Ref } from 'vue'
import type { AssetDetail } from '@/types/asset'
import type { InfoCardConfig } from '@/types/info-card'
import { formatDate, formatNumber, getStatusDisplay, contractTypeMapping } from '@/utils/Format'

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
          { label: '供应商', value: contract?.supplier_name },
        ],
        [
          {
            label: '合同金额',
            value: contract?.contract_amount,
            isPrice: true,
            formatter: (v: unknown) => `¥${formatNumber(v as string | number)}`,
          },
          {
            label: '签订日期',
            value: contract?.contract_start_date,
            formatter: (v) => formatDate(v as string) ?? '',
          },
          {
            label: '合同状态',
            value: contract?.contract_status,
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
