<!--
@file 硬盘序列号列表页面，展示所有硬盘序列号信息并支持增删改查操作
@component HardDiskSNDetails
@usedBy
  - views/HardDiskSNDetails.vue: 通过 router-view 渲染硬盘序列号列表
@dependsOn
  - composables/useSmartListConfig: 列表配置
  - stores/harddiskSnStore: 硬盘序列号数据管理
  - components/commoncomponents/SmartListContainer: 数据管理容器
  - components/commoncomponents/CommonList: 列表展示组件
-->
<template>
  <div class="harddisk-sn-details-root">
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
            v-model:search="slotProps.search"
            :total="slotProps.total"
            :columns="columns"
            :enable-search="true"
            :detail-route-name="'HardDiskSNBasicDetails'"
            :show-detail-button="true"
            :show-actions="true"
            :enable-edit="true"
            :enable-delete="true"
            :enable-selection="true"
            :action-column-width="180"
            :page-size-options="slotProps.pageSizeOptions"
            @edit="handleEdit"
            @delete="handleDelete"
            @size-change="slotProps.handleSizeChange"
            @current-change="slotProps.handleCurrentChange"
            @search="slotProps.performSearch"
            @selection-change="slotProps.handleSelectionChange"
          >
            <!-- 硬盘类型列自定义渲染（使用 el-tag） -->
            <template #harddisk_type="{ row }">
              <el-tag :type="getHardDiskTypeTagType(row.harddisk_type)">
                {{ getHardDiskTypeText(row.harddisk_type) }}
              </el-tag>
            </template>

            <!-- 硬盘状态列自定义渲染（使用 el-tag） -->
            <template #harddisk_status="{ row }">
              <el-tag :type="getHardDiskStatusTagType(row.harddisk_status)">
                {{ getHardDiskStatusText(row.harddisk_status) }}
              </el-tag>
            </template>
          </CommonList>

          <!-- 底部按钮组 -->
          <div class="bottom-buttons">
            <el-button type="success" @click="handleAdd">新增硬盘序列号</el-button>
            <el-button type="primary" @click="handleExportExcel">导出Excel</el-button>
            <!-- 批量删除按钮：当选中数据时可用 -->
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
defineOptions({ name: 'HardDiskSNDetails' })

// ===== 导入顺序：Vue 核心 → 第三方库 → @/ 内部模块 =====
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import SmartListContainer from '@/components/commoncomponents/SmartListContainer.vue'
import CommonList from '@/components/commoncomponents/CommonList.vue'
import type { TableColumn } from '@/types/list'
import { useSmartListConfig } from '@/composables/useSmartListConfig'
import type { ColumnConfig } from '@/utils/excelExporter'
import { exportToExcel } from '@/utils/excelExporter'
import type { HardDiskSN } from '@/types/harddisksn'
import { HardDiskType } from '@/types/harddisksn'
import { useHardDiskSnStore } from '@/stores/harddiskSnStore'
import { getHardDiskStatusText, getHardDiskStatusTagType } from '@/utils/statusMapping'
import type { SmartListContainerExpose } from '@/types/common'

// ===== 状态与实例 =====
const harddiskSnStore = useHardDiskSnStore()
const route = useRoute()
const router = useRouter()

/**
 * SmartListContainer 组件引用
 * 用于调用容器暴露的方法（如 refresh、reset）
 *
 * 使用 SmartListContainerExpose 类型确保类型安全
 * 该类型定义了组件通过 expose 暴露的所有方法
 */
const smartListRef = ref<SmartListContainerExpose | null>(null)

/**
 * 子路由激活状态
 * 用于控制子路由遮罩层的显示
 */
const isChildRouteActive = ref(false)

// ===== 硬盘类型辅助函数 =====

/**
 * 根据硬盘类型返回 el-tag 的类型
 * @param type 硬盘类型字符串
 * @returns Element Plus Tag 类型
 */
const getHardDiskTypeTagType = (
  type: string | null | undefined,
): 'success' | 'warning' | 'danger' | 'info' | '' => {
  switch (type) {
    case HardDiskType.SSD:
      return 'success'
    case HardDiskType.NVMe:
      return 'warning'
    case HardDiskType.HDD:
      return 'info'
    default:
      return ''
  }
}

