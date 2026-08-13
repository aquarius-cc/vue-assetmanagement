<!-- TECHNICAL_DEBT: >500 lines -->
<!--
@file 仪表盘主页，展示资产统计、最近操作记录和用户信息
@component DashboardPage
@usedBy
  - router/index.ts: 首页路由组件
@dependsOn
  - composables/useDashboardPage: 仪表盘数据管理
  - components/DashboardStatCard: 统计卡片
  - components/DashboardUserInfo: 用户信息卡片
  - components/DashboardRecentList: 最近操作列表
  - utils/Format: 日期格式化
-->
<template>
  <div class="dashboard-page-content">
    <!--
      仪表盘布局设计

      响应式策略：
      - xs (<768px): 单列布局，每个卡片占满整行
      - sm (≥768px): 单列布局，保持可读性
      - md (≥992px): 双列布局，两个卡片并排
      - lg/xl (≥1200px): 双列布局，最优显示

      使用 Element Plus 的响应式栅格系统实现
    -->
    <!-- [修复] 加载失败提示 -->
    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      title="仪表盘数据加载失败"
      description="部分数据可能显示不完整，请重试"
      style="margin-bottom: 16px"
    >
      <template #action>
        <el-button type="primary" size="small" @click="retryFetchDashboard">重试</el-button>
      </template>
    </el-alert>
    <!-- 第一行：资产发放信息 + 用户信息 -->
    <el-row class="top-row" :gutter="16">
      <!-- 资产发放信息卡片 -->
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <DashboardStatCard
          title="资产发放信息"
          icon="Download"
          :stats="[
            { value: distributeStats.monthlyDistributed, label: '本月发放' },
            { value: distributeStats.totalDistributed, label: '总发放数' },
            { value: distributeStats.totalAssets, label: '总资产数' },
          ]"
          refreshable
          :loading="dashboardStore.outAssetsLoading"
          card-class="distribute-card"
          @refresh="refreshData"
        >
          <DashboardRecentList
            title="最近发放记录"
            :items="recentOutAssets"
            name-key="asset_name"
            operator-key="recipient_name"
            date-key="distribute_time"
            empty-text="暂无发放记录"
          />
        </DashboardStatCard>
      </el-col>

      <!-- 用户信息卡片 -->
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <DashboardUserInfo
          :auth-info="authInfo"
          :login-duration="loginDuration"
          :current-time="currentTime"
          :current-date="currentDate"
          @logout="logout"
        />
      </el-col>
    </el-row>

    <!-- 第二行：资产回收信息 + 其他资产信息 -->
    <el-row class="bottom-row" :gutter="16">
      <!-- 资产回收信息卡片 -->
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <DashboardStatCard
          title="资产回收信息"
          icon="Upload"
          :stats="[
            { value: recycleStats.monthlyRecycled, label: '本月回收' },
            { value: recycleStats.totalRecycled, label: '总回收数' },
            { value: recycleStats.inStockAssets, label: '在库资产' },
          ]"
          refreshable
          :loading="dashboardStore.recycleAssetsLoading"
          card-class="recycle-card"
          @refresh="refreshRecycleData"
        >
          <DashboardRecentList
            title="最近回收记录"
            :items="recentRecycleAssets"
            name-key="asset_name"
            operator-key="returner_name"
            date-key="recycle_time"
            empty-text="暂无回收记录"
          />
        </DashboardStatCard>
      </el-col>

      <!-- 资产状态全景卡片 -->
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <DashboardStatCard
          title="资产状态全景"
          icon="DataAnalysis"
          :stats="[]"
          card-class="status-overview-card"
        >
          <DashboardStatusOverview :status-overview="statusOverview" :chart-option="chartOption" />
        </DashboardStatCard>
      </el-col>
    </el-row>
  </div>
</template>

<script lang="ts" setup>
import DashboardStatCard from '@/components/commoncomponents/DashboardStatCard.vue'
import DashboardUserInfo from '@/components/commoncomponents/DashboardUserInfo.vue'
import DashboardRecentList from '@/components/commoncomponents/DashboardRecentList.vue'
import { useDashboardPage } from '@/composables/useDashboardPage'
import DashboardStatusOverview from '@/components/commoncomponents/DashboardStatusOverview.vue'

