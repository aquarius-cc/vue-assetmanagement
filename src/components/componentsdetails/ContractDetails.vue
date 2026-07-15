<!--
  ContractDetails.vue
  合同列表页面（重构版''
  架构调整)  1. 使用 SmartListContainer 封装数据管理逻辑（分页、搜索、加载）
  2. CommonList 只负贀UI 展示，不管理数据
  3. 搜索统一使用 contractStore.getList({ search: keyword })
  4. 删除后使甀smartListRef.value?.refresh() 刷新
  5. 移除 isDataLoaded 咀onMounted 中的 getList() 调用

  数据流：
  SmartListContainer (数据管理) ↀslot props ↀCommonList (纯展礀

  功能'  - 展示合同列表（支持后端分页和搜索'  - 新增合同、编辑合同、删除合同（带确认弹窗）
  - 批量导入、导出Excel
  - 跳转资产页面
  - 子路由：新增/编辑表单（浮层遮罩）
-->
<template>
  <div class="contract-details-root">
    <!--
      表格容器
      使用 SmartListContainer 管理数据，通过 slot 将数据传递给 CommonList
    -->
    <div class="table-container">
      <SmartListContainer
        ref="smartListRef"
        :store-config="storeConfig"
        :auto-load="true"
        :initial-page="1"
        :initial-page-size="20"
      >
        <!--
          slot 接收 SmartListContainer 传递的数据管理状态          包括：data, loading, currentPage, pageSize, total, search 筀        -->
        <template #default="slotProps">
          <CommonList
            :data="slotProps.data"
            :loading="slotProps.loading"
            v-model:current-page="slotProps.currentPage"
            v-model:page-size="slotProps.pageSize"
            v-model:search="slotProps.search"
            :total="slotProps.total"
            :columns="columns"
            :enable-search="true"
            :detail-route-name="'ContractOfDetails'"
            :show-detail-button="true"
            :show-actions="true"
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
            <!-- 自定义插槽：合同类型 -->
            <template #contract_type="{ row }">
              <span>{{
                contractTypeMapping[(row.contract_type || '').toString().trim()] ||
                row.contract_type ||
                '未知类型'
              }}</span>
            </template>

            <!-- 自定义插槽：合同价格（格式化'-->
            <template #contract_price="{ row }">
              <span>￀{{ formatPrice(row.contract_price) }}</span>
            </template>

            <!-- 自定义插槽：签订日期（格式化'-->
            <template #contract_signing_date="{ row }">
              <span>{{ formatDate(row.contract_signing_date) }}</span>
            </template>

            <!-- 自定义插槽：结算状态（映射 + 颜色标识'-->
            <template #contract_settlment_status="{ row }">
              <el-tag
                :type="row.contract_settledment_status === 'settled' ? 'success' : 'primary'"
                size="small"
              >
                {{
                  contractSettlementStatusMapping[
                    (row.contract_settledment_status || '').toString().trim()
                  ] ||
                  row.contract_settledment_status ||
                  '未知状态'
                }}
              </el-tag>
            </template>

            <!-- 自定义插槽：结算价格（格式化'-->
            <template #contract_settledment_price="{ row }">
              <span>￀{{ formatPrice(row.contract_settledment_price) }}</span>
            </template>
          </CommonList>

          <!-- 底部固定按钮绀-->
          <div class="bottom-buttons">
            <el-button type="success" @click="handleAddContract">新增合同</el-button>
            <el-button type="primary" @click="handleBatchImport">批量导入</el-button>
            <el-button type="primary" @click="handleExportExcel">导出Excel</el-button>
            <el-button type="primary" @click="handleViewAsset">查看资产</el-button>
            <!-- 批量删除按钮：当选中数据时可甀-->
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
    </div>

    <!-- 子路由遮罩容器（新增/编辑表单浮层'-->
    <div v-if="isChildRouteActive" class="router-mask-container">
      <div class="mask" @click="handleMaskBack"></div>
      <div class="child-router-container">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * 组件名称定义
 * 用于在Vue DevTools 中识别组什 */
export default {
  name: 'ContractDetails',
}
</script>

<script lang="ts" setup>
// ===== 导入顺序：Vue 核心 ↀ第三方库 ↀ@/ 内部模块 =====
import { ref, watch, computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import SmartListContainer from '@/components/commoncomponents/SmartListContainer.vue'
import CommonList from '@/components/commoncomponents/CommonList.vue'
import type { TableColumn } from '@/components/commoncomponents/CommonList.vue'
import type { PaginationSearchConfig } from '@/composables/usePaginationSearch'
import type { ColumnConfig } from '@/utils/excelExporter'
import { exportToExcel } from '@/utils/excelExporter'
import type { Contract } from '@/types/contract'
import { useContractStore } from '@/stores/contractStore'
import {
  formatPrice,
  formatDate,
  contractTypeMapping,
  contractSettlementStatusMapping,
} from '@/utils/Format'
import type { SmartListContainerExpose } from '@/types/common'

// ===== 状态与实例 =====
const route = useRoute()
const router = useRouter()
const contractStore = useContractStore()

/**
 * SmartListContainer 组件引用
 * 用于调用容器暴露的方法（妀refresh、reset' * 使用 SmartListContainerExpose 类型确保类型安全
 */
const smartListRef = ref<SmartListContainerExpose | null>(null)

/**
 * 子路由激活状态 * 用于控制子路由遮罩层的显礀 */
const isChildRouteActive = ref(false)

// ===== 表格列配置=====
/**
 * 表格列定乀 * 每一列的渲染方式、标题、宽度等属态 */
const columns: TableColumn[] = [
  { type: 'index', label: '序号', width: 80, align: 'center' },
  { prop: 'contract_code', label: '合同编码', width: 150, align: 'center' },
  { prop: 'contract_name', label: '合同名称', width: 200, align: 'left' },
  {
    type: 'custom',
    prop: 'contract_type',
    label: '合同类型',
    width: 120,
    align: 'center',
    slotName: 'contract_type',
  },
  {
    type: 'custom',
    prop: 'contract_price',
    label: '合同价格(入',
    width: 150,
    align: 'right',
    slotName: 'contract_price',
  },
  { prop: 'contract_supplier', label: '供应商', width: 150, align: 'left' },
  {
    type: 'custom',
    prop: 'contract_signing_date',
    label: '签订日期',
    width: 150,
    align: 'center',
    slotName: 'contract_signing_date',
  },
  {
    type: 'custom',
    prop: 'contract_settlment_status',
    label: '结算状态',
    width: 120,
    align: 'center',
    slotName: 'contract_settlment_status',
  },
  {
    type: 'custom',
    prop: 'contract_settlment_price',
    label: '结算价格(入',
    width: 150,
    align: 'right',
    slotName: 'contract_settlment_price',
  },
]

// ===== SmartListContainer 配置 =====
/**
 * Store 配置对象
 * 传递给 SmartListContainer 用于数据管理
 *
 * 【优化】改为后端搜索，不再使用前端本地过滤
 *
 * 包含' * - getList: 获取列表数据的方泀 * - pagination: 分页状态（使用 getter/setter 实现双向绑定' * - list: 列表数据（computed' * - loading: 加载状态（computed' * - search: 搜索配置（后端搜索）
 */
const storeConfig: PaginationSearchConfig<Contract> = {
  store: {
    /**
     * 获取列表数据
     * @param params 分页查询参数
     * @returns 包含 count 咀results 的响应对豀     */
    getList: async (params) => {
      const response = await contractStore.getList(params)
      return {
        count: contractStore.pagination.total,
        results: response,
        next: null,
        previous: null,
      }
    },
    /**
     * 分页状态     * 使用 getter/setter 对象实现一Pinia store 的双向绑宀     */
    pagination: {
      page: {
        get: () => contractStore.pagination.page,
        set: (val: number) => {
          contractStore.pagination.page = val
        },
      },
      page_size: {
        get: () => contractStore.pagination.page_size,
        set: (val: number) => {
          contractStore.pagination.page_size = val
        },
      },
      total: {
        get: () => contractStore.pagination.total,
        set: (val: number) => {
          contractStore.pagination.total = val
        },
      },
    },
    /**
     * 列表数据（computed 保持响应式）
     */
    list: computed(() => contractStore.list),
    /**
     * 加载状态（computed 保持响应式）
     */
    loading: computed(() => contractStore.loading),
    /**
     * 刷新标志（computed 保持响应式）
     * 用于子页面（如批量导入、表单编辑）通知列表刷新
     */
    refreshFlag: computed(() => contractStore.refreshFlag),
    /**
     * 设置刷新标志
     * 子页面调用后，usePaginationSearch 会自动监听并触发列表刷新
     */
    setRefreshFlag: (flag: boolean) => contractStore.setRefreshFlag(flag),
  },
  /**
   * 搜索配置
   * 【优化】改为后端搜索，支持多字段搜紀   * 统一使用 contractStore.getList({ search: keyword })
   */
  search: {
    performSearch: async (keyword: string, page: number, page_size: number) => {
      const response = await contractStore.getList({ search: keyword, page, page_size })
      return {
        count: contractStore.pagination.total,
        results: response,
      }
    },
  },
  defaultPageSize: 20,
  messages: {
    loadFailed: '加载合同列表失败',
    searchFailed: '搜索合同失败',
    invalidPage: '页码超出范围，已跳转至最后一页',
  },
}

// ===== 路由监听：控制子路由遮罩 =====
/**
 * 监听路由变化，判断是否需要显示子路由遮罩局 * 当访问子路由（如新增/编辑页）时显示遮置 */
watch(
  () => route.matched,
  (matched) => {
    const hasParent = matched.some((item) => item.name === 'ContractDetails')
    const isSelfTop = matched[matched.length - 1]?.name === 'ContractDetails'
    isChildRouteActive.value = hasParent && !isSelfTop
  },
  { immediate: true },
)

// ===== 事件处理 =====

/**
 * 新增合同
 * 跳转到合同表单页面（子路由）
 */
const handleAddContract = () => {
  router.push({ name: 'ContractForm', query: {} }).catch((err) => {
    console.error('新增跳转失败:', err)
    ElMessage.error('跳转失败，请刷新页面重试')
  })
}

/**
 * 批量导入
 * 跳转到批量导入页页 */
const handleBatchImport = () => {
  router.push({ name: 'ContractBatchImport' }).catch((err) => {
    console.error('批量导入跳转失败:', err)
    ElMessage.error('跳转失败，请刷新页面重试')
  })
}

/**
 * 编辑合同
 * 携带合同编码跳转到表单页面（子路由）
 * @param row 行数捀 */
const handleEdit = (row: Contract) => {
  if (!row.contract_code) {
    ElMessage.error('合同编码不存在，无法编辑')
    return
  }
  router.push({ name: 'ContractForm', query: { code: row.contract_code } }).catch((err) => {
    console.error('编辑跳转失败:', err)
    ElMessage.error('跳转失败，请刷新页面重试')
  })
}

/**
 * 删除合同（含二次确认' * 【架构优化】删除成功后通过 SmartListContainer 刷新列表，保持数据一致态 * @param row 行数捀 */
const handleDelete = async (row: Contract) => {
  if (!row.contract_code) {
    ElMessage.error('合同编码不存在，无法删除')
    return
  }
  try {
    await ElMessageBox.confirm('确定要删除该合同吗？删除后数据不可恢复！', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await contractStore.remove(row.contract_code)
    ElMessage.success('删除成功')
    // 【架构优化】通过 SmartListContainer 刷新列表，保持数据一致态    smartListRef.value?.refresh()
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除合同失败:', err)
      ElMessage.error('删除失败，请重试')
    }
  }
}

/**
 * 批量删除
 * 弹出确认框，确认后调甀store.removeBatch 执行批量删除
 * @param rows 选中的行数据
 */
const handleBatchDelete = async (rows: Contract[] | undefined) => {
  if (!rows || rows.length === 0) {
    ElMessage.warning('请先选择要删除的数据')
    return
  }

  // 提取选中的唯一标识字段（根据实体类型调整字段名）
  const codes = rows.map((row) => row.contract_code).filter((code): code is string => !!code)

  if (codes.length === 0) {
    ElMessage.error('无法删除：选中的数据缺少唯一标识')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中皀${codes.length} 条数据吗？删除后数据不可恢复！`,
      '批量删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    await contractStore.removeBatch(codes)
    smartListRef.value?.clearSelection()
    await smartListRef.value?.refresh()
  } catch (err) {
    if (err === 'cancel') return
    console.error('批量删除失败:', err)
    ElMessage.error('批量删除失败，请重试')
  }
}

/**
 * 导出 Excel（支持当前页/全部数据' * @param row 行数捀 */
const handleExportExcel = async () => {
  const exportColumns: ColumnConfig<Contract>[] = [
    { title: '合同编码', key: 'contract_code', default: '' },
    { title: '合同名称', key: 'contract_name', default: '' },
    {
      title: '合同类型',
      key: 'contract_type',
      default: '',
      formatter: (value) => contractTypeMapping[value as string] || (value as string) || '',
    },
    {
      title: '合同价格',
      key: 'contract_price',
      default: '0',
      formatter: (value) => String(value ?? '0'),
    },
    { title: '供应商', key: 'contract_supplier', default: '' },
    { title: '签订日期', key: 'contract_signing_date', default: '' },
    { title: '保修期', key: 'contract_warranty_period', default: '' },
    {
      title: '结算状态',
      key: 'contract_settledment_status',
      default: '',
      formatter: (value) =>
        contractSettlementStatusMapping[value as string] || (value as string) || '',
    },
    {
      title: '结算价格',
      key: 'contract_settledment_price',
      default: '0',
      formatter: (value) => String(value ?? '0'),
    },
    { title: '初验日期', key: 'contract_preliminary_acceptance_date', default: '' },
    { title: '终验日期', key: 'contract_final_acceptance_date', default: '' },
    { title: '已付款次数', key: 'contract_paid_count_number', default: '0' },
    { title: '已支付金额', key: 'contract_paid_price', default: '0' },
    { title: '已支付记录', key: 'contract_paid_record', default: '0' },
  ]

  let exportCurrent = false
  let exportAll = false

  try {
    const result = await ElMessageBox({
      title: '选择导出范围',
      message: h('div', null, [
        h('p', null, `当前页面显示 ${contractStore.list.length} 条数据`),
        h('p', null, `总共最${contractStore.pagination.total} 条数据`),
        h('br'),
        h('p', null, '请选择导出范围'),
      ]),
      showCancelButton: true,
      confirmButtonText: '导出当前页面',
      cancelButtonText: '导出全部数据',
      distinguishCancelAndClose: true,
      closeOnClickModal: false,
    })
    if (result === 'confirm') exportCurrent = true
    else if (result === 'cancel') exportAll = true
    else return
  } catch (err) {
    if (err === 'cancel') exportAll = true
    else if (err === 'close') return
    else throw err
  }

  let exportData: Contract[] = []
  let fileName: string

  if (exportCurrent) {
    exportData = contractStore.list
    fileName = `合同列表_当前页面_${contractStore.list.length}杀xlsx`
  } else if (exportAll) {
    ElMessage.info('正在准备全部数据，请稍候..')
    if (contractStore.pagination.total > 1000) {
      const confirm = await ElMessageBox.confirm(
        '数据量较大，导出可能需要一些时间，是否继续',
        '导出确认',
        {
          confirmButtonText: '继续',
          cancelButtonText: '取消',
          type: 'warning',
        },
      ).catch(() => false)
      if (!confirm) return
    }
    try {
      const allData = await contractStore.getList({
        page: 1,
        page_size: contractStore.pagination.total,
      })
      exportData = allData
      fileName = `合同列表_全部_${allData.length}杀xlsx`
    } catch (error) {
      console.error('获取全部数据失败:', error)
      ElMessage.error('获取全部数据失败，请重试')
      return
    }
  } else {
    return
  }

  await exportToExcel({
    data: exportData,
    columns: exportColumns,
    fileName,
    sheetName: '合同列表',
    confirmMessage: `确定要导出${exportData.length} 条合同数据吗？`,
    emptyMessage: '暂无合同数据可导出',
    successMessage: '合同数据导出成功',
    errorMessage: '合同数据导出失败，请重试',
  })
}

/**
 * 跳转资产列表页面
 */
const handleViewAsset = () => {
  router.push('/main/assetdetails').catch((err) => {
    console.error('跳转资产页面失败:', err)
    ElMessage.error('跳转失败，请刷新页面重试')
  })
}

/**
 * 遮罩层点击返回上一页
 * 统一使用 router.go(-1) 返回上一页
 */
const handleMaskBack = () => {
  router.go(-1)
}
</script>

<style lang="scss" scoped>
// 导入公共样式 mixin 库（使用现代 @use 语法）
@use '@/assets/styles/common-forms.scss' as *;

// 根容器：使用统一列表容器样式
.contract-details-root {
  @include list-container;
}

// 表格容器：复用全局表格容器样式
.table-container {
  @include table-container;
}

// 底部按钮：复用全局底部按钮样式
.bottom-buttons {
  @include bottom-buttons;
}

// 子路由遮罩容器：复用全局样式
.router-mask-container {
  @include router-mask-container;

  .mask {
    @include mask;
  }

  .child-router-container {
    @include child-router-container;
  }
}

// 响应式设讀@include responsive-design;
</style>