/**
 * 根据硬盘类型返回中文显示文本
 * @param type 硬盘类型字符串
 * @returns 中文描述
 */
const getHardDiskTypeText = (type: string | null | undefined): string => {
  switch (type) {
    case HardDiskType.HDD:
      return '机械硬盘'
    case HardDiskType.SSD:
      return '固态硬盘'
    case HardDiskType.NVMe:
      return 'NVMe硬盘'
    case HardDiskType.OTHER:
      return '其他'
    default:
      return '未知'
  }
}

// ===== 表格列配置 =====
const columns: TableColumn[] = [
  { type: 'index', label: '序号', width: 60, align: 'center' },
  { prop: 'asset_code', label: '资产编码', width: 150, align: 'center' },
  { prop: 'asset_name', label: '资产名称', width: 150, align: 'left' },
  { prop: 'harddisk_no', label: '硬盘编号', width: 100, align: 'center' },
  { prop: 'harddisk_sn_code', label: '硬盘序列号', width: 180, align: 'center' },
  {
    type: 'custom',
    prop: 'harddisk_type',
    label: '硬盘类型',
    width: 100,
    align: 'center',
    slotName: 'harddisk_type',
  },
  { prop: 'harddisk_number', label: '硬盘数量', width: 100, align: 'center' },
  {
    type: 'custom',
    prop: 'harddisk_status',
    label: '硬盘状态',
    width: 100,
    align: 'center',
    slotName: 'harddisk_status',
  },
  { prop: 'harddisk_description', label: '描述', width: 150, align: 'left' },
]

// ===== SmartListContainer 配置 =====
/**
 * Store 配置对象
 * 传递给 SmartListContainer 用于数据管理
 *
 * 包含：
 * - getList: 获取列表数据的方法
 * - pagination: 分页状态（使用 getter/setter 实现双向绑定）
 * - list: 列表数据（computed）
 * - loading: 加载状态（computed）
 * - search: 搜索配置（可选）
 */
const storeConfig = useSmartListConfig<HardDiskSN>({
  store: harddiskSnStore,
  entityName: '硬盘序列号',
})

// ===== 路由监听：控制子路由遮罩 =====
/**
 * 监听路由变化，判断是否需要显示子路由遮罩层
 * 当访问子路由（如表单页、详情页）时显示遮罩
 */
watch(
  () => route.matched,
  (matched) => {
    const hasParent = matched.some((item) => item.name === 'HardDiskSNDetails')
    const isSelfTop = matched[matched.length - 1]?.name === 'HardDiskSNDetails'
    isChildRouteActive.value = hasParent && !isSelfTop
  },
  { immediate: true },
)

// ===== 事件处理 =====

/**
 * 编辑硬盘序列号记录
 * 跳转到编辑表单页
 * @param row 硬盘序列号记录
 */
const handleEdit = (row: HardDiskSN) => {
  if (!row.harddisk_sn_code) {
    ElMessage.error('硬盘序列号不存在，无法编辑')
    return
  }
  router
    .push({
      name: 'HardDiskSNForm',
      query: { assetCode: row.asset_code, harddiskSnCode: String(row.harddisk_sn_code) },
    })
    .catch((err) => {
      console.error('编辑跳转失败:', err)
      ElMessage.error('跳转编辑页失败，请重试')
    })
}

/**
 * 删除硬盘序列号记录
 * 显示确认对话框，确认后调用 store 删除方法
 * 删除成功后刷新列表
 * @param row 硬盘序列号记录
 */
const handleDelete = (row: HardDiskSN) => {
  if (!row.recordcode) {
    ElMessage.error('硬盘记录编码不存在，无法删除')
    return
  }
  ElMessageBox.confirm('确定要删除该硬盘序列号记录吗？', '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      return harddiskSnStore.remove(String(row.recordcode))
    })
    .then(() => {
      ElMessage.success('删除成功')
      // 删除成功后刷新列表
      // 使用可选链操作符安全调用 refresh 方法
      smartListRef.value?.refresh()
    })
    .catch((error) => {
      if (error !== 'cancel') {
        console.error('删除失败:', error)
        ElMessage.error('删除失败，请刷新页面重试')
      }
    })
}