const {
  authInfo,
  currentTime,
  currentDate,
  loginDuration,
  distributeStats,
  recycleStats,
  // wasteStats,
  recentOutAssets,
  recentRecycleAssets,
  refreshData,
  refreshRecycleData,
  logout,
  dashboardStore,
  statusOverview, // [修复] 补充解构
  chartOption, // [修复] 补充解构
  loadError, // [修复] 新增
  retryFetchDashboard, // [修复] 新增
} = useDashboardPage()
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.dashboard-page-content {
  height: 100%;
  width: 100%;
  padding: 16px;
  box-sizing: border-box;
  background: $background-color;

  .top-row,
  .bottom-row {
    height: calc(50% - 8px);
    margin-bottom: 16px;
  }

  .info-card {
    height: 100%;
    border-radius: 12px;
    box-shadow: $card-shadow;
    transition: all 0.3s ease;
    border: none;

    &:hover {
      box-shadow: $card-hover-shadow;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-weight: 600;
      color: $white;
      padding: 16px 20px;
      border-radius: 12px 12px 0 0;

      .user-info-header {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .el-icon {
        font-size: 18px;
      }

      .refresh-btn {
        margin-left: auto;
        color: $white;
      }
    }
  }

  // 资产发放卡片样式
  .distribute-card {
    background: var(--gradient-purple);

    :deep(.el-card__header) {
      background: var(--overlay-white-light);
      border-bottom: 1px solid var(--overlay-white-medium);
    }
  }

  // 资产回收卡片样式
  .recycle-card {
    background: var(--gradient-cyan);

    :deep(.el-card__header) {
      background: var(--overlay-white-light);
      border-bottom: 1px solid var(--overlay-white-medium);
    }
  }

  // 其他资产信息卡片样式
  .other-info-card {
    background: var(--gradient-green);

    :deep(.el-card__header) {
      background: var(--overlay-white-light);
      border-bottom: 1px solid var(--overlay-white-medium);
    }
  }

  .waste-overview {
    h4 {
      margin: 0 0 16px 0;
      font-size: 14px;
      opacity: 0.9;
      font-weight: 500;
    }

    .waste-chart {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .waste-item {
        display: flex;
        align-items: center;
        gap: 8px;

        .waste-bar {
          flex: 1;
          height: 24px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: $white;
          font-size: 13px;
          font-weight: 600;
          min-width: 40px;

          &.pending {
            background: rgba(230, 162, 60, 0.8);
          }

          &.wasted {
            background: rgba(245, 108, 108, 0.8);
          }
        }

        .waste-label {
          width: 45px;
          font-size: 13px;
          opacity: 0.9;
        }
      }
    }

    .waste-summary {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid var(--overlay-white-medium);
      text-align: center;
      font-size: 13px;
      opacity: 0.9;
    }
  }

  // 将原本泄漏到 .dashboard-page-content 外的 ::deep() 规则移入
  :deep(.el-card__header) {
    padding: 16px 20px;
    border-bottom: 1px solid var(--overlay-white-medium);
  }

  :deep(.el-card__body) {
    padding: 20px;
    height: calc(100% - 60px);
    overflow-y: auto;
  }

  /**
   * 响应式布局优化
   *
   * 断点说明：
   * - < 768px (xs/sm): 移动端，单列布局，调整字体和间距
   * - 768px - 991px (md): 平板端，保持单列但增加间距
   * - ≥ 992px (lg/xl): 桌面端，双列布局
   */

  /* 平板端适配 (768px - 991px) */
  @media (max-width: 991px) {
    .top-row,
    .bottom-row {
      height: auto; // 取消固定高度，允许内容自适应
      min-height: calc(50% - 8px);
    }

    .info-card {
      margin-bottom: 16px; // 增加卡片间距
    }
  }

  /* 移动端适配 (< 768px) */
  @media (max-width: 767px) {
    padding: 12px;

    .top-row,
    .bottom-row {
      height: auto;
      margin-bottom: 0;
    }

    .info-card {
      margin-bottom: 12px;
      border-radius: 8px;

      .card-header {
        padding: 12px 16px;
        border-radius: 8px 8px 0 0;

        .el-icon {
          font-size: 16px;
        }
      }
    }

    // 统计区域响应式调整
    .statistics {
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 16px;

      .stat-item {
        flex: 1;
        min-width: 80px;

        .stat-number {
          font-size: 24px; // 缩小字体
        }

        .stat-label {
          font-size: 12px;
        }
      }
    }

    // 报废概览响应式调整
    .waste-overview {
      .waste-chart {
        .waste-item {
          .waste-bar {
            height: 20px;
            font-size: 12px;
          }
        }
      }
    }
  }

  /* 小屏移动端适配 (< 480px) */
  @media (max-width: 479px) {
    padding: 8px;

    .statistics {
      .stat-item {
        .stat-number {
          font-size: 20px;
        }
      }
    }
  }
}
// 资产状态全景卡片样式
.status-overview-card {
  background: var(--gradient-green);

  :deep(.el-card__header) {
    background: var(--overlay-white-light);
    border-bottom: 1px solid var(--overlay-white-medium);
  }
}
</style>
