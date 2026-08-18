<!--
@file 仪表盘主页，4×2 网格布局
@component DashboardPage
@usedBy
  - router/index.ts: 首页路由组件
@dependsOn
  - composables/useDashboardPage: 仪表盘数据管理
  - components/DashboardStatCard: 统计卡片
  - components/DashboardUserInfo: 用户信息卡片
  - components/DashboardRecentList: 最近操作列表
  - components/DashboardStatusOverview: 状态全景
  - components/DashboardTrendSection: 趋势折线图
  - components/DashboardDistributionSection: 双饼图
  - components/DashboardAlertsSection: 双列表
-->
<template>
  <div class="dashboard-page-content">
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

    <!-- Row 1: 发放 + 回收 -->
    <el-row class="grid-row" :gutter="16">
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
            date-key="outasset_date"
            empty-text="暂无发放记录"
          />
        </DashboardStatCard>
      </el-col>
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
            date-key="recycle_asset_date"
            empty-text="暂无回收记录"
          />
        </DashboardStatCard>
      </el-col>
    </el-row>

    <!-- Row 2: 状态全景 + 趋势图 -->
    <el-row class="grid-row" :gutter="16">
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
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <DashboardTrendSection
          :chart-option="trendChartOption"
          :loading="trendLoading"
          @month-change="handleMonthChange"
        />
      </el-col>
    </el-row>

    <!-- Row 3: 部门分布 + 类型分布饼图 -->
    <DashboardDistributionSection
      :dept-pie-option="deptPieOption"
      :type-pie-option="typePieOption"
      :dept-loading="deptDistLoading"
      :type-loading="typeDistLoading"
    />

    <!-- Row 4: 即将到期 + 维护提醒 -->
    <DashboardAlertsSection
      :expiring-assets="expiringAssets"
      :maintenance-reminders="maintenanceReminders"
      :expiring-loading="expiringLoading"
      :maintenance-loading="maintenanceLoading"
      @select-asset="handleSelectAsset"
    />

    <!-- 用户信息 -->
    <DashboardUserInfo
      :auth-info="authInfo"
      :login-duration="loginDuration"
      :current-time="currentTime"
      :current-date="currentDate"
      @logout="logout"
    />
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router'
import DashboardStatCard from '@/components/commoncomponents/DashboardStatCard.vue'
import DashboardUserInfo from '@/components/commoncomponents/DashboardUserInfo.vue'
import DashboardRecentList from '@/components/commoncomponents/DashboardRecentList.vue'
import DashboardStatusOverview from '@/components/commoncomponents/DashboardStatusOverview.vue'
import DashboardTrendSection from '@/components/DashboardTrendSection.vue'
import DashboardDistributionSection from '@/components/DashboardDistributionSection.vue'
import DashboardAlertsSection from '@/components/DashboardAlertsSection.vue'
import { useDashboardPage } from '@/composables/useDashboardPage'

const router = useRouter()

const {
  authInfo,
  currentTime,
  currentDate,
  loginDuration,
  distributeStats,
  recycleStats,
  recentOutAssets,
  recentRecycleAssets,
  refreshData,
  refreshRecycleData,
  logout,
  dashboardStore,
  statusOverview,
  chartOption,
  loadError,
  retryFetchDashboard,
  assetTrend: _assetTrend,
  departmentDistribution: _departmentDistribution,
  assetTypeDistribution: _assetTypeDistribution,
  expiringAssets,
  maintenanceReminders,
  trendLoading,
  deptDistLoading,
  typeDistLoading,
  expiringLoading,
  maintenanceLoading,
  trendChartOption,
  deptPieOption,
  typePieOption,
} = useDashboardPage()

const handleMonthChange = (dateRange: string) => {
  const [start_date, end_date] = dateRange.split('|')
  dashboardStore.fetchAssetTrend({ start_date, end_date })
}

const handleSelectAsset = (assetCode: string) => {
  router.push(`/main/assetdetails/${assetCode}`)
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.dashboard-page-content {
  height: 100%;
  width: 100%;
  padding: 16px;
  box-sizing: border-box;
  background: $background-color;

  .grid-row {
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
  }

  .distribute-card {
    background: var(--gradient-purple);

    :deep(.el-card__header) {
      background: var(--overlay-white-light);
      border-bottom: 1px solid var(--overlay-white-medium);
    }
  }

  .recycle-card {
    background: var(--gradient-cyan);

    :deep(.el-card__header) {
      background: var(--overlay-white-light);
      border-bottom: 1px solid var(--overlay-white-medium);
    }
  }

  .status-overview-card {
    background: var(--gradient-green);

    :deep(.el-card__header) {
      background: var(--overlay-white-light);
      border-bottom: 1px solid var(--overlay-white-medium);
    }
  }

  :deep(.el-card__header) {
    padding: 16px 20px;
    border-bottom: 1px solid var(--overlay-white-medium);
  }

  :deep(.el-card__body) {
    padding: 20px;
    height: calc(100% - 60px);
    overflow-y: auto;
  }

  @media (max-width: 991px) {
    .grid-row {
      margin-bottom: 16px;
    }

    .info-card {
      margin-bottom: 16px;
    }
  }

  @media (max-width: 767px) {
    padding: 12px;

    .grid-row {
      margin-bottom: 12px;
    }

    .info-card {
      margin-bottom: 12px;
      border-radius: 8px;

      .card-header {
        padding: 12px 16px;
        border-radius: 8px 8px 0 0;
      }
    }
  }

  @media (max-width: 479px) {
    padding: 8px;
  }
}
</style>
