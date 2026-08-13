/**
 * @file Dashboard 页面数据获取与交互逻辑（时钟、登录时长、统计数据、退出）
 * @module composables/useDashboardPage.ts
 * @description
 *   - 提供 Dashboard 页面的获取与交互逻辑
 *   - 包含时钟、登录时长、统计数据、退出等功能
 *   - 提供退出登录的功能
 * @returns
 *   - useDashboardPage: Dashboard 页面 composable 函数
 * @example
 *   - Dashboard 页面 composable 函数调用示例
 *   ```ts
 *   import { useDashboardPage } from '@/composables/useDashboardPage'
 *   const { authInfo, currentTime, currentDate, loginDuration, distributeStats, recycleStats, wasteStats, recentOutAssets, recentRecycleAssets } = useDashboardPage()
 *   ```
 * @todo
 *   - [ ] Dashboard 页面 composable 函数的测试用例
 * @callers
 *   - components/DashboardPage.vue
 * @dependsOn
 *   - stores/dashboard: 仪表盘数据 store
 *   - stores/auth: 认证状态 store
 *   - types/authuser: 认证信息类型
 *   - utils/Format: 日期时间格式化
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useDashboardStore } from '@/stores/dashboard'
import { useAuthStore } from '@/stores/auth'
import type { AuthInfo } from '@/types/authuser'
import type { EChartsOption } from 'echarts' // [新增] ECharts 图表配置类型

export function useDashboardPage() {
  const dashboardStore = useDashboardStore()
  const authStore = useAuthStore()

  const authInfo = computed(() => {
    const info = authStore.authInfo as AuthInfo | undefined
    if (!info) {
      return { real_name: '暂无用户', auth_name: '暂无管理员用户名' }
    }
    return {
      real_name: info.auth_username || '暂无用户',
      auth_name: info.auth_username || '暂无管理员用户名',
      isactive: info.isactive || false,
    }
  })

  // 时间
  const currentTime = ref('')
  const currentDate = ref('')
  let timer: number | null = null

  // 新增 loadError 状态
  const loadError = ref(false)

  // 登录时长
  const LOGIN_START_TIME_KEY = 'loginStartTime'
  const loginDuration = ref('00:00:00')
  const getLoginStartTime = (): number => {
    const stored = sessionStorage.getItem(LOGIN_START_TIME_KEY)
    if (stored) {
      const parsed = parseInt(stored, 10)
      if (!isNaN(parsed)) return parsed
    }
    const now = Date.now()
    sessionStorage.setItem(LOGIN_START_TIME_KEY, String(now))
    return now
  }
  const loginStartTime = getLoginStartTime()

  // Dashboard 数据 - 已有
  const distributeStats = computed(() => dashboardStore.distributeStats)
  const recycleStats = computed(() => dashboardStore.recycleStats)
  const wasteStats = computed(() => dashboardStore.wasteStats)
  /** [新增] 资产状态全景数据 */
  const statusOverview = computed(() => dashboardStore.statusOverview)
  const recentOutAssets = computed(() => dashboardStore.recentOutAssets)
  const recentRecycleAssets = computed(() => dashboardStore.recentRecycleAssets)

  /**
   * [新增] 环形图配置
   * 从 composable 层生成图表选项，保持 DashboardPage.vue 组件仅负责渲染（DR-5）。
   */
  const chartOption = computed<EChartsOption>(() => ({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#333', fontSize: 12 },
    },
    legend: { show: false }, // 左侧已有状态列表，图表不显示图例
    series: [
      {
        type: 'pie',
        radius: ['55%', '78%'], // 环形图
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 3, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
          scaleSize: 8,
        },
        data: statusOverview.value.chartData,
      },
    ],
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: 'center',
        style: {
          text: `${statusOverview.value.totalAssets}`,
          textAlign: 'center',
          fill: '#333',
          fontSize: 20,
          fontWeight: 'bold',
        },
      },
      {
        type: 'text',
        left: 'center',
        top: '56%',
        style: {
          text: '总资产',
          textAlign: 'center',
          fill: '#999',
          fontSize: 12,
        },
      },
    ],
  }))

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
    const diff = Math.floor((now.getTime() - loginStartTime) / 1000)
    const hours = String(Math.floor(diff / 3600)).padStart(2, '0')
    const minutes = String(Math.floor((diff % 3600) / 60)).padStart(2, '0')
    const seconds = String(diff % 60).padStart(2, '0')
    loginDuration.value = `${hours}:${minutes}:${seconds}`
  }

  // fetchDashboardData 重构
  const fetchDashboardData = async () => {
    loadError.value = false // [修复] 重置错误状态
    try {
      await dashboardStore.initDashboardData()
    } catch (error) {
      console.error('获取仪表盘数据失败:', error)
      // [修复] AxiosError 由拦截器已弹窗；非 AxiosError 由 store 层已弹窗
      // 此处仅设置 UI 错误状态，不重复弹窗
      loadError.value = true
    }
  }

  // 新增 retry 函数
  const retryFetchDashboard = async () => {
    // [修复] 提供给 DashboardPage 的重试入口
    await fetchDashboardData()
  }

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

  const isLoggingOut = ref(false)
  const logout = async () => {
    if (isLoggingOut.value) return
    isLoggingOut.value = true
    try {
      sessionStorage.removeItem(LOGIN_START_TIME_KEY)
      await authStore.logout()
      location.reload()
    } catch (error) {
      console.error('退出登录失败:', error)
      location.reload()
    } finally {
      isLoggingOut.value = false
    }
  }

  onMounted(async () => {
    updateTime()
    timer = window.setInterval(updateTime, 1000)
    await fetchDashboardData()
  })

  onUnmounted(() => {
    if (timer) window.clearInterval(timer)
  })

  return {
    authInfo,
    currentTime,
    currentDate,
    loginDuration,
    distributeStats,
    recycleStats,
    wasteStats,
    recentOutAssets,
    recentRecycleAssets,
    refreshData,
    refreshRecycleData,
    logout,
    dashboardStore,
    statusOverview,
    chartOption,
    loadError, // [修复] 新增
    retryFetchDashboard, // [修复] 新增
  }
}
