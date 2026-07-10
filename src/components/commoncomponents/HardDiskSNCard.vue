<!--
  HardDiskSNCard.vue
  硬盘序列号卡片组件

  @description
  以表格形式展示资产的硬盘序列号信息，支持新增操作。
  与 InfoCard 不同，此组件用于展示列表数据而非键值对。

  @features
  - 表格展示：支持多行硬盘数据展示
  - 类型映射：自动将硬盘类型枚举转换为中文
  - 状态标签：状态字段以彩色标签形式展示
  - 新增功能：支持跳转到新增表单页面

  @usage
  ```vue
  <HardDiskSNCard
    :harddisk-sns="harddiskSns"
    :asset-code="assetCode"
    @refresh="handleRefresh"
  />
  ```

  @props
  - harddiskSns: 硬盘序列号列表
  - assetCode: 当前资产编码（用于新增时传递）

  @events
  - refresh: 新增成功后的回调（可选）

  @author System
  @date 2025-06-02
-->

<template>
  <el-card class="info-card" shadow="hover">
    <!-- 卡片头部：图标 + 标题 + 新增按钮 -->
    <template #header>
      <div class="section-header">
        <div class="header-left">
          <el-icon><Coin /></el-icon>
          <span class="section-title">硬盘序列号信息</span>
        </div>
        <el-button type="primary" :icon="Plus" size="small" @click="handleAdd"> 新增 </el-button>
      </div>
    </template>

    <!-- 硬盘列表表格 -->
    <el-table :data="harddiskSns" stripe border>
      <el-table-column prop="harddisk_no" label="硬盘编号" width="100" align="center" />
      <el-table-column prop="harddisk_sn_code" label="硬盘序列号" />
      <el-table-column prop="harddisk_type" label="类型" width="120" align="center">
        <template #default="{ row }">
          {{ getHardDiskTypeText(row.harddisk_type) }}
        </template>
      </el-table-column>
      <el-table-column prop="harddisk_status" label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="getHardDiskStatusTagType(row.harddisk_status)" size="small">
            {{ getHardDiskStatusText(row.harddisk_status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="harddisk_sn_description" label="描述">
        <template #default="{ row }">
          {{ row.harddisk_sn_description || '-' }}
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script lang="ts">
/**
 * 组件名称定义
 * 用于在 Vue DevTools 中识别组件
 */
export default {
  name: 'HardDiskSNCard',
}
</script>

<script lang="ts" setup>
// ===== 导入 =====
import { useRouter } from 'vue-router'
import { Plus, Coin } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { HardDiskSNListResponse } from '@/utils/HardDiskSN'
import { HardDiskType, HardDiskStatus } from '@/utils/HardDiskSN'

// ===== Props 定义 =====
interface Props {
  /**
   * 硬盘序列号列表
   * 从父组件传入的硬盘数据数组
   */
  harddiskSns: HardDiskSNListResponse[]

  /**
   * 当前资产编码
   * 用于新增硬盘时关联资产
   */
  assetCode: string
}

const props = defineProps<Props>()

// ===== 路由实例 =====
const router = useRouter()

// ===== 硬盘类型映射函数 =====

/**
 * 获取硬盘类型中文文本
 *
 * @param type - 硬盘类型枚举值
 * @returns 中文类型名称
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

/**
 * 获取硬盘状态标签样式
 *
 * @param status - 硬盘状态枚举值
 * @returns Element Plus Tag 组件的 type 属性值
 */
const getHardDiskStatusTagType = (
  status: string | null | undefined,
): 'success' | 'warning' | 'danger' | 'info' => {
  switch (status) {
    case HardDiskStatus.ACTIVE:
      return 'success'
    case HardDiskStatus.REPAIR:
      return 'warning'
    case HardDiskStatus.SCRAP:
      return 'danger'
    case HardDiskStatus.LOST:
      return 'danger'
    case HardDiskStatus.DAMAGED:
      return 'danger'
    default:
      return 'info'
  }
}

/**
 * 获取硬盘状态中文文本
 *
 * @param status - 硬盘状态枚举值
 * @returns 中文状态名称
 */
const getHardDiskStatusText = (status: string | null | undefined): string => {
  switch (status) {
    case HardDiskStatus.ACTIVE:
      return '正常'
    case HardDiskStatus.REPAIR:
      return '维修'
    case HardDiskStatus.SCRAP:
      return '报废'
    case HardDiskStatus.LOST:
      return '丢失'
    case HardDiskStatus.DAMAGED:
      return '损坏'
    default:
      return '未知'
  }
}

// ===== 事件处理 =====

/**
 * 新增硬盘序列号
 * 跳转到新增表单页面，携带资产编码参数
 */
const handleAdd = () => {
  if (!props.assetCode) {
    ElMessage.error('资产编码不存在，无法新增硬盘')
    return
  }
  console.log('HardDiskSNCard点击新增硬盘序列号，资产编码:', props.assetCode)
  router
    .push({
      name: 'HardDiskSNForm',
      query: { assetCode: props.assetCode },
    })
    .catch((err) => {
      console.error('跳转新增页面失败:', err)
      ElMessage.error('跳转失败，请重试')
    })
}
</script>

<style lang="scss" scoped>
// ===== 卡片容器 =====
.info-card {
  margin-bottom: 20px;
}

// ===== 头部样式 =====
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .el-icon {
    font-size: 18px;
    color: var(--el-color-primary);
  }

  .section-title {
    font-weight: 600;
    color: var(--text-primary);
  }
}
</style>
