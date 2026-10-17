<!--
@file 通用审计日志列表页面，展示非资产操作的日志记录并支持筛选查询与导出
@component AuditLogDetails
@usedBy
  - views/AuditLogDetails.vue: 通过 router-view 渲染审计日志列表
@dependsOn
  - api/auditLog: 审计日志查询接口
  - composables/useServerExcelExport: 服务端流式导出（P2-04 导出全部）
  - utils/excelExporter: 客户端导出当前页
  - stores/auditLogStore: 审计日志数据管理
-->
<template>
  <div class="audit-log-details-root">
    <!-- 筛选区 -->
    <div class="filter-container">
      <el-form :model="filterForm" inline class="filter-form">
        <el-form-item label="应用模块">
          <el-select
            v-model="filterForm.app_label"
            placeholder="全部模块"
            clearable
            style="width: 150px"
            @change="handleFilter"
          >
            <el-option
              v-for="(label, value) in appLabelMapping"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select
            v-model="filterForm.operation_type"
            placeholder="全部类型"
            clearable
            style="width: 150px"
            @change="handleFilter"
          >
            <el-option
              v-for="(label, value) in auditOperationTypeMapping"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="操作人">
          <el-input
            v-model="filterForm.operator_jobcode"
            placeholder="请输入工号"
            clearable
            style="width: 150px"
            @keyup.enter="handleFilter"
          />
        </el-form-item>
        <el-form-item label="记录编码">
          <el-input
            v-model="filterForm.record_code"
            placeholder="请输入记录编码"
            clearable
            style="width: 180px"
            @keyup.enter="handleFilter"
          />
        </el-form-item>
        <el-form-item label="操作时间">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
            @change="handleFilter"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleFilter">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button type="success" @click="handleExport">导出Excel</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 表格 -->
    <div class="table-container">
      <el-table
        :data="tableData"
        v-loading="loading"
        border
        stripe
        style="width: 100%"
        max-height="calc(100vh - 260px)"
        @row-click="handleRowClick"
        highlight-current-row
      >
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="app_label" label="应用模块" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{
              appLabelMapping[row.app_label] || row.app_label
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="operation_type" label="操作类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="auditOperationTypeTagMapping[row.operation_type] || 'info'" size="small">
              {{ auditOperationTypeMapping[row.operation_type] || row.operation_type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="record_code" label="记录编码" width="180" align="left" />
        <el-table-column
          prop="description"
          label="操作描述"
          width="200"
          align="left"
          show-overflow-tooltip
        />
        <el-table-column prop="operator_jobcode" label="操作人工号" width="120" align="center" />
        <el-table-column prop="operator_name" label="操作人" width="100" align="center" />
        <el-table-column prop="operation_time" label="操作时间" width="180" align="center">
          <template #default="{ row }">
            {{ row.operation_time ? exactFormatDate(row.operation_time) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="ip_address" label="IP地址" width="140" align="center" />
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 子路由遮罩 -->
    <div v-if="isChildRouteActive" class="router-mask-container">
      <div class="mask" @click="handleMaskBack"></div>
      <div class="child-router-container">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuditLogStore, auditLogExportExcel } from '@/stores/auditLogStore'
import type { AuditLog } from '@/types/auditlog'
import {
  auditOperationTypeMapping,
  appLabelMapping,
  auditOperationTypeTagMapping,
} from '@/types/auditlog'
import type { ColumnConfig } from '@/utils/excelExporter'
import { exactFormatDate } from '@/utils/Format'
import { useServerExcelExport } from '@/composables/useServerExcelExport'
import { exportToExcel } from '@/utils/excelExporter'

const route = useRoute()
const router = useRouter()
const auditLogStore = useAuditLogStore()

const { loading, tableData, currentPage, pageSize, total, filterForm, dateRange } =
  storeToRefs(auditLogStore)

const isChildRouteActive = computed(() => {
  return route.name !== 'AuditLogDetails' && route.name === 'AuditLogDetail'
})

const handleMaskBack = () => {
  router.push({ name: 'AuditLogDetails' })
}

// ===== 数据加载（错误回调统一由 Store 透传）=====
const notifyLoadError = () => ElMessage.error('加载审计日志失败')

const loadData = () => auditLogStore.loadData(notifyLoadError)

const handleFilter = () => auditLogStore.handleFilter(notifyLoadError)

const handleReset = () => auditLogStore.handleReset(notifyLoadError)

const handleSizeChange = () => auditLogStore.handleSizeChange(notifyLoadError)

const handleCurrentChange = () => auditLogStore.handleCurrentChange(notifyLoadError)

const handleRowClick = (row: AuditLog) => {
  router.push({ name: 'AuditLogDetail', query: { logging_id: row.logging_id } })
}

// ===== Excel 导出 =====
const { exportFromServer } = useServerExcelExport()
const exportColumns: ColumnConfig<AuditLog>[] = [
  { title: '应用模块', key: 'app_label', default: '' },
  { title: '操作类型', key: 'operation_type', default: '' },
  { title: '记录编码', key: 'record_code', default: '' },
  { title: '操作描述', key: 'description', default: '' },
  { title: '操作人工号', key: 'operator_jobcode', default: '' },
  { title: '操作人', key: 'operator_name', default: '' },
  { title: '操作时间', key: 'operation_time', default: '' },
  { title: 'IP地址', key: 'ip_address', default: '' },
]

const handleExport = async () => {
  // P2-04: 「导出全部」迁服务端流式导出(修复 page_size=total 被 MAX_PAGE_SIZE=100 截断)。
  let range: 'current' | 'all' | null = null
  try {
    await ElMessageBox.confirm(
      `当前页面 ${tableData.value.length} 条，总共 审计日志 ${total.value} 条。请选择：`,
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

  if (range === 'current') {
    await exportToExcel({
      data: tableData.value,
      columns: exportColumns,
      fileName: `审计日志_当前页面_${tableData.value.length}条.xlsx`,
      sheetName: '审计日志',
      confirmMessage: `确定要导出 ${tableData.value.length} 条审计日志数据吗？`,
      emptyMessage: '暂无审计日志数据可导出',
      successMessage: '审计日志数据导出成功',
      errorMessage: '审计日志数据导出失败，请重试',
    })
    return
  }

  if (range === 'all') {
    // 带上当前筛选条件，服务端导出与页面查询口径一致
    const filterParams: Record<string, unknown> = {}
    if (filterForm.value.app_label) filterParams.app_label = filterForm.value.app_label
    if (filterForm.value.operation_type)
      filterParams.operation_type = filterForm.value.operation_type
    if (filterForm.value.operator_jobcode)
      filterParams.operator_jobcode = filterForm.value.operator_jobcode
    if (filterForm.value.record_code) filterParams.record_code = filterForm.value.record_code
    if (dateRange.value) {
      filterParams.start_date = dateRange.value[0]
      filterParams.end_date = dateRange.value[1]
    }
    await exportFromServer({
      entityName: '审计日志',
      totalCount: total.value,
      fetchExport: (params) => auditLogExportExcel(params),
      params: filterParams,
    })
  }
}

// ===== 初始化 =====
onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.audit-log-details-root {
  height: 100%;
  display: flex;
  flex-direction: column;

  .filter-container {
    padding: 16px;
    background: var(--card-background);
    border-radius: 8px;
    margin-bottom: 16px;

    .filter-form {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }

  .table-container {
    flex: 1;
    min-height: 0;
    background: var(--card-background);
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;

    .pagination-container {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }
  }
}

.router-mask-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-mask);
  display: flex;

  .mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
  }

  .child-router-container {
    position: relative;
    z-index: var(--z-content);
    width: 70%;
    max-width: 900px;
    margin: 32px auto;
    background: var(--card-background);
    border-radius: 8px;
    overflow-y: auto;
  }
}
</style>
