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
    <!-- 第一行：资产发放信息 + 用户信息 -->
    <el-row class="top-row" :gutter="16">
      <!-- 资产发放信息卡片 -->
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <el-card class="info-card distribute-card">
          <template #header>
            <div class="card-header">
              <el-icon><Download /></el-icon>
              <span>资产发放信息</span>
              <el-button
                link
                size="small"
                :icon="Refresh"
                @click="refreshData"
                :loading="dashboardStore.outAssetsLoading"
                class="refresh-btn"
              >
                刷新
              </el-button>
            </div>
          </template>
          <div class="statistics">
            <div class="stat-item">
              <div class="stat-number">{{ distributeStats.monthlyDistributed }}</div>
              <div class="stat-label">本月发放</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ distributeStats.totalDistributed }}</div>
              <div class="stat-label">总发放数</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ distributeStats.totalAssets }}</div>
              <div class="stat-label">总资产数</div>
            </div>
          </div>
          <div class="recent-list">
            <h4>最近发放记录</h4>
            <div class="list-item" v-for="item in recentOutAssets" :key="item.id">
              <div class="item-info">
                <span class="item-name">{{ item.asset_name }}</span>
                <span class="item-recipient">{{ item.recipient_name }}</span>
              </div>
              <span class="item-date">{{ formatDateTime(item.distribute_time) }}</span>
            </div>
            <div v-if="recentOutAssets.length === 0" class="empty-state">暂无发放记录</div>
          </div>
        </el-card>
      </el-col>

      <!-- 用户信息卡片 -->
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <el-card class="info-card user-info-card">
          <template #header>
            <div class="card-header">
              <div class="user-info-header">
                <el-icon><User /></el-icon>
                <span>用户信息</span>
              </div>
              <el-button type="primary" size="small" class="logout-btn" @click="logout"
                >退出</el-button
              >
            </div>
          </template>
          <div class="user-profile">
            <div class="user-avatar">
              <el-avatar :size="60">
                {{ authInfo.real_name ? authInfo.real_name.charAt(0) : 'U' }}
              </el-avatar>
            </div>
            <div class="user-details">
              <h3>{{ authInfo.real_name || '用户' }}</h3>
              <p>账号: {{ authInfo.auth_name || '--' }}</p>
            </div>
          </div>
          <div class="session-info">
            <div class="session-item">
              <span class="session-label">本次登录时长</span>
              <span class="session-value">{{ loginDuration }}</span>
            </div>
          </div>
          <div class="time-info">
            <p class="current-time">{{ currentTime }}</p>
            <p class="current-date">{{ currentDate }}</p>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 第二行：资产回收信息 + 其他资产信息 -->
    <el-row class="bottom-row" :gutter="16">
      <!-- 资产回收信息卡片 -->
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <el-card class="info-card recycle-card">
          <template #header>
            <div class="card-header">
              <el-icon><Upload /></el-icon>
              <span>资产回收信息</span>
              <el-button
                link
                size="small"
                :icon="Refresh"
                @click="refreshRecycleData"
                :loading="dashboardStore.recycleAssetsLoading"
                class="refresh-btn"
              >
                刷新
              </el-button>
            </div>
          </template>
          <div class="statistics">
            <div class="stat-item">
              <div class="stat-number">{{ recycleStats.monthlyRecycled }}</div>
              <div class="stat-label">本月回收</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ recycleStats.totalRecycled }}</div>
              <div class="stat-label">总回收数</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ recycleStats.inStockAssets }}</div>
              <div class="stat-label">在库资产</div>
            </div>
          </div>
          <div class="recent-list">
            <h4>最近回收记录</h4>
            <div class="list-item" v-for="item in recentRecycleAssets" :key="item.id">
              <div class="item-info">
                <span class="item-name">{{ item.asset_name }}</span>
                <span class="item-returner">{{ item.returner_name }}</span>
              </div>
              <span class="item-date">{{ formatDateTime(item.recycle_time) }}</span>
            </div>
            <div v-if="recentRecycleAssets.length === 0" class="empty-state">暂无回收记录</div>
          </div>
        </el-card>
      </el-col>

      <!-- 其他资产信息卡片 -->
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <el-card class="info-card other-info-card">
          <template #header>
            <div class="card-header">
              <el-icon><DataAnalysis /></el-icon>
              <span>其他资产信息</span>
            </div>
          </template>
          <div class="statistics">
            <div class="stat-item">
              <div class="stat-number pending-waste">{{ wasteStats.pendingWaste }}</div>
              <div class="stat-label">待报废</div>
            </div>
            <div class="stat-item">
              <div class="stat-number wasted">{{ wasteStats.wastedAssets }}</div>
              <div class="stat-label">已报废</div>
            </div>
          </div>
          <div class="waste-overview">
            <h4>报废状态概览</h4>
            <div class="waste-chart">
              <div class="waste-item">
                <div class="waste-bar pending">
                  <span>{{ wasteStats.pendingWaste }}</span>
                </div>
                <span class="waste-label">待报废</span>
              </div>
              <div class="waste-item">
                <div class="waste-bar wasted">
                  <span>{{ wasteStats.wastedAssets }}</span>
                </div>
                <span class="waste-label">已报废</span>
              </div>
            </div>
            <div class="waste-summary">
              <span>报废合计: {{ wasteStats.pendingWaste + wasteStats.wastedAssets }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { User, Download, Upload, DataAnalysis, Refresh } from '@element-plus/icons-vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import type { AuthInfo } from '@/utils/AuthUser'

// 初始化 Store
const dashboardStore = useDashboardStore()
const authStore = useAuthStore()

// 用户信息计算属性
const authInfo = computed(() => {
  const info = authStore.authInfo as AuthInfo | undefined
  if (!info) {
    return {
      real_name: '暂无用户',
      auth_name: '暂无管理员用户名',
    }
  }
  return {
    real_name: info.auth_username || '暂无用户',
    auth_name: info.auth_username || '暂无管理员用户名',
    isactive: info.isactive || false,
  }
})

// 当前时间信息
const currentTime = ref('')
const currentDate = ref('')

// 登录时长
// 使用 sessionStorage 持久化登录开始时间，避免组件卸载/重新挂载时重置
// 注意：sessionStorage 在同一浏览器会话内共享，关闭浏览器标签页后清除
const LOGIN_START_TIME_KEY = 'loginStartTime'
const loginDuration = ref('00:00:00')
const getLoginStartTime = (): number => {
  const stored = sessionStorage.getItem(LOGIN_START_TIME_KEY)
  if (stored) {
    const parsed = parseInt(stored, 10)
    if (!isNaN(parsed)) return parsed
  }
  // 首次访问时记录时间并持久化
  const now = Date.now()
  sessionStorage.setItem(LOGIN_START_TIME_KEY, String(now))
  return now
}
const loginStartTime = getLoginStartTime()

// 仪表盘数据
const distributeStats = computed(() => dashboardStore.distributeStats)
const recycleStats = computed(() => dashboardStore.recycleStats)
const wasteStats = computed(() => dashboardStore.wasteStats)
const recentOutAssets = computed(() => dashboardStore.recentOutAssets)
const recentRecycleAssets = computed(() => dashboardStore.recentRecycleAssets)

// 获取仪表盘数据
const fetchDashboardData = async () => {
  try {
    await dashboardStore.initDashboardData()
  } catch (error) {
    console.error('获取仪表盘数据失败:', error)
  }
}

// 刷新发放数据
const refreshData = async () => {
  ElMessage.info('正在刷新发放数据...')
  try {
    await dashboardStore.fetchRecentOutAssets(5)
    await dashboardStore.fetchDashboardOverview()
    ElMessage.success('发放数据刷新成功')
  } catch {
    ElMessage.error('刷新失败')
  }
}

// 刷新回收数据
const refreshRecycleData = async () => {
  ElMessage.info('正在刷新回收数据...')
  try {
    await dashboardStore.fetchRecentRecycleAssets(5)
    await dashboardStore.fetchDashboardOverview()
    ElMessage.success('回收数据刷新成功')
  } catch {
    ElMessage.error('刷新失败')
  }
}

// 退出登录状态（防止重复点击）
const isLoggingOut = ref(false)

// 退出登录
const logout = async () => {
  if (isLoggingOut.value) return // 防止重复点击
  isLoggingOut.value = true
  try {
    // 清除 sessionStorage 中的登录开始时间，下次登录时重新记录
    sessionStorage.removeItem(LOGIN_START_TIME_KEY)
    await authStore.logout() // 调用后端 API 作废 Token，并清除本地状态
    location.reload() // 退出成功后刷新页面，跳转到登录页
  } catch (error) {
    console.error('退出登录失败:', error)
    // 即使异常也刷新页面，因为 silentLogout 或 finally 已清除本地状态
    location.reload()
  } finally {
    isLoggingOut.value = false
  }
}

// 格式化日期时间
const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

// 更新时间
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  currentDate.value = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  // 更新登录时长
  const diff = Math.floor((now.getTime() - loginStartTime) / 1000)
  const hours = String(Math.floor(diff / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((diff % 3600) / 60)).padStart(2, '0')
  const seconds = String(diff % 60).padStart(2, '0')
  loginDuration.value = `${hours}:${minutes}:${seconds}`
}

// 定时器
let timer: number | null = null

// 组件挂载时启动定时器并获取数据
onMounted(async () => {
  // 登录开始时间已在上方通过 getLoginStartTime() 初始化（从 sessionStorage 恢复或首次记录）
  // 不再重置为 Date.now()，确保页面切换后登录时长连续计算

  // 更新时间
  updateTime()
  timer = window.setInterval(updateTime, 1000)

  // 获取仪表盘数据
  await fetchDashboardData()
})

// 组件卸载时清除定时器
onUnmounted(() => {
  if (timer) {
    window.clearInterval(timer)
  }
})
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
      background: rgba(255, 255, 255, 0.15);
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }
  }

  // 用户信息卡片样式
  .user-info-card {
    background: var(--gradient-pink);

    :deep(.el-card__header) {
      background: rgba(255, 255, 255, 0.15);
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }

    :deep(.el-card__body) {
      background: var(--gradient-pink);
      color: $white;
    }

    .user-profile {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;

      .user-avatar {
        flex-shrink: 0;
      }

      .user-details {
        h3 {
          margin: 0 0 4px 0;
          color: $white;
          font-size: 18px;
        }

        p {
          margin: 0;
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
        }
      }

      .logout-btn {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: $white;
        margin-left: auto;

        &:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      }
    }

    .session-info {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      backdrop-filter: blur(10px);

      .session-item {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .session-label {
          font-size: 13px;
          opacity: 0.9;
        }

        .session-value {
          font-size: 16px;
          font-weight: 600;
          font-family: 'Courier New', monospace;
        }
      }
    }

    .time-info {
      text-align: center;
      padding: 16px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      backdrop-filter: blur(10px);

      .current-time {
        font-size: 28px;
        font-weight: 700;
        margin: 0 0 8px 0;
        letter-spacing: 2px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }

      .current-date {
        font-size: 14px;
        margin: 0;
        opacity: 0.9;
      }
    }
  }

  // 资产回收卡片样式
  .recycle-card {
    background: var(--gradient-cyan);

    :deep(.el-card__header) {
      background: rgba(255, 255, 255, 0.15);
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }
  }

  // 其他资产信息卡片样式
  .other-info-card {
    background: var(--gradient-green);

    :deep(.el-card__header) {
      background: rgba(255, 255, 255, 0.15);
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }
  }

  .statistics {
    display: flex;
    justify-content: space-around;
    margin-bottom: 20px;

    .stat-item {
      text-align: center;

      .stat-number {
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 8px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

        &.pending-waste {
          color: $warning-color;
        }

        &.wasted {
          color: $danger-color;
        }
      }

      .stat-label {
        font-size: 13px;
        opacity: 0.85;
      }
    }
  }

  .recent-list {
    h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      opacity: 0.9;
      font-weight: 500;
    }

    .list-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-radius: 4px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      font-size: 13px;
      transition: background 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      &:last-child {
        border-bottom: none;
      }

      .item-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;

        .item-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-recipient,
        .item-returner {
          font-size: 12px;
          opacity: 0.8;
        }
      }

      .item-date {
        opacity: 0.8;
        margin-left: 12px;
        font-size: 12px;
      }
    }

    .empty-state {
      text-align: center;
      padding: 20px;
      opacity: 0.6;
      font-size: 13px;
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
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      text-align: center;
      font-size: 13px;
      opacity: 0.9;
    }
  }

  // 将原本泄漏到 .dashboard-page-content 外的 ::deep() 规则移入
  :deep(.el-card__header) {
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
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

    // 列表项响应式调整
    .recent-list {
      .list-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
        padding: 12px;

        .item-info {
          width: 100%;
        }

        .item-date {
          margin-left: 0;
          font-size: 11px;
        }
      }
    }

    // 用户信息卡片响应式调整
    .user-info-card {
      .user-profile {
        flex-direction: column;
        text-align: center;
        gap: 12px;

        .user-details {
          h3 {
            font-size: 16px;
          }

          p {
            font-size: 13px;
          }
        }
      }

      .session-info {
        padding: 8px 12px;

        .session-value {
          font-size: 14px;
        }
      }

      .time-info {
        padding: 12px;

        .current-time {
          font-size: 24px; // 缩小时间字体
        }

        .current-date {
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

    .user-info-card {
      .time-info {
        .current-time {
          font-size: 20px;
        }
      }
    }
  }
}
</style>
