<!--
@file 操作日志列表页面，展示资产操作日志记录并支持筛选查询与导出
@component OperationLogDetails
@usedBy
  - views/OperationLogDetails.vue: 通过 router-view 渲染操作日志列表
@dependsOn
  - api/operationLog: 操作日志查询接口
  - composables/useExcelExport: Excel导出功能
  - stores/operationLogStore: 操作日志数据管理
-->
<template>
  <div class="operation-log-details-root">
    <!--
      顶部筛选区
      保留在 SmartListContainer 外部，筛选条件通过 storeConfig 传递
    -->
    <div class="filter-container">
      <el-form :model="filterForm" inline class="filter-form">
        <!-- 资产编码 -->
        <el-form-item label="资产编码">
          <el-input
            v-model="filterForm.asset_code"
            placeholder="请输入资产编码"
            clearable
            style="width: 180px"
            @keyup.enter="handleFilter"
          />
        </el-form-item>
        <!-- 操作类型 -->
        <el-form-item label="操作类型">
          <el-select
            v-model="filterForm.operation_type"
            placeholder="全部类型"
            clearable
            style="width: 150px"
            @change="handleFilter"
          >
            <el-option
              v-for="(label, value) in operationTypeMapping"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </el-form-item>
        <!-- 操作人 -->
        <el-form-item label="操作人">
          <el-input
            v-model="filterForm.operator_jobcode"
            placeholder="请输入工号"
            clearable
            style="width: 150px"
            @keyup.enter="handleFilter"
          />
        </el-form-item>
        <!-- 日期范围 -->
        <el-form-item label="操作时间">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
            @change="handleDateChange"
          />
        </el-form-item>
        <!-- 操作按钮 -->
        <el-form-item>
          <el-button type="primary" @click="handleFilter">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

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
          slot 接收 SmartListContainer 传递的数据管理状态
          包括：data, loading, currentPage, pageSize, total, search 等
        -->
        <template #default="slotProps">
          <CommonList
            :data="slotProps.data"
            :loading="slotProps.loading"
            v-model:current-page="slotProps.currentPage"
            v-model:page-size="slotProps.pageSize"
            :total="slotProps.total"
            :columns="columns"
            :enable-search="false"
            :detail-route-name="'OperationLogDetail'"
            :show-detail-button="false"
            :show-actions="false"
            :enable-selection="true"
            :show-pagination="true"
            :page-size-options="slotProps.pageSizeOptions"
            @size-change="slotProps.handleSizeChange"
            @current-change="slotProps.handleCurrentChange"
            @selection-change="slotProps.handleSelectionChange"
          >
            <!-- 操作类型列自定义渲染（使用 el-tag 不同颜色） -->
            <template #operation_type="{ row }">
              <el-tag :type="getOperationTypeTagType(row.operation_type)">
                {{ getOperationTypeText(row.operation_type) }}
              </el-tag>
            </template>

            <!-- 操作时间列自定义渲染 -->
            <template #operation_time="{ row }">
              {{ formatDate(row.operation_time) }}
            </template>
          </CommonList>

          <!-- 底部按钮组（只读模块，仅导出 Excel） -->
          <div class="bottom-buttons">
            <el-button type="primary" @click="handleExportExcel">导出Excel</el-button>
            <!-- 批量删除按钮：当选中数据时可用 -->
            <!-- <el-button
              type="danger"
              :disabled="slotProps.selectedRows?.length === 0"
              @click="handleBatchDelete(slotProps.selectedRows)"
            >
              批量删除 ({{ slotProps.selectedRows?.length || 0 }})
            </el-button> -->
          </div>
        </template>
      </SmartListContainer>
    </div>

    <!-- 子路由遮罩容器 -->
    <div v-if="isChildRouteActive" class="router-mask-container">
      <div class="mask" @click="handleMaskBack"></div>
      <div class="child-router-container">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'OperationLogDetails' })

