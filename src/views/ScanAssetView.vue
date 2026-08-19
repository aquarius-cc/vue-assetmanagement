<!--
@file 扫码查看资产页面，通过记录编码展示资产详情
@component ScanAssetView
@usedBy
  - router/index.ts: 路由懒加载
@dependsOn
  - api/request: HTTP请求封装
  - components/commoncomponents/StatusTag: 资产状态标签
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
          <el-descriptions-item label="存放仓库">{{ storageName }}</el-descriptions-item>
          <el-descriptions-item label="资产分类">{{ typeName }}</el-descriptions-item>
          <el-descriptions-item label="使用人">{{ managerName }}</el-descriptions-item>
          <el-descriptions-item label="使用地点">{{
            asset.asset_using_location || '-'
          }}</el-descriptions-item>
          <el-descriptions-item label="入库日期">{{
            asset.asset_entry_date || '-'
          }}</el-descriptions-item>
          <el-descriptions-item label="成色">{{ physicalGradeLabel }}</el-descriptions-item>
        </el-descriptions>

        <div class="action-buttons">
          <el-button
            type="primary"
            @click="router.push({ path: '/main/assetdetails/' + asset.asset_code })"
          >
            查看详情
          </el-button>
          <el-button @click="router.push('/main')">返回首页</el-button>
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
import type { AssetDetail } from '@/types/asset'
import { getPhysicalGradeDisplay } from '@/utils/Format'
import StatusTag from '@/components/commoncomponents/StatusTag.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const asset = ref<AssetDetail | null>(null)
const recordcode = computed(() => route.params.recordcode as string)
// 新增 loadError 状态
const loadError = ref(false)

const storageName = computed(() => {
  return (asset.value?.asset_storage_name as string) || '-'
})
const typeName = computed(() => {
  return (asset.value?.asset_type_name as string) || '-'
})
const managerName = computed(() => {
  return (asset.value?.asset_manager_name as string) || '-'
})
const physicalGradeLabel = computed(() => {
  return getPhysicalGradeDisplay(asset.value?.physical_grade)
})

// 新增 retry 函数
const fetchAsset = async () => {
  if (!recordcode.value) return
  loading.value = true
  loadError.value = false // [修复] 重置错误状态
  try {
    const res = await get<AssetDetail>(`/public/scan/${recordcode.value}/`)
    // [修复] 手动校验业务 code（此接口未使用 unwrapResponse）
    if (res.code !== 0) {
      ElMessage.error(res.message || '查询失败')
      loadError.value = true
      return
    }
    asset.value = res.data as AssetDetail
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

// onMounted 改为调用 fetchAsset
onMounted(fetchAsset)
</script>

<style lang="scss" scoped>
@use '@/assets/styles/asset-operation.scss' as *;
</style>