/**
 * 批量删除
 * 弹出确认框，确认后调用 store.removeBatch 执行批量删除
 * @param rows 选中的行数据
 */
const handleBatchDelete = async (rows: HardDiskSN[] | undefined) => {
  if (!rows || rows.length === 0) {
    ElMessage.warning('请先选择要删除的数据')
    return
  }

  // 提取选中的 recordcode 作为删除标识
  const codes = rows.map((row) => row.recordcode).filter((code): code is string => !!code)

  if (codes.length === 0) {
    ElMessage.error('无法删除：选中的数据缺少唯一标识')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${codes.length} 条数据吗？删除后数据不可恢复！`,
      '批量删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    await harddiskSnStore.removeBatch(codes)
    smartListRef.value?.clearSelection()
    await smartListRef.value?.refresh()
  } catch (err) {
    if (err === 'cancel') return
    console.error('批量删除失败:', err)
    ElMessage.error('批量删除失败，请重试')
  }
}

/**
 * 新增硬盘序列号
 * 跳转到新增表单页
 */
const handleAdd = () => {
  console.log('点击新增硬盘序列号')
  router.push({ name: 'HardDiskSNForm', query: {} }).catch((err) => {
    console.error('新增跳转失败:', err)
    ElMessage.error('跳转新增页失败，请重试')
  })
}

/**
 * 导出 Excel
 * 支持导出当前页或全部数据
 */
const handleExportExcel = async () => {
  const exportColumns: ColumnConfig<HardDiskSN>[] = [
    { title: '资产编码', key: 'asset_code', default: '' },
    { title: '资产名称', key: 'asset_name', default: '' },
    { title: '硬盘编号', key: 'harddisk_no', default: '', formatter: (val) => String(val) },
    { title: '硬盘序列号', key: 'harddisk_sn_code', default: '' },
    {
      title: '硬盘类型',
      key: 'harddisk_type',
      default: '',
      formatter: (val) => getHardDiskTypeText(val as string),
    },
    { title: '硬盘数量', key: 'harddisk_number', default: '', formatter: (val) => String(val) },
    {
      title: '硬盘状态',
      key: 'harddisk_status',
      default: '',
      formatter: (val) => getHardDiskStatusText(val as string),
    },
    { title: '用户工号', key: 'harddisk_user_jobcode', default: '' },
    { title: '描述', key: 'harddisk_description', default: '' },
  ]

  let range: 'current' | 'all' | null = null
  try {
    await ElMessageBox.confirm(
      `当前页面 ${harddiskSnStore.list.length} 条，总共 ${harddiskSnStore.pagination.total} 条。请选择：`,
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

  let exportData: HardDiskSN[] = []
  let fileName = ''

  if (range === 'current') {
    exportData = harddiskSnStore.list
    fileName = `硬盘序列号列表_当前页面_${harddiskSnStore.list.length}条.xlsx`
  } else if (range === 'all') {
    ElMessage.info('正在准备全部数据，请稍候...')
    if (harddiskSnStore.pagination.total > 1000) {
      const confirm = await ElMessageBox.confirm(
        '数据量较大，导出可能需要一些时间，是否继续？',
        '导出确认',
        { confirmButtonText: '继续', cancelButtonText: '取消', type: 'warning' },
      ).catch(() => false)
      if (!confirm) return
    }
    try {
      const allData = await harddiskSnStore.getList({
        page: 1,
        page_size: harddiskSnStore.pagination.total,
      })
      exportData = allData
      fileName = `硬盘序列号列表_全部_${allData.length}条.xlsx`
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
    sheetName: '硬盘序列号列表',
    confirmMessage: `确定要导出 ${exportData.length} 条硬盘序列号数据吗？`,
    emptyMessage: '暂无硬盘序列号数据可导出',
    successMessage: '硬盘序列号数据导出成功',
    errorMessage: '硬盘序列号数据导出失败，请重试',
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

.harddisk-sn-details-root {
  @include list-container;
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