// ===== 导入顺序：Vue 核心 → 第三方库 → @/ 内部模块 =====
import { ref, reactive, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import SmartListContainer from '@/components/commoncomponents/SmartListContainer.vue'
import CommonList from '@/types/list'
import type { TableColumn } from '@/types/list'
import type { PaginationSearchConfig } from '@/composables/usePaginationSearch'
import type { PaginationQuery } from '@/stores/createEntityStore'
import type { ColumnConfig } from '@/utils/excelExporter'
import { exportToExcel } from '@/utils/excelExporter'
import type { OperationLog } from '@/types/operationlog'
import { operationTypeMapping, operationTypeTagMapping } from '@/types/operationlog'
import { useOperationLogStore } from '@/stores/operationLogStore'
import { formatDate } from '@/utils/Format'
import type { SmartListContainerExpose } from '@/types/common'

// ===== 状态与实例 =====
const operationLogStore = useOperationLogStore()
const route = useRoute()
const router = useRouter()

/**
 * SmartListContainer 组件引用
 * 用于调用容器暴露的方法（如 refresh、reset）
 *
 * 注意：SmartListContainer 是泛型组件，使用 ComponentPublicInstance 获取公共实例类型
 * 通过类型断言访问 expose 的方法
 */
const smartListRef = ref<SmartListContainerExpose | null>(null)

/**
 * 子路由激活状态
 * 用于控制子路由遮罩层的显示
 */
const isChildRouteActive = ref(false)

// ===== 筛选表单 =====
/**
 * 筛选表单状态
 * 包含资产编码、操作类型、操作人工号
 */
const filterForm = reactive({
  asset_code: '',
  operation_type: '',
  operator_jobcode: '',
})

/**
 * 日期范围（用于 el-date-picker 绑定）
 * 数组格式：[开始日期, 结束日期]
 */
const dateRange = ref<[string, string] | null>(null)

// ===== 操作类型辅助函数 =====

/**
 * 获取操作类型的标签颜色
 * @param type 操作类型值
 * @returns el-tag 的 type 属性值
 */
const getOperationTypeTagType = (
  type: string | null | undefined,
): 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'default' => {
  if (!type) return 'info'
  return operationTypeTagMapping[type] || 'info'
}

/**
 * 获取操作类型的中文文本
 * @param type 操作类型值
 * @returns 中文文本
 */
const getOperationTypeText = (type: string | null | undefined): string => {
  if (!type) return '未知'
  return operationTypeMapping[type] || type
}

// ===== 表格列配置 =====
/**
 * 表格列定义
 * 每一列的渲染方式、标题、宽度等属性
 */
const columns: TableColumn[] = [
  { type: 'index', label: '序号', width: 60, align: 'center' },
  {
    type: 'custom',
    prop: 'operation_type',
    label: '操作类型',
    width: 110,
    align: 'center',
    slotName: 'operation_type',
  },
  { prop: 'asset_code', label: '资产编码', width: 150, align: 'center' },
  { prop: 'asset_name', label: '资产名称', width: 150, align: 'left' },
  { prop: 'asset_specification', label: '资产规格', width: 150, align: 'left' },
  { prop: 'operator_name', label: '操作人', width: 100, align: 'center' },
  {
    type: 'custom',
    prop: 'operation_time',
    label: '操作时间',
    width: 170,
    align: 'center',
    slotName: 'operation_time',
  },
  { prop: 'description', label: '描述', width: 200, align: 'left' },
  { prop: 'ip_address', label: 'IP地址', width: 130, align: 'center' },
]

// ===== SmartListContainer 配置 =====
/**
 * Store 配置对象
 * 传递给 SmartListContainer 用于数据管理
 *
 * 特点：
 * - getList 方法会合并筛选条件到查询参数
 * - 筛选条件来自 filterForm 和 dateRange
 * - 默认按操作时间倒序排列
 */
const storeConfig = computed<PaginationSearchConfig<OperationLog>>(() => ({
  store: {
    /**
     * 获取列表数据
     * @param params 分页查询参数
     * @returns 包含 count 和 results 的响应对象
     */
    getList: async (params) => {
      // 合并筛选条件到查询参数
      const mergedParams: Record<string, unknown> = { ...params }

      // 添加资产编码筛选
      if (filterForm.asset_code) {
        mergedParams.asset_code = filterForm.asset_code
      }

      // 添加操作类型筛选
      if (filterForm.operation_type) {
        mergedParams.operation_type = filterForm.operation_type
      }

      // 添加操作人筛选
      if (filterForm.operator_jobcode) {
        mergedParams.operator_jobcode = filterForm.operator_jobcode
      }

      // 添加日期范围筛选
      if (dateRange.value && dateRange.value[0]) {
        mergedParams.start_date = dateRange.value[0]
      }
      if (dateRange.value && dateRange.value[1]) {
        mergedParams.end_date = dateRange.value[1]
      }

      // 默认按操作时间倒序
      if (!mergedParams.ordering) {
        mergedParams.ordering = '-operation_time'
      }

      const response = await operationLogStore.getList(mergedParams as PaginationQuery)
      return {
        count: operationLogStore.pagination.total,
        results: response,
        next: null,
        previous: null,
      }
    },
    /**
     * 分页状态
     * 使用 getter/setter 对象实现与 Pinia store 的双向绑定
     */
    pagination: {
      page: {
        get: () => operationLogStore.pagination.page,
        set: (val: number) => {
          operationLogStore.pagination.page = val
        },
      },
      page_size: {
        get: () => operationLogStore.pagination.page_size,
        set: (val: number) => {
          operationLogStore.pagination.page_size = val
        },
      },
      total: {
        get: () => operationLogStore.pagination.total,
        set: (val: number) => {
          operationLogStore.pagination.total = val
        },
      },
    },
    /**
     * 列表数据（computed 保持响应式）
     */
    list: computed(() => operationLogStore.list),
    /**
     * 加载状态（computed 保持响应式）
     */
    loading: computed(() => operationLogStore.loading),
    /**
     * 刷新标志（computed 保持响应式）
     * 用于子页面（如批量导入、表单编辑）通知列表刷新
     */
    refreshFlag: computed(() => operationLogStore.refreshFlag),
    /**
     * 设置刷新标志
     * 子页面调用后，usePaginationSearch 会自动监听并触发列表刷新
     */
    setRefreshFlag: (flag: boolean) => operationLogStore.setRefreshFlag(flag),
  },
  /**
   * 搜索配置
   * 操作日志模块使用筛选区而非搜索框，但保留配置以支持通用搜索
   */
  search: {
    performSearch: async (keyword: string, page: number, page_size: number) => {
      const response = await operationLogStore.getList({
        search: keyword,
        page,
        page_size,
        ordering: '-operation_time',
      } as PaginationQuery)
      return {
        count: operationLogStore.pagination.total,
        results: response,
      }
    },
  },
  defaultPageSize: 20,
  messages: {
    loadFailed: '加载操作日志列表失败',
    searchFailed: '搜索操作日志失败',
    invalidPage: '页码超出范围，已跳转至最后一页',
  },
}))

// ===== 筛选事件处理 =====

/**
 * 执行筛选查询
 * 重置页码为 1，刷新列表数据
 */
const handleFilter = () => {
  operationLogStore.pagination.page = 1
  // 通过 SmartListContainer 的 refresh 方法刷新数据
  smartListRef.value?.refresh()
}

/**
 * 日期范围变更处理
 * @param val 新的日期范围值
 */
const handleDateChange = (val: [string, string] | null) => {
  dateRange.value = val
  handleFilter()
}

/**
 * 重置筛选条件
 * 清空所有筛选字段，重新加载数据
 */
const handleReset = () => {
  filterForm.asset_code = ''
  filterForm.operation_type = ''
  filterForm.operator_jobcode = ''
  dateRange.value = null
  handleFilter()
}

// ===== 路由监听：控制子路由遮罩 =====
/**
 * 监听路由变化，判断是否需要显示子路由遮罩层
 * 当访问子路由（如详情页）时显示遮罩
 */
watch(
  () => route.matched,
  (matched) => {
    const hasParent = matched.some((item) => item.name === 'OperationLogDetails')
    const isSelfTop = matched[matched.length - 1]?.name === 'OperationLogDetails'
    isChildRouteActive.value = hasParent && !isSelfTop
  },
  { immediate: true },
)

// ===== 导出 Excel =====
/**
 * 导出 Excel
 * 支持导出当前页或全部数据
 */
const handleExportExcel = async () => {
  const exportColumns: ColumnConfig<OperationLog>[] = [
    {
      title: '操作类型',
      key: 'operation_type',
      default: '',
      formatter: (val) => getOperationTypeText(val as string),
    },
    { title: '资产编码', key: 'asset_code', default: '' },
    { title: '资产名称', key: 'asset_name', default: '' },
    { title: '资产规格', key: 'asset_specification', default: '' },
    { title: '操作人', key: 'operator_name', default: '' },
    { title: '操作人工号', key: 'operator_jobcode', default: '' },
    {
      title: '操作时间',
      key: 'operation_time',
      default: '',
      formatter: (val) => formatDate(val as string | Date | null) || '',
    },
    { title: '描述', key: 'description', default: '' },
    { title: 'IP地址', key: 'ip_address', default: '' },
  ]

  let range: 'current' | 'all' | null = null
  try {
    await ElMessageBox.confirm(
      `当前页面 ${operationLogStore.list.length} 条，总共 ${operationLogStore.pagination.total} 条。请选择：`,
      '导出范围',
      {
        confirmButtonText: '导出当前页',
        cancelButtonText: '导出全部',
        distinguishCancelAndClose: true,
      },
    )
    range = 'current'
  } catch (err) {
    if (err === 'cancel') range = 'all'
    else return
  }

  let exportData: OperationLog[] = []
  let fileName = ''

  if (range === 'current') {
    exportData = operationLogStore.list
    fileName = `操作日志列表_当前页面_${operationLogStore.list.length}条.xlsx`
  } else if (range === 'all') {
    ElMessage.info('正在准备全部数据，请稍候...')
    if (operationLogStore.pagination.total > 1000) {
      const confirm = await ElMessageBox.confirm(
        '数据量较大，导出可能需要一些时间，是否继续？',
        '导出确认',
        { confirmButtonText: '继续', cancelButtonText: '取消', type: 'warning' },
      ).catch(() => false)
      if (!confirm) return
    }
    try {
      const allData = await operationLogStore.getList({
        page: 1,
        page_size: operationLogStore.pagination.total,
      })
      exportData = allData
      fileName = `操作日志列表_全部_${allData.length}条.xlsx`
    } catch (error) {
      console.error('导出全部数据失败:', error)
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
    sheetName: '操作日志列表',
    confirmMessage: `确定要导出 ${exportData.length} 条操作日志数据吗？`,
    emptyMessage: '暂无操作日志数据可导出',
    successMessage: '操作日志数据导出成功',
    errorMessage: '操作日志数据导出失败，请重试',
  })
}

/**
 * 遮罩层点击返回
 * 点击遮罩层时返回上一页
 */
const handleMaskBack = () => {
  router.go(-1)
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.operation-log-details-root {
  @include list-container;
}

.filter-container {
  padding: 16px 20px;
  background-color: var(--card-background);
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0;

  :deep(.el-form-item) {
    margin-bottom: 0;
    margin-right: 16px;
  }
}

.table-container {
  @include table-container;

  :deep(.el-table__header th.el-table__cell) {
    text-align: center !important;
    white-space: normal !important;
    word-break: break-word !important;
    padding: 16px 12px !important;
  }

  :deep(.el-table__body td.el-table__cell) {
    text-align: center !important;
    white-space: normal !important;
    word-break: break-word !important;
    padding: 12px 8px !important;
  }
}

.bottom-buttons {
  @include bottom-buttons;
}

.router-mask-container {
  @include router-mask-container;
}

.mask {
  @include mask;
}

.child-router-container {
  @include child-router-container;
}

@include responsive-design;
</style>
