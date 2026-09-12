<!--
@file 扫码查看资产页面，通过记录编码展示资产详情
@component ScanAssetView
@usedBy
  - router/index.ts: 路由懒加载
@dependsOn
  - api/request: HTTP请求封装
  - components/commoncomponents/StatusTag: 资产状态标签
@description
  【R4-04 登录态分流】已登录扫码自动直达 BasicAssetDetails 全量详情（无需二次点击）；
  未登录展示公开 6 字段白名单 + 「登录查看完整信息」引导。
-->
<template>
  <div class="asset-operation-view">
    <el-card class="operation-card">
      <template #header>
        <div class="card-header">
          <el-icon><Iphone /></el-icon>
          <span>扫码查看</span>
        </div>
      </template>

      <el-result
        v-if="!recordcode"
        icon="info"
        title="缺少记录编码"
        sub-title="请通过扫码方式访问此页面"
      >
        <template #extra>
          <el-button type="primary" @click="router.push('/main')">返回首页</el-button>
        </template>
      </el-result>

      <div v-else-if="loading" v-loading="true" class="loading-container" />

      <template v-else-if="asset">
        <el-descriptions :column="1" border class="asset-info">
          <el-descriptions-item label="资产编码">{{ asset.asset_code }}</el-descriptions-item>
          <el-descriptions-item label="资产名称">{{ asset.asset_name }}</el-descriptions-item>
          <el-descriptions-item label="资产规格">{{
            asset.asset_specification || '-'
          }}</el-descriptions-item>
          <el-descriptions-item label="品牌">{{ asset.asset_brand || '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <StatusTag :status="asset.asset_current_status" />
          </el-descriptions-item>
          <el-descriptions-item label="成色">{{ physicalGradeLabel }}</el-descriptions-item>
        </el-descriptions>

        <div class="action-buttons">
          <el-button type="primary" @click="goLogin">登录查看完整信息</el-button>
        </div>
      </template>

      <!-- [修复] 加载失败状态：区分于"未找到资产" -->
      <el-result
        v-else-if="loadError"
        icon="error"
        title="加载失败"
        sub-title="资产信息加载失败，请检查网络连接后重试"
      >
        <template #extra>
          <el-button type="primary" @click="fetchAsset">重试</el-button>
          <el-button @click="router.push('/main')">返回首页</el-button>
        </template>
      </el-result>

      <el-result
        v-else
        icon="error"
        title="未找到资产"
        sub-title="无法根据该编码找到对应的资产信息"
      >
        <template #extra>
          <el-button type="primary" @click="router.push('/main')">返回首页</el-button>
        </template>
      </el-result>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Iphone } from '@element-plus/icons-vue'
import { get } from '@/api/request'
import { isAxiosError } from 'axios'
import { ElMessage } from 'element-plus'
import { getPhysicalGradeDisplay } from '@/utils/Format'
import { useAuthStore } from '@/stores/auth'
import StatusTag from '@/components/commoncomponents/StatusTag.vue'

// 【R4-04 公开白名单】与后端 public_scan_view 的 data dict 严格对齐（后端为唯一契约源）
interface PublicScanAsset {
  asset_code: string
  asset_name: string
  asset_specification: string | null
  asset_brand: string | null
  asset_current_status: string
  physical_grade: string | null
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const loading = ref(true)
const asset = ref<PublicScanAsset | null>(null)
const recordcode = computed(() => route.params.recordcode as string)
// 新增 loadError 状态
const loadError = ref(false)

const physicalGradeLabel = computed(() => {
  return getPhysicalGradeDisplay(asset.value?.physical_grade ?? undefined)
})

// 未登录引导：登录后回到当前扫码页
const goLogin = () => {
  router.push({ name: 'Login', query: { redirect: route.fullPath } })
}

const fetchAsset = async () => {
  if (!recordcode.value) return
  loading.value = true
  loadError.value = false // [修复] 重置错误状态
  try {
    // 后端路由：/api/v1/assets/public/scan/{recordcode}/（baseURL=/api/v1，故此处带 /assets 前缀）
    const res = await get<PublicScanAsset>(`/assets/public/scan/${recordcode.value}/`)
    // [修复] 手动校验业务 code（此接口未使用 unwrapResponse）
    if (res.code !== 0) {
      ElMessage.error(res.message || '查询失败')
      loadError.value = true
      return
    }
    asset.value = res.data as PublicScanAsset
  } catch (err) {
    console.error('获取资产信息失败:', err)
    // [修复] 分类处理：404 = 资产不存在（保持 null），其他 = 加载失败
    if (isAxiosError(err) && err.response?.status === 404) {
      // 404：asset 保持 null，模板走"未找到资产"分支
    } else if (!isAxiosError(err)) {
      // 非 AxiosError（理论不会出现，因为未用 unwrapResponse，但防御性处理）
      ElMessage.error((err as Error).message || '获取资产信息失败')
      loadError.value = true
    } else {
      // AxiosError（500/超时/网络断开）：拦截器已弹窗，设置 loadError
      loadError.value = true
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 【R4-04 登录态分流】已登录扫码直达全量详情（守卫已保证此处登录态已初始化）
  if (authStore.isLoggedIn && recordcode.value) {
    await router.push({ name: 'BasicAssetDetails', query: { code: recordcode.value } })
    return
  }
  await fetchAsset()
})
</script>

<style lang="scss" scoped>
@use '@/assets/styles/asset-operation.scss' as *;
</style>
