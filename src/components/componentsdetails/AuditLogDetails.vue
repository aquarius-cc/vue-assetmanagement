<!--
@file 通用审计日志列表页面，展示非资产操作的日志记录并支持筛选查询与导出
@component AuditLogDetails
@usedBy
  - views/AuditLogDetails.vue: 通过 router-view 渲染审计日志列表
@dependsOn
  - api/auditLog: 审计日志查询接口
  - composables/useExcelExport: Excel导出功能
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
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { auditLogAPI } from '@/api/auditLog'
import type { AuditLog, AuditLogQueryParams } from '@/types/auditlog'
import {
  auditOperationTypeMapping,
  appLabelMapping,
  auditOperationTypeTagMapping,
} from '@/types/auditlog'
import { useExcelExport } from '@/composables/useExcelExport'
import type { ColumnConfig } from '@/utils/excelExporter'
import { exactFormatDate } from '@/utils/Format'

const route = useRoute()
const router = useRouter()

const isChildRouteActive = computed(() => {
  return route.name !== 'AuditLogDetails' && route.name === 'AuditLogDetail'
})

const handleMaskBack = () => {
  router.push({ name: 'AuditLogDetails' })
}

// ===== 状态 =====
const loading = ref(false)
const tableData = ref<AuditLog[]>([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// ===== 筛选 =====
const filterForm = ref({
  app_label: '',
  operation_type: '',
  operator_jobcode: '',
  record_code: '',
})
const dateRange = ref<[string, string] | null>(null)

// ===== 数据加载 =====
const loadData = async () => {
  loading.value = true
  try {
    const params: AuditLogQueryParams = {
      page: currentPage.value,
      page_size: pageSize.value,
    }
    if (filterForm.value.app_label) params.app_label = filterForm.value.app_label
    if (filterForm.value.operation_type) params.operation_type = filterForm.value.operation_type
    if (filterForm.value.operator_jobcode)
      params.operator_jobcode = filterForm.value.operator_jobcode
    if (filterForm.value.record_code) params.record_code = filterForm.value.record_code
    if (dateRange.value) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    const response = await auditLogAPI.getAuditLogs(params)
    tableData.value = response.results
    total.value = response.count
  } catch {
    ElMessage.error('加载审计日志失败')
  } finally {
    loading.value = false
  }
}

const handleFilter = () => {
  currentPage.value = 1
  loadData()
}

const handleReset = () => {
  filterForm.value = { app_label: '', operation_type: '', operator_jobcode: '', record_code: '' }
  dateRange.value = null
  handleFilter()
}

const handleSizeChange = () => {
  currentPage.value = 1
  loadData()
}

const handleCurrentChange = () => {
  loadData()
}

const handleRowClick = (row: AuditLog) => {
  router.push({ name: 'AuditLogDetail', query: { logging_id: row.logging_id } })
}

// ===== Excel 导出 =====
const { exportList } = useExcelExport()
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
  await exportList({
    entityName: '审计日志',
    columns: exportColumns,
    currentData: tableData.value,
    totalCount: total.value,
    fetchAllData: async () => {
      const allData = await auditLogAPI.getAuditLogs({ page: 1, page_size: total.value || 1000 })
      return allData.results
    },
    sheetName: '审计日志',
  })
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
  z-index: 100;
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
    z-index: 1;
    width: 70%;
    max-width: 900px;
    margin: 32px auto;
    background: var(--card-background);
    border-radius: 8px;
    overflow-y: auto;
  }
}
</style>
