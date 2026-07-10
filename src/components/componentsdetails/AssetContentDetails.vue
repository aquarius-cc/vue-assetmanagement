<!--
  AssetContentDetails.vue
  资产列表页面（重构版�?
  架构调整�?  1. 使用 SmartListContainer 封装数据管理逻辑（分页、搜索、加载）
  2. CommonList 只负�?UI 展示，不管理数据
  3. 解决原架构中父组件和 CommonList 重复请求的问�?
  数据流：
  SmartListContainer (数据管理) �?slot props �?CommonList (纯展�?

  功能�?  - 展示资产列表（支持增删改查）
  - 批量导入、导�?Excel
  - 子路由：新增/编辑表单、详情页（浮层遮罩）
-->
<template>
  <div class="asset-details-root">
    <!--
      搜索栏：支持多条件联合搜�?      配置 6 个搜索字段：名称/编码、品牌、型号规格、资产分类、当前状态、合同名�?    -->
    <SearchBar
      ref="searchBarRef"
      :fields="searchFields"
      @search="handleSearch"
      @reset="handleSearchReset"
    />

    <div class="table-container">
      <!--
        表格容器
        使用 SmartListContainer 管理数据，通过 slot 将数据传递给 CommonList
      -->
      <SmartListContainer
        ref="smartListRef"
        :store-config="storeConfig"
        :auto-load="true"
        :initial-page="1"
        :initial-page-size="20"
      >
        <!--
          slot 接收 SmartListContainer 传递的数据管理状�?          包括：data, loading, currentPage, pageSize, total, search �?        -->
        <template #default="slotProps">
          <CommonList
            :data="slotProps.data"
            :loading="slotProps.loading"
            v-model:current-page="slotProps.currentPage"
            v-model:page-size="slotProps.pageSize"
            v-model:search="slotProps.search"
            :total="slotProps.total"
            :columns="columns"
            :detail-route-name="'BasicAssetDetails'"
            :show-detail-button="true"
            :enable-search="true"
            :enable-edit="true"
            :enable-delete="true"
            :enable-selection="true"
            :action-column-width="180"
            :page-size-options="slotProps.pageSizeOptions"
            @size-change="slotProps.handleSizeChange"
            @current-change="slotProps.handleCurrentChange"
            @search="slotProps.performSearch"
            @edit="handleEdit"
            @delete="handleDelete"
            @selection-change="slotProps.handleSelectionChange"
          >
            <!-- 当前状态列自定义渲�?-->
            <template #asset_current_status="{ row }">
              <el-tag :type="getStatusTagType(row.asset_current_status)">
                {{ assetCurrentStatusMapping[row.asset_current_status] || '未知' }}
              </el-tag>
            </template>

            <!-- 资产分类列自定义渲染 -->
            <template #type_category="{ row }">
              <el-tag :type="getAssetTypeTagType(row.type_category)">
                {{ assetTypeMapping[row.type_category] || '未知' }}
              </el-tag>
            </template>

            <!-- 合同号兼容对象格�?-->
            <template #contract_code="{ row }">
              <span>{{ getContractCode(row.contract_code || '') }}</span>
            </template>
          </CommonList>

          <!-- 底部固定按钮（新�?批量导入/导出/批量删除�?-->
          <div class="bottom-buttons">
            <el-button type="success" @click="handleAddAsset">新增资产</el-button>
            <el-button type="primary" @click="handleBatchImport">批量导入</el-button>
            <el-button type="primary" @click="handleExportExcel">导出Excel</el-button>
            <!-- 批量删除按钮：当选中数据时可�?-->
            <el-button
              type="danger"
              :disabled="slotProps.selectedRows?.length === 0"
              @click="handleBatchDelete(slotProps.selectedRows)"
            >
              批量删除 ({{ slotProps.selectedRows?.length || 0 }})
            </el-button>
          </div>
        </template>
      </SmartListContainer>

      <!-- 子路由遮罩容器（新增/编辑/详情等浮层） -->
      <div v-if="isChildRouteActive" class="router-mask-container">
        <div class="mask" @click="handleMaskBack"></div>
        <div class="child-router-container">
          <router-view></router-view>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * 组件名称定义
 * 必须与路�?meta.componentName 一�? */
export default {
  name: 'AssetContentDetails',
}
</script>

<script lang="ts" setup>
// ===== 导入顺序：Vue 核心 �?第三方库 �?@/ 内部模块 =====
import { ref, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import SmartListContainer from '@/components/commoncomponents/SmartListContainer.vue'
import CommonList from '@/components/commoncomponents/CommonList.vue'
import SearchBar from '@/components/commoncomponents/SearchBar.vue'
import type { TableColumn } from '@/components/commoncomponents/CommonList.vue'
import type { PaginationSearchConfig } from '@/composables/usePaginationSearch'
import type { ColumnConfig } from '@/utils/excelExporter'
import { useExcelExport } from '@/composables/useExcelExport'
import type { SmartListContainerExpose, SearchFieldConfig } from '@/types/common'
import { useAssetStore } from '@/stores/assetStore'
import type { AssetDetail } from '@/types/asset'
import { assetTypeMapping, assetCurrentStatusMapping } from '@/utils/Format'

// ===== 状态与实例 =====
const router = useRouter()
const route = useRoute()
const assetStore = useAssetStore()

/**
 * SmartListContainer 组件引用
 * 用于调用容器暴露的方法（�?refresh、reset�? * 使用 SmartListContainerExpose 类型确保类型安全
 */
const smartListRef = ref<SmartListContainerExpose | null>(null)

/**
 * SearchBar 组件引用
 */
const searchBarRef = ref<InstanceType<typeof SearchBar> | null>(null)

/**
 * 子路由激活状�? * 用于控制子路由遮罩层的显�? */
const isChildRouteActive = ref(false)

// ===== 搜索栏配�?=====
/**
 * 资产搜索字段配置
 * 支持 6 个搜索条件的联合搜索
 *
 * 字段 key 必须与后�?CombineSearchSerializer 参数名一致：
 * - asset_name: 资产名称（模糊匹配）
 * - asset_brand: 品牌（模糊匹配）
 * - asset_specification: 型号规格（模糊匹配）
 * - asset_type_category: 资产分类（精确匹配）
 * - asset_current_status: 当前状态（精确匹配�? * - asset_contract: 合同编码（精确匹配）
 */
const searchFields: SearchFieldConfig[] = [
  {
    key: 'asset_code',
    label: '编码',
    type: 'text',
    placeholder: '资产编码',
    span: 4,
  },
  {
    key: 'asset_name',
    label: '名称',
    type: 'text',
    placeholder: '资产名称',
    span: 4,
  },
  {
    key: 'asset_brand',
    label: '品牌',
    type: 'text',
    placeholder: '品牌名称',
    span: 4,
  },
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
    label: '当前状�?,
    type: 'select',
    options: Object.entries(assetCurrentStatusMapping).map(([value, label]) => ({ label, value })),
    span: 4,
  },
  {
    key: 'asset_contract_name',
    label: '合同名称',
    type: 'text',
    placeholder: '合同名称',
    span: 4,
  },
  {
    key: 'asset_contract',
    label: '合同编码',
    type: 'text',
    placeholder: '合同编码',
    span: 4,
  },
]

/**
 * 处理搜索栏搜索事�? * 将多参数搜索传递给 SmartListContainer下的 performSearchWithParams 方法
 * searchWithParams: performSearchWithParams,
 */
const handleSearch = (params: Record<string, string>) => {
  smartListRef.value?.searchWithParams(params)
}

/**
 * 处理搜索栏重置事�? * 重置搜索并刷新列�? */
const handleSearchReset = () => {
  smartListRef.value?.reset()
}

// ===== 辅助函数 =====

/**
 * 获取当前状态对应的 el-tag 类型
 * @param status 资产当前状态�? * @returns 标签类型
 */
const getStatusTagType = (
  status: string,
): 'success' | 'primary' | 'warning' | 'danger' | 'info' => {
  switch (status) {
    case 'in_store':
      return 'success'
    case 'in_use':
      return 'primary'
    case 'recycled_pending':
      return 'success'
    case 'damaged':
      return 'warning'
    case 'scrapped':
      return 'danger'
    default:
      return 'info'
  }
}

/**
 * 获取资产分类对应�?el-tag 类型
 * @param category 资产分类�? * @returns 标签类型
 */
const getAssetTypeTagType = (
  category: string,
): 'success' | 'primary' | 'warning' | 'danger' | 'info' => {
  switch (category) {
    case 'hardware':
      return 'success'
    case 'software':
      return 'primary'
    case 'lowvalue':
      return 'warning'
    case 'other':
      return 'danger'
    default:
      return 'info'
  }
}

/**
 * 获取合同号（兼容对象格式�? * @param contract 合同对象或字符串
 * @returns 合同编码字符�? */
const getContractCode = (contract: unknown): string => {
  if (typeof contract === 'object' && contract !== null && 'contract_code' in contract) {
    return String((contract as { contract_code: string }).contract_code || '-')
  }
  if (typeof contract === 'string') return contract || '-'
  return '-'
}

// ===== 表格列配�?=====
/**
 * 表格列定�? * 每一列的渲染方式、标题、宽度等属�? */
const columns: TableColumn[] = [
  { type: 'index', label: '序号', width: 80, align: 'center' },
  { prop: 'recordcode', label: '唯一记录�?, width: 150, align: 'center' },
  { prop: 'asset_code', label: '编码', width: 180, align: 'center' },
  { prop: 'asset_name', label: '名称', width: 180, align: 'left' },
  { prop: 'asset_specification', label: '型号规格', width: 180, align: 'left' },
  { prop: 'asset_brand', label: '品牌', width: 120, align: 'center' },
  {
    type: 'custom',
    prop: 'type_category',
    label: '资产分类',
    width: 130,
    align: 'center',
    slotName: 'type_category',
  },
  {
    type: 'custom',
    prop: 'asset_current_status',
    label: '当前状�?,
    width: 130,
    align: 'center',
    slotName: 'asset_current_status',
  },
  {
    type: 'custom',
    prop: 'contract_code',
    label: '合同�?,
    width: 150,
    align: 'center',
    slotName: 'contract_code',
  },
]

// ===== SmartListContainer 配置 =====
/**
 * Store 配置对象
 * 传递给 SmartListContainer 用于数据管理
 *
 * 包含�? * - getList: 获取列表数据的方�? * - pagination: 分页状态（使用 getter/setter 实现双向绑定�? * - list: 列表数据（computed�? * - loading: 加载状态（computed�? * - search: 搜索配置（统一使用 assetStore.getList�? */
const storeConfig: PaginationSearchConfig<AssetDetail> = {
  store: {
    /**
     * 获取列表数据
     * @param params 分页查询参数
     * @returns 包含 count �?results 的响应对�?     */
    getList: async (params) => {
      const response = await assetStore.getList(params)
      return {
        count: assetStore.pagination.total,
        results: response,
        next: null,
        previous: null,
      }
    },
    /**
     * 分页状�?     * 使用 getter/setter 对象实现�?Pinia store 的双向绑�?     */
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
    /**
     * 列表数据（computed 保持响应式）
     */
    list: computed(() => assetStore.list),
    /**
     * 加载状态（computed 保持响应式）
     */
    loading: computed(() => assetStore.loading),
    /**
     * 刷新标志（computed 保持响应式）
     * 用于子页面（如批量导入、表单编辑）通知列表刷新
     */
    refreshFlag: computed(() => assetStore.refreshFlag),
    /**
     * 设置刷新标志
     * 子页面调用后，usePaginationSearch 会自动监听并触发列表刷新
     */
    setRefreshFlag: (flag: boolean) => assetStore.setRefreshFlag(flag),
  },
  /**
   * 搜索配置
   * 【优化】使用后�?combine_search action，支持多条件组合搜索
   * - performSearch: 单关键词搜索（降级到 search_assets�?   * - performSearchWithParams: 多参数联合搜索（使用 combine_search，返回完�?AssetDetail�?   *
   * combine_search 优势�?   * - 支持模糊匹配（asset_name, asset_specification, asset_brand�?   * - 支持精确匹配（asset_current_status, asset_type, asset_type_category, asset_storage, asset_contract�?   * - 输出使用 AssetDetailSerializer，包含完整嵌套关联数�?   * - 无需类型断言，直接返�?AssetDetail[]
   */
  search: {
    /** 单关键词搜索（降级到 search_assets�?*/
    performSearch: async (keyword: string, page: number, page_size: number) => {
      const response = await assetStore.searchAssets({ keyword, page, page_size })
      return {
        count: response.count,
        results: response.results as unknown as AssetDetail[],
      }
    },
    /** 多参数联合搜索（使用 combine_search，返回完�?AssetDetail�?*/
    performSearchWithParams: async (
      params: Record<string, string>,
      page: number,
      page_size: number,
    ) => {
      // 使用 combineSearch 方法，直接返�?AssetDetail[]
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
    invalidPage: '页码超出范围，已跳转至最后一�?,
  },
}

// ===== 路由监听：控制子路由遮罩 =====
/**
 * 监听路由变化，判断是否需要显示子路由遮罩�? * 当存在父路由且匹配的层级大于 3 时，表示进入了更深层的子路由
 */
watch(
  () => route.matched,
  (matched) => {
    const hasParentRoute = matched.some((item) => item.name === 'AssetContentDetails')
    isChildRouteActive.value = hasParentRoute && matched.length > 3
  },
  { immediate: true },
)

// ===== 事件处理 =====

/**
 * 编辑资产
 * @param row 待编辑的行数�? */
const handleEdit = (row: AssetDetail) => {
  if (!row.asset_code) {
    ElMessage.error('资产编码不存在，无法编辑')
    return
  }
  router.push({ name: 'AssetForm', query: { code: row.asset_code } }).catch((err) => {
    ElMessage.error(`跳转失败: ${err.message || '未知错误'}`)
  })
}

/**
 * 删除资产
 * 【优化】添加二次确认弹窗，防止误删
 * @param row 待删除的行数�? */
const handleDelete = (row: AssetDetail) => {
  if (!row.asset_code) {
    ElMessage.error('资产编码不存在，无法删除')
    return
  }
  ElMessageBox.confirm('确定要删除该资产吗？删除后不可恢复�?, '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      return assetStore.remove(row.asset_code)
    })
    .then(() => {
      ElMessage.success('资产删除成功')
      // 【架构优化】通过 SmartListContainer 刷新列表，保持数据一致�?      smartListRef.value?.refresh()
    })
    .catch((error) => {
      if (error !== 'cancel') {
        ElMessage.error(`删除失败: ${error.message || '未知错误'}`)
      }
    })
}

/**
 * 新增资产
 */
const handleAddAsset = () => {
  router.push({ name: 'AssetForm' }).catch((err) => {
    ElMessage.error(`跳转失败: ${err.message || '未知错误'}`)
  })
}

/**
 * 批量导入
 */
const handleBatchImport = () => {
  router.push({ name: 'AssetBatchImport' }).catch((err) => {
    ElMessage.error(`跳转失败: ${err.message || '未知错误'}`)
  })
}

// ===== Excel 导出 =====
/**
 * 使用 Excel 导出 composable
 */
const { exportList } = useExcelExport()

/**
 * 导出列配置（用于 Excel 导出�? */
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
    formatter: (value: unknown) => String(value ?? '0'),
  },
  { title: '采购数量', key: 'asset_purchase_number', default: '' },
  { title: '采购日期', key: 'asset_purchase_date', default: '' },
  { title: '质保期（年）', key: 'asset_warranty_period', default: '0' },
  { title: '录入日期', key: 'asset_entry_date', default: '' },
  { title: '当前使用状�?, key: 'asset_current_status', default: '' },
  { title: '资产类型编码', key: 'asset_type_code', default: '' },
  { title: '录入人工�?, key: 'asset_entry_person_jobcode', default: '' },
  { title: '合同编码', key: 'asset_contract_code', default: '' },
  { title: '申请人工�?, key: 'asset_applicant_jobcode', default: '' },
  { title: '保管人工�?, key: 'asset_manager_jobcode', default: '' },
  { title: '使用地点', key: 'asset_using_location', default: '' },
  { title: '仓库编码', key: 'asset_storage_code', default: '' },
  { title: '资产描述', key: 'asset_description', default: '' },
]

/**
 * 导出 Excel
 * 支持导出当前页或全部数据
 */
const handleExportExcel = async () => {
  await exportList({
    entityName: '资产',
    columns: exportColumns,
    currentData: assetStore.list,
    totalCount: assetStore.pagination.total,
    fetchAllData: async () => {
      const allData = await assetStore.getList({
        page: 1,
        page_size: assetStore.pagination.total,
      })
      return allData
    },
    sheetName: '资产列表',
  })
}

/**
 * 批量删除
 * 弹出确认框，确认后调�?store.removeBatch 执行批量删除
 * @param rows 选中的行数据
 */
const handleBatchDelete = async (rows: AssetDetail[] | undefined) => {
  if (!rows || rows.length === 0) {
    ElMessage.warning('请先选择要删除的数据')
    return
  }

  // 提取选中的唯一标识字段（根据实体类型调整字段名�?  const codes = rows.map((row) => row.asset_code).filter((code): code is string => !!code)

  if (codes.length === 0) {
    ElMessage.error('无法删除：选中的数据缺少唯一标识')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中�?${codes.length} 条数据吗？删除后数据不可恢复！`,
      '批量删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    await assetStore.removeBatch(codes)
    smartListRef.value?.clearSelection()
    await smartListRef.value?.refresh()
  } catch (err) {
    if (err === 'cancel') return
    console.error('批量删除失败:', err)
    ElMessage.error('批量删除失败，请重试')
  }
}

/**
 * 遮罩层点击返�? * 【优化】使�?router.go(-1) 与其他模块保持一�? */
const handleMaskBack = () => {
  router.go(-1)
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.asset-details-root {
  @include list-container;

  .table-container {
    @include table-container;
  }

  .bottom-buttons {
    @include bottom-buttons;
  }

  .router-mask-container {
    @include router-mask-container;

    .mask {
      @include mask;
    }

    .child-router-container {
      @include child-router-container;
    }
  }
}

@include responsive-design;
</style>
