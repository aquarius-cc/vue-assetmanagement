<template>
  <div class="dashboard-page-content">
    <!-- 
      �Ǳ��̲������
      
      ��Ӧʽ���ԣ�
      - xs (<768px): ���в��֣�ÿ����Ƭռ������
      - sm (��768px): ���в��֣����ֿɶ���
      - md (��992px): ˫�в��֣�������Ƭ����
      - lg/xl (��1200px): ˫�в��֣�������ʾ
      
      ʹ�� Element Plus ����Ӧʽդ��ϵͳʵ��
    -->
    <!-- ��һ�У��ʲ�������Ϣ + �û���Ϣ -->
    <el-row class="top-row" :gutter="16">
      <!-- �ʲ�������Ϣ��Ƭ -->
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <DashboardStatCard
          title="�ʲ�������Ϣ"
          icon="Download"
          :stats="[
            { value: distributeStats.monthlyDistributed, label: '���·���' },
            { value: distributeStats.totalDistributed, label: '�ܷ�����' },
            { value: distributeStats.totalAssets, label: '���ʲ���' },
          ]"
          refreshable
          :loading="dashboardStore.outAssetsLoading"
          card-class="distribute-card"
          @refresh="refreshData"
        >
          <div class="recent-list">
            <h4>������ż�¼</h4>
            <div class="list-item" v-for="item in recentOutAssets" :key="item.id">
              <div class="item-info">
                <span class="item-name">{{ item.asset_name }}</span>
                <span class="item-recipient">{{ item.recipient_name }}</span>
              </div>
              <span class="item-date">{{ formatDateTime(item.distribute_time) }}</span>
            </div>
            <div v-if="recentOutAssets.length === 0" class="empty-state">���޷��ż�¼</div>
          </div>
        </DashboardStatCard>
      </el-col>

      <!-- �û���Ϣ��Ƭ -->
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <el-card class="info-card user-info-card">
          <template #header>
            <div class="card-header">
              <div class="user-info-header">
                <el-icon><User /></el-icon>
                <span>�û���Ϣ</span>
              </div>
              <el-button type="primary" size="small" class="logout-btn" @click="logout"
                >�˳�</el-button
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
              <h3>{{ authInfo.real_name || '�û�' }}</h3>
              <p>�˺�: {{ authInfo.auth_name || '--' }}</p>
            </div>
          </div>
          <div class="session-info">
            <div class="session-item">
              <span class="session-label">���ε�¼ʱ��</span>
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

    <!-- �ڶ��У��ʲ�������Ϣ + �����ʲ���Ϣ -->
    <el-row class="bottom-row" :gutter="16">
      <!-- �ʲ�������Ϣ��Ƭ -->
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <DashboardStatCard
          title="�ʲ�������Ϣ"
          icon="Upload"
          :stats="[
            { value: recycleStats.monthlyRecycled, label: '���»���' },
            { value: recycleStats.totalRecycled, label: '�ܻ�����' },
            { value: recycleStats.inStockAssets, label: '�ڿ��ʲ�' },
          ]"
          refreshable
          :loading="dashboardStore.recycleAssetsLoading"
          card-class="recycle-card"
          @refresh="refreshRecycleData"
        >
          <div class="recent-list">
            <h4>������ռ�¼</h4>
            <div class="list-item" v-for="item in recentRecycleAssets" :key="item.id">
              <div class="item-info">
                <span class="item-name">{{ item.asset_name }}</span>
                <span class="item-returner">{{ item.returner_name }}</span>
              </div>
              <span class="item-date">{{ formatDateTime(item.recycle_time) }}</span>
            </div>
            <div v-if="recentRecycleAssets.length === 0" class="empty-state">���޻��ռ�¼</div>
          </div>
        </DashboardStatCard>
      </el-col>

      <!-- �����ʲ���Ϣ��Ƭ -->
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <DashboardStatCard
          title="�����ʲ���Ϣ"
          icon="DataAnalysis"
          :stats="[
            { value: wasteStats.pendingWaste, label: '������', class: 'pending-waste' },
            { value: wasteStats.wastedAssets, label: '�ѱ���', class: 'wasted' },
          ]"
          card-class="other-info-card"
        >
          <div class="waste-overview">
            <h4>����״̬����</h4>
            <div class="waste-chart">
              <div class="waste-item">
                <div class="waste-bar pending">
                  <span>{{ wasteStats.pendingWaste }}</span>
                </div>
                <span class="waste-label">������</span>
              </div>
              <div class="waste-item">
                <div class="waste-bar wasted">
                  <span>{{ wasteStats.wastedAssets }}</span>
                </div>
                <span class="waste-label">�ѱ���</span>
              </div>
            </div>
            <div class="waste-summary">
              <span>���Ϻϼ�: {{ wasteStats.pendingWaste + wasteStats.wastedAssets }}</span>
            </div>
          </div>
        </DashboardStatCard>
      </el-col>
    </el-row>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { User } from '@element-plus/icons-vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useAuthStore } from '@/stores/auth'
