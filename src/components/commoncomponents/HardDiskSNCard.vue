<!--
@file 硬盘序列号卡片，以表格形式展示资产的硬盘序列号信息
@component HardDiskSNCard
@usedBy
  - detils/BasicAssetDetails.vue: 资产基本信息详情页
@dependsOn
  - utils/statusMapping: 硬盘状态映射
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
      <el-table-column prop="harddisk_description" label="描述">
        <template #default="{ row }">
          {{ row.harddisk_description || '-' }}
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
import type { HardDiskSN } from '@/types/harddisksn'
import { HardDiskType } from '@/types/harddisksn'
import { getHardDiskStatusText, getHardDiskStatusTagType } from '@/utils/statusMapping'

// ===== Props 定义 =====
interface Props {
  /**
   * 硬盘序列号列表
   * 从父组件传入的硬盘数据数组
   */
  harddiskSns: HardDiskSN[]

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
