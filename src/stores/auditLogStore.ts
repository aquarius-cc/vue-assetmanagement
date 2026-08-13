/**
 * @file 审计日志 Store，只读模块，支持筛选和分页查询
 * @module stores/auditLogStore
 * @exports
 *   - useAuditLogStore: 审计日志状态 Store
 * @callers
 *   - components/componentsdetails/AuditLogDetails.vue（间接引用）
 * @dependsOn
 *   - api/auditLog: 审计日志 API 接口
 *   - types/auditlog: 审计日志类型定义
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auditLogAPI } from '@/api/auditLog'
import type { AuditLog, AuditLogQueryParams, AuditLogListResponse } from '@/types/auditlog'

export const useAuditLogStore = defineStore('auditLog', () => {
  // ===== 状态 =====
  const loading = ref(false)
  const tableData = ref<AuditLog[]>([])
  const currentPage = ref(1)
  const pageSize = ref(20)
  const total = ref(0)

  // ===== 筛选条件 =====
  const filterForm = ref<AuditLogQueryParams>({
    app_label: '',
    operation_type: '',
    operator_jobcode: '',
    record_code: '',
  })
  const dateRange = ref<[string, string] | null>(null)

  // ===== 数据加载 =====
  async function loadData() {
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
      const response: AuditLogListResponse = await auditLogAPI.getAuditLogs(params)
      tableData.value = response.results
      total.value = response.count
    } catch {
      // 错误由组件处理
    } finally {
      loading.value = false
    }
  }

  // ===== 筛选操作 =====
  function handleFilter() {
    currentPage.value = 1
    loadData()
  }

  function handleReset() {
    filterForm.value = {
      app_label: '',
      operation_type: '',
      operator_jobcode: '',
      record_code: '',
    }
    dateRange.value = null
    handleFilter()
  }

  // ===== 分页操作 =====
  function handleSizeChange() {
    currentPage.value = 1
    loadData()
  }

  function handleCurrentChange() {
    loadData()
  }

  // ===== 导出数据获取 =====
  async function fetchAllData(): Promise<AuditLog[]> {
    const response = await auditLogAPI.getAuditLogs({
      page: 1,
      page_size: 100, // 与后端 MAX_PAGE_SIZE 对齐，超限会被静默钳位
    })
    return response.results
  }

  return {
    // 状态
    loading,
    tableData,
    currentPage,
    pageSize,
    total,
    filterForm,
    dateRange,
    // 操作
    loadData,
    handleFilter,
    handleReset,
    handleSizeChange,
    handleCurrentChange,
    fetchAllData,
  }
})
