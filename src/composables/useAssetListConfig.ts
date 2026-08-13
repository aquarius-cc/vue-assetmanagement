/**
 * @file 资产列表页搜索字段、分页 store 配置与 Excel 导出列配置
 * @module composables/useAssetListConfig
 * @exports
 *   - useAssetListConfig: 资产列表页完整配置工厂
 * @callers
 *   - components/componentsdetails/AssetContentDetails.vue
 * @dependsOn
 *   - composables/usePaginationSearch: 分页搜索框架
 *   - composables/useExcelExport: Excel 导出列配置引用
 *   - stores/assetStore: 资产数据与搜索 API
 *   - utils/excelExporter: 列配置类型
 *   - utils/Format: 状态/类型映射
 *   - types/common: 搜索字段配置类型
 */
import { computed } from 'vue'
import type { PaginationSearchConfig } from '@/composables/usePaginationSearch'
import type { ColumnConfig } from '@/utils/excelExporter'
import type { SearchFieldConfig } from '@/types/common'
import { useAssetStore } from '@/stores/assetStore'
import type { AssetDetail } from '@/types/asset'
import { assetTypeMapping, assetCurrentStatusMapping } from '@/utils/Format'

export function useAssetListConfig() {
  const assetStore = useAssetStore()

  // ===== 搜索栏字段配置 =====
  const searchFields: SearchFieldConfig[] = [
    { key: 'asset_code', label: '编码', type: 'text', placeholder: '资产编码', span: 4 },
    { key: 'asset_name', label: '名称', type: 'text', placeholder: '资产名称', span: 4 },
    { key: 'asset_brand', label: '品牌', type: 'text', placeholder: '品牌名称', span: 4 },
    {
      key: 'asset_specification',
      label: '型号规格',
      type: 'text',
      placeholder: '型号规格',
      span: 4,
    },
    {
      key: 'asset_type_category',
      label: '资产分类',
      type: 'select',
      options: Object.entries(assetTypeMapping).map(([value, label]) => ({ label, value })),
      span: 4,
    },
    {
      key: 'asset_current_status',
      label: '当前状态',
      type: 'select',
      options: Object.entries(assetCurrentStatusMapping).map(([value, label]) => ({
        label,
        value,
      })),
      span: 4,
    },
    {
      key: 'asset_contract_name',
      label: '合同名称',
      type: 'text',
      placeholder: '合同名称',
      span: 4,
    },
    { key: 'asset_contract', label: '合同编码', type: 'text', placeholder: '合同编码', span: 4 },
  ]

  // ===== SmartListContainer store 配置 =====
  const storeConfig: PaginationSearchConfig<AssetDetail> = {
    store: {
      getList: async (params) => {
        const response = await assetStore.getList(params)
        return {
          count: assetStore.pagination.total,
          results: response,
          next: null,
          previous: null,
        }
      },
      pagination: {
        page: {
          get: () => assetStore.pagination.page,
          set: (val: number) => {
            assetStore.pagination.page = val
          },
        },
        page_size: {
          get: () => assetStore.pagination.page_size,
          set: (val: number) => {
            assetStore.pagination.page_size = val
          },
        },
        total: {
          get: () => assetStore.pagination.total,
          set: (val: number) => {
            assetStore.pagination.total = val
          },
        },
      },
      list: computed(() => assetStore.list),
      loading: computed(() => assetStore.loading),
      refreshFlag: computed(() => assetStore.refreshFlag),
      setRefreshFlag: (flag: boolean) => assetStore.setRefreshFlag(flag),
    },
    search: {
      performSearch: async (keyword: string, page: number, page_size: number) => {
        const response = await assetStore.searchAssets({ keyword, page, page_size })
        return {
          count: response.count,
          results: response.results as unknown as AssetDetail[],
        }
      },
      performSearchWithParams: async (
        params: Record<string, string>,
        page: number,
        page_size: number,
      ) => {
        const response = await assetStore.combineSearch({ ...params, page, page_size })
        return {
          count: response.count,
          results: response.results as unknown as AssetDetail[],
        }
      },
    },
    defaultPageSize: 20,
    messages: {
      loadFailed: '加载资产列表失败',
      searchFailed: '搜索资产失败',
      invalidPage: '页码超出范围，已跳转至最后一页',
    },
  }

  // ===== Excel 导出列配置 =====
  const exportColumns: ColumnConfig<AssetDetail>[] = [
    { title: '资产编码', key: 'asset_code', default: '' },
    { title: '资产名称', key: 'asset_name', default: '' },
    { title: '型号规格', key: 'asset_specification', default: '' },
    { title: '品牌', key: 'asset_brand', default: '' },
    { title: '单位', key: 'asset_unit', default: '' },
    {
      title: '单价',
      key: 'asset_purchase_price',
      default: '',
      formatter: (v: unknown) => String(v ?? '0'),
    },
    { title: '采购数量', key: 'asset_purchase_number', default: '' },
    { title: '采购日期', key: 'asset_purchase_date', default: '' },
    { title: '质保期（年）', key: 'asset_warranty_period', default: '0' },
    { title: '录入日期', key: 'asset_entry_date', default: '' },
    { title: '当前使用状态', key: 'asset_current_status', default: '' },
    { title: '资产类型编码', key: 'asset_type_code', default: '' },
    { title: '录入人工号', key: 'asset_entry_person_jobcode', default: '' },
    { title: '合同编码', key: 'asset_contract_code', default: '' },
    { title: '申请人工号', key: 'asset_applicant_jobcode', default: '' },
    { title: '保管人工号', key: 'asset_manager_jobcode', default: '' },
    { title: '使用地点', key: 'asset_using_location', default: '' },
    { title: '仓库编码', key: 'asset_storage_code', default: '' },
    { title: '资产描述', key: 'asset_description', default: '' },
  ]

  return {
    searchFields,
    storeConfig,
    exportColumns,
    assetStore,
  }
}
