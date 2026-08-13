<!--
@file 资产状态全景卡片，展示按分组的状态列表和环形图
@component DashboardStatusOverview
@usedBy
  - components/DashboardPage.vue: 右下角卡片内容
@dependsOn
  - echarts/vue-echarts: 环形图渲染
-->
<template>
  <div class="status-overview">
    <!-- 左侧：分组状态列表 -->
    <div class="status-groups">
      <div v-for="group in statusOverview.groups" :key="group.key" class="status-group">
        <div class="group-header">
          <span class="group-dot" :style="{ background: group.color }"></span>
          <span class="group-label">{{ group.label }}</span>
          <span class="group-total">{{ group.total }}</span>
        </div>
        <div class="group-items">
          <div v-for="item in group.items" :key="item.code" class="status-row">
            <span class="status-name">{{ item.name }}</span>
            <div class="status-bar-track">
              <div
                class="status-bar-fill"
                :style="{
                  width: statusOverview.totalAssets
                    ? (item.count / statusOverview.totalAssets) * 100 + '%'
                    : '0%',
                  background: item.color,
                }"
              ></div>
            </div>
            <span class="status-count">{{ item.count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧：环形图 -->
    <div class="status-chart">
      <v-chart
        v-if="statusOverview.chartData.length > 0"
        :option="chartOption"
        autoresize
        class="chart-instance"
      />
      <div v-else class="chart-empty">
        <span>暂无数据</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { VChart } from '@/plugins/echarts'

/** 状态全景数据（由 useDashboardPage composable 提供） */
// 修复后 — 移除 const props = 赋值
defineProps<{
  statusOverview: {
    groups: Array<{
      key: string
      label: string
      color: string
      total: number
      items: Array<{ code: string; name: string; count: number; color: string }>
    }>
    chartData: Array<{ name: string; value: number; itemStyle: { color: string } }>
    totalAssets: number
  }
  chartOption: EChartsOption
}>()
</script>

<style scoped lang="scss">
.status-overview {
  display: flex;
  gap: 16px;
  height: 100%;

  .status-groups {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
  }

  .status-group {
    .group-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
      font-weight: 600;
      font-size: 13px;

      .group-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      .group-label {
        flex: 1;
      }

      .group-total {
        font-size: 14px;
        font-weight: 700;
      }
    }

    .group-items {
      padding-left: 14px;
    }

    .status-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
      font-size: 12px;

      .status-name {
        width: 50px;
        flex-shrink: 0;
        opacity: 0.85;
      }

      .status-bar-track {
        flex: 1;
        height: 6px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 3px;
        overflow: hidden;
      }

      .status-bar-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.6s ease;
      }

      .status-count {
        width: 24px;
        text-align: right;
        font-weight: 600;
        flex-shrink: 0;
      }
    }
  }

  .status-chart {
    width: 180px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    .chart-instance {
      width: 180px;
      height: 180px;
    }

    .chart-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      opacity: 0.5;
      font-size: 13px;
    }
  }
}

/* 平板端适配 (≤991px) */
@media (max-width: 991px) {
  .status-overview {
    .status-chart {
      width: 140px;

      .chart-instance {
        width: 140px;
        height: 140px;
      }
    }
  }
}

/* 移动端适配 (≤767px) */
@media (max-width: 767px) {
  .status-overview {
    flex-direction: column;

    .status-chart {
      width: 100%;
      height: 200px;

      .chart-instance {
        width: 200px;
        height: 200px;
      }
    }
  }
}
</style>