import DashboardStatCard from '@/components/commoncomponents/DashboardStatCard.vue'
import { ElMessage } from 'element-plus'
import type { AuthInfo } from '@/utils/AuthUser'

// ��ʼ�� Store
const dashboardStore = useDashboardStore()
const authStore = useAuthStore()

// �û���Ϣ��������
const authInfo = computed(() => {
  const info = authStore.authInfo as AuthInfo | undefined
  if (!info) {
    return {
      real_name: '�����û�',
      auth_name: '���޹���Ա�û���',
    }
  }
  return {
    real_name: info.auth_username || '�����û�',
    auth_name: info.auth_username || '���޹���Ա�û���',
    isactive: info.isactive || false,
  }
})

// ��ǰʱ����Ϣ
const currentTime = ref('')
const currentDate = ref('')

// ��¼ʱ��
// ʹ�� sessionStorage �־û���¼��ʼʱ�䣬�������ж��/���¹���ʱ����
// ע�⣺sessionStorage ��ͬһ������Ự�ڹ������ر��������ǩҳ�����
const LOGIN_START_TIME_KEY = 'loginStartTime'
const loginDuration = ref('00:00:00')
const getLoginStartTime = (): number => {
  const stored = sessionStorage.getItem(LOGIN_START_TIME_KEY)
  if (stored) {
    const parsed = parseInt(stored, 10)
    if (!isNaN(parsed)) return parsed
  }
  // �״η���ʱ��¼ʱ�䲢�־û�
  const now = Date.now()
  sessionStorage.setItem(LOGIN_START_TIME_KEY, String(now))
  return now
}
const loginStartTime = getLoginStartTime()

// �Ǳ�������
const distributeStats = computed(() => dashboardStore.distributeStats)
const recycleStats = computed(() => dashboardStore.recycleStats)
const wasteStats = computed(() => dashboardStore.wasteStats)
const recentOutAssets = computed(() => dashboardStore.recentOutAssets)
const recentRecycleAssets = computed(() => dashboardStore.recentRecycleAssets)

// ��ȡ�Ǳ�������
const fetchDashboardData = async () => {
  try {
    await dashboardStore.initDashboardData()
  } catch (error) {
    console.error('��ȡ�Ǳ�������ʧ��:', error)
  }
}

// ˢ�·�������
const refreshData = async () => {
  ElMessage.info('����ˢ�·�������...')
  try {
    await dashboardStore.fetchRecentOutAssets(5)
    await dashboardStore.fetchDashboardOverview()
    ElMessage.success('��������ˢ�³ɹ�')
  } catch {
    ElMessage.error('ˢ��ʧ��')
  }
}

// ˢ�»�������
const refreshRecycleData = async () => {
  ElMessage.info('����ˢ�»�������...')
  try {
    await dashboardStore.fetchRecentRecycleAssets(5)
    await dashboardStore.fetchDashboardOverview()
    ElMessage.success('��������ˢ�³ɹ�')
  } catch {
    ElMessage.error('ˢ��ʧ��')
  }
}

// �˳���¼״̬����ֹ�ظ������
const isLoggingOut = ref(false)

// �˳���¼
const logout = async () => {
  if (isLoggingOut.value) return // ��ֹ�ظ����
  isLoggingOut.value = true
  try {
    // ��� sessionStorage �еĵ�¼��ʼʱ�䣬�´ε�¼ʱ���¼�¼
    sessionStorage.removeItem(LOGIN_START_TIME_KEY)
    await authStore.logout() // ���ú�� API ���� Token�����������״̬
    location.reload() // �˳��ɹ���ˢ��ҳ�棬��ת����¼ҳ
  } catch (error) {
    console.error('�˳���¼ʧ��:', error)
    // ��ʹ�쳣Ҳˢ��ҳ�棬��Ϊ silentLogout �� finally ���������״̬
    location.reload()
  } finally {
    isLoggingOut.value = false
  }
}

