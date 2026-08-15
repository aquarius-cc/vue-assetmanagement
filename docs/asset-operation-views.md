# 资产操作视图架构

## 概述

资产操作视图（报废、遗失、找回、回收、维修等）共享相同的模板结构和脚本逻辑。为了消除重复代码，我们提取了以下可复用单元：

- **`useAssetOperationForm` composable**：处理资产获取、加载状态、表单提交
- **`AssetOperationLayout` component**：提供通用模板结构

## 架构图

```
AssetOperationLayout.vue (布局组件)
├── #asset-info (资产信息插槽)
├── #form (表单插槽)
└── #actions (操作按钮插槽)

useAssetOperationForm.ts (逻辑复用)
├── loading (加载状态)
├── submitting (提交状态)
├── asset (资产详情)
├── assetCode (资产编码)
├── formRef (表单引用)
└── handleSubmit (提交处理)
```

## 使用示例

### 基本用法

```vue
<template>
  <AssetOperationLayout
    title="资产报废申请"
    :icon="Delete"
    :asset-code="assetCode"
    :loading="loading"
    :asset="asset"
  >
    <template #form>
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px">
        <el-form-item label="报废原因" prop="reason">
          <el-input v-model="formData.reason" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
    </template>

    <template #actions>
      <el-button type="danger" :loading="submitting" @click="handleSubmit(formData)">
        提交报废申请
      </el-button>
      <el-button @click="router.back()">取消</el-button>
    </template>
  </AssetOperationLayout>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import AssetOperationLayout from '@/components/AssetOperationLayout.vue'
import { useAssetOperationForm } from '@/composables/useAssetOperationForm'
import { assetAPI } from '@/api/asset'

const { loading, submitting, asset, assetCode, formRef, handleSubmit } = useAssetOperationForm({
  submitFn: async (data) => await assetAPI.scrapAsset(assetCode.value, data),
  successMessage: '报废申请已提交',
})

const formData = reactive({
  reason: '',
})

const rules = {
  reason: [{ required: true, message: '请输入报废原因', trigger: 'blur' }],
})
</script>
```

## API 参考

### useAssetOperationForm

#### 参数

| 参数 | 类型 | 必填 | 说明 |
|:--|:--|:--|:--|
| `submitFn` | `(data: any) => Promise<any>` | 是 | 提交函数 |
| `successMessage` | `string` | 是 | 成功提示消息 |
| `errorMessage` | `string` | 否 | 失败提示消息 |

#### 返回值

| 属性 | 类型 | 说明 |
|:--|:--|:--|
| `loading` | `Ref<boolean>` | 加载状态 |
| `submitting` | `Ref<boolean>` | 提交状态 |
| `asset` | `Ref<AssetDetail \| null>` | 资产详情 |
| `assetCode` | `Ref<string>` | 资产编码 |
| `formRef` | `Ref<FormInstance \| undefined>` | 表单引用 |
| `handleSubmit` | `(formData: any) => Promise<void>` | 提交处理函数 |

### AssetOperationLayout

#### Props

| Prop | 类型 | 必填 | 说明 |
|:--|:--|:--|:--|
| `title` | `string` | 是 | 页面标题 |
| `icon` | `Component` | 是 | 图标组件 |
| `assetCode` | `string \| null \| undefined` | 是 | 资产编码 |
| `loading` | `boolean` | 是 | 加载状态 |
| `asset` | `AssetDetail \| null` | 是 | 资产详情 |

#### Slots

| 插槽 | 说明 |
|:--|:--|
| `#asset-info` | 资产信息展示（默认显示编码、名称、规格、状态） |
| `#form` | 表单内容 |
| `#actions` | 操作按钮 |

## 迁移指南

### 迁移前

```vue
<template>
  <div class="asset-operation-view">
    <el-card class="operation-card">
      <template #header>
        <div class="card-header">
          <el-icon><Delete /></el-icon>
          <span>资产报废申请</span>
        </div>
      </template>

      <el-result v-if="!assetCode" icon="warning" title="缺少资产编码" ... />
      <div v-else-if="loading" v-loading="true" class="loading-container" />
      
      <template v-else-if="asset">
        <el-descriptions :column="2" border class="asset-info">
          <!-- 重复的资产信息展示 -->
        </el-descriptions>
        <el-divider />
        <!-- 表单 -->
        <!-- 操作按钮 -->
      </template>

      <el-result v-else icon="error" title="资产不存在" ... />
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 重复的脚本逻辑
const loading = ref(true)
const submitting = ref(false)
const asset = ref<AssetDetail | null>(null)
const assetCode = computed(() => route.params.code as string)

onMounted(async () => {
  // 重复的资产获取逻辑
})
</script>
```

### 迁移后

```vue
<template>
  <AssetOperationLayout
    title="资产报废申请"
    :icon="Delete"
    :asset-code="assetCode"
    :loading="loading"
    :asset="asset"
  >
    <template #form>
      <!-- 仅表单内容 -->
    </template>
    <template #actions>
      <!-- 仅操作按钮 -->
    </template>
  </AssetOperationLayout>
</template>

<script setup lang="ts">
// 使用 composable 复用逻辑
const { loading, submitting, asset, assetCode, formRef, handleSubmit } = useAssetOperationForm({
  submitFn: async (data) => await assetAPI.scrapAsset(assetCode.value, data),
  successMessage: '报废申请已提交',
})
</script>
```

## 已迁移的视图

| 视图 | 状态 |
|:--|:--|
| `ScrapAssetView.vue` | 待迁移 |
| `LostAssetView.vue` | 待迁移 |
| `FoundAssetView.vue` | 待迁移 |
| `RecycleAssetView.vue` | 待迁移 |
| `RepairAssetView.vue` | 待迁移 |
| `ScanAssetView.vue` | 待迁移 |
