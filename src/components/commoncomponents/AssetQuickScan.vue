<!--
@file 资产快速扫码/输入直达组件（侧边栏兜底入口）
@component AssetQuickScan
@usedBy
  - components/AsideMenu.vue: 左侧导航栏顶部
@description
  【R4-04 兜底入口】扫码枪输入或手动粘贴，三态解析：
  1. URL → 正则抽 recordcode 直达
  2. 纯值 → getAssetByCode(recordcode) 命中即跳
  3. 未命中 → combineSearch({asset_code}) exact 取其 recordcode 跳
  两败 warning 不跳。折叠态收窄为图标 + popover。
-->
<template>
  <div class="asset-quick-scan" :class="{ collapsed: isCollapsed }">
    <el-popover v-if="isCollapsed" placement="right" trigger="click" :width="280">
      <template #reference>
        <div class="scan-trigger-collapsed" title="扫码/输入资产直达">
          <el-icon><Search /></el-icon>
        </div>
      </template>
      <el-input
        v-model="inputValue"
        placeholder="扫码或输入编码"
        clearable
        :disabled="resolving"
        @keyup.enter="submit"
      >
        <template #append>
          <el-icon @click="submit"><Search /></el-icon>
        </template>
      </el-input>
    </el-popover>

    <el-input
      v-else
      v-model="inputValue"
      class="scan-input"
      placeholder="扫码枪输入 / 粘贴编码或链接"
      clearable
      :disabled="resolving"
      @keyup.enter="submit"
    >
      <template #prefix>
        <el-icon><Iphone /></el-icon>
      </template>
      <template #append>
        <el-icon class="scan-go" @click="submit"><Search /></el-icon>
      </template>
    </el-input>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Iphone, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAssetStore } from '@/stores/assetStore'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const store = useAssetStore()

const inputValue = ref('')
const resolving = ref(false)

// 折叠态由全局侧栏状态驱动（与 AsideMenu 一致）
const isCollapsed = computed(() => appStore.sidebarCollapsed)

/**
 * 从任意文本中提取 recordcode。
 * 支持：完整 URL（?code=REC-xxx 或末段路径）、JSON 二维码内容（recordcode/asset_code 键，
 * 兼容 qr_code 字段原设计的 JSON 形态）、直接粘贴的编码。
 * # AI_REVIEW_NEEDED: regex——recordcode 形态若后端调整（如长度/字符集），此处需同步
 */
const extractRecordcode = (raw: string): string | null => {
  const text = raw.trim()
  if (!text) return null
  // ?code= / ?recordcode= 查询参数
  const queryMatch = text.match(/[?&](?:code|recordcode)=([^&#\s]+)/)
  if (queryMatch) return decodeURIComponent(queryMatch[1])
  // JSON 二维码内容（qr_code 字段 help_text 原设计形态）：提取 recordcode/asset_code 键或内部 URL
  if (/^\{[\s\S]*\}$/.test(text)) {
    try {
      const obj: unknown = JSON.parse(text)
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const record = obj as Record<string, unknown>
        for (const key of ['recordcode', 'asset_code']) {
          const val = record[key]
          if (typeof val === 'string' && val.trim()) return val.trim()
        }
        for (const val of Object.values(record)) {
          if (typeof val === 'string' && val.trim()) {
            const inner = extractRecordcode(val)
            if (inner) return inner
          }
        }
      }
    } catch {
      // 非合法 JSON：继续按普通文本处理
    }
    return null
  }
  // URL 路径段：取最后一个非空段
  if (/^https?:\/\//i.test(text) || text.includes('/')) {
    const segments = text.split(/[?#]/)[0].split('/').filter(Boolean)
    const last = segments[segments.length - 1]
    if (last) return decodeURIComponent(last)
  }
  return text
}

const goToDetail = (recordcode: string) => {
  router.push({ name: 'BasicAssetDetails', query: { code: recordcode } })
}

const submit = async () => {
  const raw = inputValue.value.trim()
  if (!raw || resolving.value) return

  const candidate = extractRecordcode(raw)

  resolving.value = true
  try {
    // 态 2：纯值按 recordcode 直查（命中即跳）——经 assetStore（ID-2：入参实为 recordcode）
    if (candidate) {
      const hit = await store.getById(candidate)
      if (hit) {
        goToDetail(candidate)
        inputValue.value = ''
        return
      }
    }
    // 态 3：未命中 → 按 asset_code 精确组合搜索，取其 recordcode
    if (candidate) {
      const resp = await store.combineSearch({ asset_code: candidate, page_size: 10 })
      const results = resp?.results ?? []
      if (results.length === 1) {
        goToDetail(results[0].recordcode)
        inputValue.value = ''
        return
      }
      if (results.length > 1) {
        ElMessage.warning('匹配到多条资产，请精确输入记录编码')
        return
      }
    }
    ElMessage.warning('未找到对应资产，请确认编码是否正确')
  } catch {
    ElMessage.warning('查询失败，请稍后重试')
  } finally {
    resolving.value = false
  }
}

// 路由变化清空输入（跳转后不留残值）
watch(
  () => route.fullPath,
  () => {
    inputValue.value = ''
  },
)
</script>

<style lang="scss" scoped>
@use '@/assets/styles/asset-operation.scss' as *;

.asset-quick-scan {
  padding: 0 12px 8px;

  .scan-input {
    width: 100%;
  }

  .scan-go {
    cursor: pointer;
  }

  &.collapsed {
    padding: 0 8px 8px;

    .scan-trigger-collapsed {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 8px 0;
      cursor: pointer;
      color: var(--el-text-color-secondary);
      border-radius: 4px;

      &:hover {
        color: var(--el-color-primary);
        background: var(--el-fill-color-light);
      }
    }
  }
}
</style>