// ��ʽ������ʱ��
const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

// ����ʱ��
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

  // ���µ�¼ʱ��
  const diff = Math.floor((now.getTime() - loginStartTime) / 1000)
  const hours = String(Math.floor(diff / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((diff % 3600) / 60)).padStart(2, '0')
  const seconds = String(diff % 60).padStart(2, '0')
  loginDuration.value = `${hours}:${minutes}:${seconds}`
}

// ��ʱ��
let timer: number | null = null

// �������ʱ������ʱ������ȡ����
onMounted(async () => {
  // ��¼��ʼʱ�������Ϸ�ͨ�� getLoginStartTime() ��ʼ������ sessionStorage �ָ����״μ�¼��
  // ��������Ϊ Date.now()��ȷ��ҳ���л����¼ʱ����������

  // ����ʱ��
  updateTime()
  timer = window.setInterval(updateTime, 1000)

  // ��ȡ�Ǳ�������
  await fetchDashboardData()
})

// ���ж��ʱ�����ʱ��
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

  // �ʲ����ſ�Ƭ��ʽ
  .distribute-card {
    background: var(--gradient-purple);

    :deep(.el-card__header) {
      background: var(--overlay-white-light);
      border-bottom: 1px solid var(--overlay-white-medium);
    }
  }

  // �û���Ϣ��Ƭ��ʽ
  .user-info-card {
    background: var(--gradient-pink);

    :deep(.el-card__header) {
      background: var(--overlay-white-light);
      border-bottom: 1px solid var(--overlay-white-medium);
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
          color: var(--overlay-white-text);
          font-size: 14px;
        }
      }

      .logout-btn {
        background: var(--overlay-white-medium);
        border: 1px solid var(--overlay-white-strong);
        color: $white;
        margin-left: auto;

        &:hover {
          background: var(--overlay-white-strong);
        }
      }
    }

    .session-info {
      background: var(--overlay-white-light);
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
      background: var(--overlay-white-light);
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

  // �ʲ����տ�Ƭ��ʽ
  .recycle-card {
    background: var(--gradient-cyan);

    :deep(.el-card__header) {
      background: var(--overlay-white-light);
      border-bottom: 1px solid var(--overlay-white-medium);
    }
  }

  // �����ʲ���Ϣ��Ƭ��ʽ
  .other-info-card {
    background: var(--gradient-green);

    :deep(.el-card__header) {
      background: var(--overlay-white-light);
      border-bottom: 1px solid var(--overlay-white-medium);
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
      border-bottom: 1px solid var(--overlay-white-medium);
      font-size: 13px;
      transition: background 0.2s ease;

      &:hover {
        background: var(--overlay-white-subtle);
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
      border-top: 1px solid var(--overlay-white-medium);
      text-align: center;
      font-size: 13px;
      opacity: 0.9;
    }
  }

  // ��ԭ��й©�� .dashboard-page-content ��� ::deep() ��������
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
   * ��Ӧʽ�����Ż�
   * 
   * �ϵ�˵����
   * - < 768px (xs/sm): �ƶ��ˣ����в��֣���������ͼ��
   * - 768px - 991px (md): ƽ��ˣ����ֵ��е����Ӽ��
   * - �� 992px (lg/xl): ����ˣ�˫�в���
   */

  /* ƽ������� (768px - 991px) */
  @media (max-width: 991px) {
    .top-row,
    .bottom-row {
      height: auto; // ȡ���̶��߶ȣ�������������Ӧ
      min-height: calc(50% - 8px);
    }

    .info-card {
      margin-bottom: 16px; // ���ӿ�Ƭ���
    }
  }

  /* �ƶ������� (< 768px) */
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

    // ͳ��������Ӧʽ����
    .statistics {
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 16px;

      .stat-item {
        flex: 1;
        min-width: 80px;

        .stat-number {
          font-size: 24px; // ��С����
        }

        .stat-label {
          font-size: 12px;
        }
      }
    }

    // �б�����Ӧʽ����
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

    // �û���Ϣ��Ƭ��Ӧʽ����
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
          font-size: 24px; // ��Сʱ������
        }

        .current-date {
          font-size: 12px;
        }
      }
    }

    // ���ϸ�����Ӧʽ����
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

  /* С���ƶ������� (< 480px) */
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
