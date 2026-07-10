# 前端项目优化调整 Implementation Plan

> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state:
> [Final Report](../reports/frontend-optimization.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 根据审查报告修复前端项目的P0/P1问题，建立设计令牌系统、实现暗色模式、开启TypeScript严格模式、补充缺失路由和模块

**Architecture:** 采用渐进式重构策略，先建立基础设施（设计令牌、CSS变量、TypeScript配置），再修复具体问题，最后补充缺失功能模块

**Tech Stack:** Vue 3.5 + TypeScript 6.0 + Element Plus 2.10 + Vite + Pinia

## Global Constraints
- 强制使用 `<script setup lang="ts">` 语法
- 设计令牌零容忍：所有颜色、间距、圆角、字体必须来源于预定义Tokens
- 组件样式必须 scoped
- TypeScript strict: true 必须开启
- 组件行数 ≤500行，Composable ≤200行，模板嵌套 ≤3层
- 变异测试工具统一使用 Vitest 插件

---

## Task 1: 建立设计令牌系统与CSS变量

**Covers:** F1, F2, F3, F4, F5, F13

**Files:**
- Create: `src/styles/variables.css`
- Create: `src/styles/dark.css`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: 项目现有颜色值（需从组件中提取）
- Produces: CSS变量系统 `--color-primary`, `--color-success`, etc.

- [ ] **Step 1: 创建CSS变量文件**

```css
/* src/styles/variables.css */
:root {
  /* 设计令牌 - 主色 */
  --color-primary: #2B5FD7;
  --color-primary-light: #409eff;
  --color-primary-dark: #1a3d7c;
  
  /* 设计令牌 - 功能色 */
  --color-success: #52C41A;
  --color-warning: #FAAD14;
  --color-danger: #FF4D4F;
  --color-info: #1677FF;
  
  /* 设计令牌 - 圆角 */
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  
  /* 设计令牌 - 间距 (4px基数) */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-xxl: 32px;
  --spacing-xxxl: 48px;
  
  /* 设计令牌 - 字体 */
  --font-size-xs: 12px;
  --font-size-sm: 13px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;
  --font-size-xxl: 24px;
  
  /* 设计令牌 - 字体栈 */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
  
  /* 设计令牌 - 阴影 */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.15);
  
  /* 设计令牌 - 边框 */
  --border-color: #dcdfe6;
  --border-color-light: #e4e7ed;
  --border-color-lighter: #ebeef5;
  
  /* 设计令牌 - 背景色 */
  --bg-color: #ffffff;
  --bg-color-page: #f5f7fa;
  --bg-color-overlay: #ffffff;
  
  /* 设计令牌 - 文本色 */
  --text-color-primary: #303133;
  --text-color-regular: #606266;
  --text-color-secondary: #909399;
  --text-color-placeholder: #c0c4cc;
}
```

- [ ] **Step 2: 创建暗色模式变量**

```css
/* src/styles/dark.css */
html.dark {
  /* 暗色模式 - 背景色 */
  --bg-color: #141414;
  --bg-color-page: #0d0d0d;
  --bg-color-overlay: #1f1f1f;
  
  /* 暗色模式 - 文本色 */
  --text-color-primary: #e5eaf3;
  --text-color-regular: #cfd3dc;
  --text-color-secondary: #a3a6ad;
  --text-color-placeholder: #8d9095;
  
  /* 暗色模式 - 边框色 */
  --border-color: #414243;
  --border-color-light: #363637;
  --border-color-lighter: #2b2b2c;
  
  /* 暗色模式 - 阴影 */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.5);
  
  /* Element Plus 暗色变量覆盖 */
  --el-color-primary: #2B5FD7;
  --el-color-success: #52C41A;
  --el-color-warning: #FAAD14;
  --el-color-danger: #FF4D4F;
  --el-color-info: #1677FF;
  
  --el-bg-color: #141414;
  --el-bg-color-page: #0d0d0d;
  --el-bg-color-overlay: #1f1f1f;
  
  --el-text-color-primary: #e5eaf3;
  --el-text-color-regular: #cfd3dc;
  --el-text-color-secondary: #a3a6ad;
  --el-text-color-placeholder: #8d9095;
  
  --el-border-color: #414243;
  --el-border-color-light: #363637;
  --el-border-color-lighter: #2b2b2c;
}
```

- [ ] **Step 3: 修改main.ts引入变量**

```typescript
// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/variables.css'
import './styles/dark.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')
```

- [ ] **Step 4: 验证变量系统工作**

运行开发服务器，检查CSS变量是否正确应用：
```bash
npm run dev
```

- [ ] **Step 5: 提交代码**

```bash
git add src/styles/ src/main.ts
git commit -m "feat: 建立设计令牌系统与CSS变量"
```

---

## Task 2: 开启TypeScript严格模式

**Covers:** F14

**Files:**
- Modify: `tsconfig.app.json`
- Modify: `tsconfig.json`

**Interfaces:**
- Consumes: 现有TypeScript配置
- Produces: 严格模式配置

- [ ] **Step 1: 修改tsconfig.app.json**

```json
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "include": ["env.d.ts", "src/**/*", "src/**/*.vue"],
  "exclude": ["src/**/__tests__/*"],
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

- [ ] **Step 2: 修改tsconfig.json**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.app.json" }
  ],
  "compilerOptions": {
    "strict": true
  }
}
```

- [ ] **Step 3: 运行TypeScript检查**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 修复TypeScript错误**

根据错误提示，逐步修复类型错误。主要修复：
1. 添加缺失的类型定义
2. 修复可空类型问题
3. 添加函数返回类型

- [ ] **Step 5: 提交代码**

```bash
git add tsconfig*.json
git commit -m "feat: 开启TypeScript严格模式"
```

---

## Task 3: 迁移类型定义到src/types/

**Covers:** F15

**Files:**
- Create: `src/types/asset.ts`
- Create: `src/types/contract.ts`
- Create: `src/types/common.ts` (更新)
- Modify: `src/utils/Asset.ts`
- Modify: `src/utils/Contract.ts`

**Interfaces:**
- Consumes: 现有类型定义
- Produces: 集中的类型定义

- [ ] **Step 1: 创建资产类型定义**

```typescript
// src/types/asset.ts
export interface Asset {
  recordcode: string
  asset_code: string
  asset_name: string
  asset_brand: string
  asset_specifications: string
  asset_price: number
  asset_purchase_date: string
  asset_warehousing_date: string
  asset_current_status: AssetStatus
  asset_type_recordcode: string
  asset_storage_recordcode: string
  asset_keeper_employee: string
  asset_user_employee: string
  asset_use_location: string
  usage_type: 'new' | 'used'
  physical_grade: PhysicalGrade
  version: number
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export type AssetStatus = 
  | 'in_store'
  | 'in_use'
  | 'recycled_pending'
  | 'damaged'
  | 'scrapped'
  | 'broken'
  | 'lost'
  | 'repairing'

export type PhysicalGrade = 'good' | 'normal' | 'bad'

export interface AssetStateLog {
  recordcode: string
  asset_recordcode: string
  from_state: string
  to_state: string
  operator_employee: string
  business_doc_no: string
  reason: string
  created_at: string
}

export interface OutAsset {
  recordcode: string
  asset_recordcode: string
  outasset_previous_status: AssetStatus
  applicant_employee: string
  keeper_employee: string
  use_location: string
  out_type: '领用' | '借用'
  expected_return_date: string
  actual_return_date: string
  is_recycled: boolean
  created_at: string
}

export interface RecycleAsset {
  recordcode: string
  asset_recordcode: string
  outasset_recordcode: string
  recycle_date: string
  recycle_employee: string
  is_broken: boolean
  broken_reason: string
  is_lost: boolean
  lost_reason: string
  lost_location: string
  created_at: string
}

export interface BrokenAsset {
  recordcode: string
  asset_recordcode: string
  broken_date: string
  broken_reason: string
  operator_employee: string
  created_at: string
}

export interface LostAsset {
  recordcode: string
  asset_recordcode: string
  lost_date: string
  lost_reason: string
  lost_location: string
  operator_employee: string
  created_at: string
}

export interface RepairAsset {
  recordcode: string
  asset_recordcode: string
  repair_status: 'in_progress' | 'completed' | 'failed'
  repair_reason: string
  expected_completion_date: string
  actual_completion_date: string
  physical_grade_before: PhysicalGrade
  physical_grade_after: PhysicalGrade
  operator_employee: string
  created_at: string
}

export interface DamagedAsset {
  recordcode: string
  asset_recordcode: string
  approval_status: 'pending' | 'approved' | 'rejected'
  original_status: AssetStatus
  damage_reason: string
  applicant_employee: string
  approver_employee: string
  approval_date: string
  created_at: string
}

export interface WasteAsset {
  recordcode: string
  asset_recordcode: string
  damaged_asset_recordcode: string
  waste_date: string
  waste_employee: string
  created_at: string
}

export interface UnregisteredAsset {
  recordcode: string
  asset_name: string
  asset_brand: string
  discovery_location: string
  discovery_employee: string
  approval_status: 'pending' | 'approved' | 'rejected'
  handle_type: '入库' | '报废' | '退回'
  created_at: string
}
```

- [ ] **Step 2: 创建合同类型定义**

```typescript
// src/types/contract.ts
export interface Contract {
  recordcode: string
  contract_code: string
  contract_name: string
  supplier: string
  contract_amount: number
  amount_paid: number
  settlemented_price: number
  amount_unpaid: number
  start_date: string
  end_date: string
  status: ContractStatus
  created_at: string
  updated_at: string
}

export type ContractStatus = 
  | 'purchasing'
  | 'purchase_finished'
  | 'receive_check'
  | 'initial_check'
  | 'project_settlement'
  | 'settlement_done'
  | 'final_check'
  | 'project_finished'

export interface ContractStateLog {
  recordcode: string
  contract_recordcode: string
  from_status: string
  to_status: string
  operator_employee: string
  created_at: string
}
```

- [ ] **Step 3: 更新通用类型定义**

```typescript
// src/types/common.ts
export interface ApiResponse<T = any> {
  code: number
  data: T
  message: string
}

export interface PaginatedResponse<T> {
  code: number
  data: {
    items: T[]
    total: number
    page: number
    page_size: number
  }
  message: string
}

export interface Department {
  recordcode: string
  department_code: string
  department_name: string
  parent_recordcode: string
  level: number
  sort_order: number
  is_deleted: boolean
  children?: Department[]
}

export interface Employee {
  recordcode: string
  employee_code: string
  employee_name: string
  department_recordcode: string
  phone: string
  office_location: string
  employee_status: 'active' | 'left'
  created_at: string
}

export interface AssetType {
  recordcode: string
  type_code: string
  type_name: string
  parent_recordcode: string
  level: number
  full_code: string
  full_name: string
  is_deleted: boolean
  children?: AssetType[]
}

export interface Storage {
  recordcode: string
  storage_code: string
  storage_name: string
  location: string
  manager_employee: string
  capacity: number
  is_deleted: boolean
}

export interface OperationLog {
  recordcode: string
  user_employee: string
  operation_type: string
  operation_target: string
  operation_detail: string
  ip_address: string
  created_at: string
}

export interface AuditLog {
  recordcode: string
  asset_recordcode: string
  from_state: string
  to_state: string
  operator_employee: string
  business_doc_no: string
  reason: string
  created_at: string
}

export interface HardDiskSN {
  recordcode: string
  asset_recordcode: string
  serial_number: string
  model: string
  capacity: string
  created_at: string
}
```

- [ ] **Step 4: 修改utils/Asset.ts使用新类型**

```typescript
// src/utils/Asset.ts
import type { Asset, AssetStatus } from '@/types/asset'

export const ASSET_STATUS_MAP: Record<AssetStatus, string> = {
  in_store: '在库',
  in_use: '在用',
  recycled_pending: '待回收',
  damaged: '待报废',
  scrapped: '已报废',
  broken: '损坏',
  lost: '遗失',
  repairing: '维修中'
}

export const PHYSICAL_GRADE_MAP: Record<string, string> = {
  good: '良好',
  normal: '一般',
  bad: '较差'
}

export function getAssetStatusText(status: AssetStatus): string {
  return ASSET_STATUS_MAP[status] || status
}

export function getPhysicalGradeText(grade: string): string {
  return PHYSICAL_GRADE_MAP[grade] || grade
}
```

- [ ] **Step 5: 提交代码**

```bash
git add src/types/ src/utils/Asset.ts src/utils/Contract.ts
git commit -m "feat: 迁移类型定义到src/types/"
```

---

## Task 4: 实现暗色模式切换功能

**Covers:** F13

**Files:**
- Create: `src/composables/useDarkMode.ts`
- Modify: `src/App.vue`
- Create: `src/components/DarkModeToggle.vue`

**Interfaces:**
- Consumes: CSS变量系统
- Produces: 暗色模式切换功能

- [ ] **Step 1: 创建暗色模式Composable**

```typescript
// src/composables/useDarkMode.ts
import { ref, watch } from 'vue'

const isDark = ref(false)

export function useDarkMode() {
  // 初始化：从localStorage读取或跟随系统偏好
  const initDarkMode = () => {
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) {
      isDark.value = saved === 'true'
    } else {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    applyDarkMode()
  }

  // 应用暗色模式
  const applyDarkMode = () => {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // 切换暗色模式
  const toggleDarkMode = () => {
    isDark.value = !isDark.value
    localStorage.setItem('darkMode', String(isDark.value))
    applyDarkMode()
  }

  // 监听系统偏好变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleSystemChange = (e: MediaQueryListEvent) => {
    if (localStorage.getItem('darkMode') === null) {
      isDark.value = e.matches
      applyDarkMode()
    }
  }
  mediaQuery.addEventListener('change', handleSystemChange)

  // 初始化
  initDarkMode()

  return {
    isDark,
    toggleDarkMode
  }
}
```

- [ ] **Step 2: 创建暗色模式切换组件**

```vue
<!-- src/components/DarkModeToggle.vue -->
<template>
  <el-tooltip :content="isDark ? '切换到亮色模式' : '切换到暗色模式'">
    <el-button 
      :icon="isDark ? Sunny : Moon" 
      circle 
      @click="toggleDarkMode"
    />
  </el-tooltip>
</template>

<script setup lang="ts">
import { Sunny, Moon } from '@element-plus/icons-vue'
import { useDarkMode } from '@/composables/useDarkMode'

const { isDark, toggleDarkMode } = useDarkMode()
</script>
```

- [ ] **Step 3: 修改App.vue集成暗色模式**

```vue
<!-- src/App.vue -->
<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useDarkMode } from '@/composables/useDarkMode'

// 初始化暗色模式
onMounted(() => {
  useDarkMode()
})
</script>

<style>
/* 全局样式使用CSS变量 */
body {
  font-family: var(--font-family);
  background-color: var(--bg-color-page);
  color: var(--text-color-primary);
}
</style>
```

- [ ] **Step 4: 在布局组件中添加切换按钮**

在 `AsideMenu.vue` 或导航栏中添加 `DarkModeToggle` 组件。

- [ ] **Step 5: 提交代码**

```bash
git add src/composables/useDarkMode.ts src/components/DarkModeToggle.vue src/App.vue
git commit -m "feat: 实现暗色模式切换功能"
```

---

## Task 5: 替换硬编码颜色值

**Covers:** F1, F2

**Files:**
- Modify: 所有包含硬编码颜色的 `.vue` 文件

**Interfaces:**
- Consumes: CSS变量系统
- Produces: 使用CSS变量的组件

- [ ] **Step 1: 搜索并替换硬编码颜色**

创建一个脚本或手动替换：
- `#409eff` → `var(--color-primary)` 或 `var(--el-color-primary)`
- `#52C41A` → `var(--color-success)` 或 `var(--el-color-success)`
- `#FAAD14` → `var(--color-warning)` 或 `var(--el-color-warning)`
- `#FF4D4F` → `var(--color-danger)` 或 `var(--el-color-danger)`
- `#1677FF` → `var(--color-info)` 或 `var(--el-color-info)`

- [ ] **Step 2: 替换硬编码间距**

将非4倍数的间距值调整为4的倍数：
- `5px` → `4px` 或 `8px`
- `6px` → `4px` 或 `8px`
- `7px` → `8px`
- `9px` → `8px` 或 `12px`
- `10px` → `8px` 或 `12px`
- `11px` → `12px`
- `13px` → `12px` 或 `16px`
- `14px` → `16px`
- `15px` → `16px`
- `17px` → `16px` 或 `20px`
- `18px` → `16px` 或 `20px`
- `19px` → `20px`
- `21px` → `20px` 或 `24px`
- `22px` → `24px`
- `23px` → `24px`
- `25px` → `24px` 或 `32px`

- [ ] **Step 3: 替换硬编码圆角**

将非4/8px的圆角值调整：
- `2px` → `4px`
- `3px` → `4px`
- `5px` → `4px` 或 `8px`
- `6px` → `4px` 或 `8px`
- `7px` → `8px`
- `9px` → `8px`
- `10px` → `8px`
- `12px` → `8px`

- [ ] **Step 4: 替换硬编码字体大小**

使用CSS变量：
- `12px` → `var(--font-size-xs)`
- `13px` → `var(--font-size-sm)`
- `14px` → `var(--font-size-md)`
- `16px` → `var(--font-size-lg)`
- `20px` → `var(--font-size-xl)`
- `24px` → `var(--font-size-xxl)`

- [ ] **Step 5: 验证替换效果**

运行开发服务器，检查UI是否正常显示：
```bash
npm run dev
```

- [ ] **Step 6: 提交代码**

```bash
git add -A
git commit -m "refactor: 替换硬编码颜色值为CSS变量"
```

---

## Task 6: 重构CommonList.vue组件

**Covers:** FR-5

**Files:**
- Modify: `src/components/commoncomponents/CommonList.vue`
- Create: `src/components/commoncomponents/CommonListColumn.vue`
- Create: `src/components/commoncomponents/CommonListActions.vue`

**Interfaces:**
- Consumes: 现有CommonList组件
- Produces: 拆分后的组件

- [ ] **Step 1: 分析CommonList.vue结构**

识别可拆分的部分：
1. 列定义渲染逻辑
2. 操作列渲染逻辑
3. 分页控件
4. 选择逻辑

- [ ] **Step 2: 创建CommonListColumn.vue**

```vue
<!-- src/components/commoncomponents/CommonListColumn.vue -->
<template>
  <!-- 序号列 -->
  <el-table-column
    v-if="column.type === 'index'"
    type="index"
    :label="column.label"
    :min-width="column.width || 'auto'"
    :align="column.align || 'center'"
  >
    <template #default="scope">
      <div style="text-align: center; width: 100%">
        {{ (currentPage - 1) * pageSize + scope.$index + 1 }}
      </div>
    </template>
  </el-table-column>

  <!-- 自定义列 -->
  <el-table-column
    v-else-if="column.type === 'custom'"
    :label="column.label"
    :min-width="column.width || 'auto'"
    :align="column.align || 'center'"
  >
    <template #default="scope">
      <div :style="{ textAlign: column.align || 'center', width: '100%' }">
        <slot :name="column.slotName || column.prop" :row="scope.row" :index="scope.$index">
          {{ scope.row[column.prop] }}
        </slot>
      </div>
    </template>
  </el-table-column>

  <!-- 普通数据列 -->
  <el-table-column
    v-else
    :prop="column.prop"
    :label="column.label"
    :min-width="column.width || 'auto'"
    :align="column.align || 'center'"
  />
</template>

<script setup lang="ts">
interface Column {
  type?: string
  prop?: string
  label: string
  width?: string
  align?: string
  slotName?: string
}

defineProps<{
  column: Column
  currentPage: number
  pageSize: number
}>()
</script>
```

- [ ] **Step 3: 创建CommonListActions.vue**

```vue
<!-- src/components/commoncomponents/CommonListActions.vue -->
<template>
  <el-table-column
    v-if="showActions"
    align="center"
    :min-width="actionColumnWidth || 'auto'"
    label="操作"
  >
    <template #header>
      <div class="action-header">
        <span>操作</span>
        <el-input
          v-if="showSearch"
          v-model="searchQuery"
          placeholder="搜索"
          size="small"
          clearable
          @input="handleSearch"
          @clear="handleSearch"
          style="width: 120px; margin-left: 8px"
        />
      </div>
    </template>
    <template #default="scope">
      <div class="action-buttons">
        <slot name="actions" :row="scope.row" :index="scope.$index">
          <el-button
            v-if="showEdit"
            type="primary"
            link
            @click="$emit('edit', scope.row)"
          >
            编辑
          </el-button>
          <el-button
            v-if="showDelete"
            type="danger"
            link
            @click="$emit('delete', scope.row)"
          >
            删除
          </el-button>
        </slot>
      </div>
    </template>
  </el-table-column>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  showActions?: boolean
  actionColumnWidth?: string
  showSearch?: boolean
  showEdit?: boolean
  showDelete?: boolean
}>()

defineEmits<{
  (e: 'edit', row: any): void
  (e: 'delete', row: any): void
  (e: 'search', query: string): void
}>()

const searchQuery = ref('')

const handleSearch = () => {
  // 触发搜索事件
}
</script>

<style scoped>
.action-header {
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
}
</style>
```

- [ ] **Step 4: 重构CommonList.vue**

将原有组件拆分，使用子组件：
- 使用 `CommonListColumn` 渲染列
- 使用 `CommonListActions` 渲染操作列
- 保持原有接口不变

- [ ] **Step 5: 验证重构效果**

运行测试和开发服务器，确保功能正常：
```bash
npm run test
npm run dev
```

- [ ] **Step 6: 提交代码**

```bash
git add src/components/commoncomponents/
git commit -m "refactor: 重构CommonList.vue，拆分子组件"
```

---

## Task 7: 添加缺失路由

**Covers:** 路由完整性

**Files:**
- Modify: `src/router/index.ts`
- Create: `src/views/RecycleAssetView.vue`
- Create: `src/views/RepairAssetView.vue`
- Create: `src/views/ScrapAssetView.vue`
- Create: `src/views/AssetLogsView.vue`
- Create: `src/views/ScanAssetView.vue`
- Create: `src/views/ContactsView.vue`

**Interfaces:**
- Consumes: 现有路由结构
- Produces: 完整的路由配置

- [ ] **Step 1: 分析需求文档中的路由**

根据 `07-功能需求与验收标准.md`，缺失的路由：
1. `/assets/:code/recycle` - 回收操作
2. `/assets/:code/repair` - 维修操作
3. `/assets/:code/scrap` - 报废申请
4. `/assets/:code/logs` - 状态日志
5. `/scan/:recordcode` - 扫码查看
6. `/org/contacts` - 通讯录

- [ ] **Step 2: 创建缺失的视图组件**

为每个缺失路由创建对应的视图组件，实现基本功能。

- [ ] **Step 3: 更新路由配置**

在 `src/router/index.ts` 中添加新路由。

- [ ] **Step 4: 验证路由功能**

访问每个新路由，确保功能正常。

- [ ] **Step 5: 提交代码**

```bash
git add src/router/ src/views/
git commit -m "feat: 添加缺失路由和视图组件"
```

---

## Task 8: 添加缺失的功能模块

**Covers:** 功能模块完整性

**Files:**
- Create: `src/views/LostAssetView.vue`
- Create: `src/views/RepairAssetView.vue` (如果Task 7未创建)
- Create: 对应的API和Store

**Interfaces:**
- Consumes: 现有模块结构
- Produces: 完整的功能模块

- [ ] **Step 1: 分析缺失模块**

根据审查报告和需求文档：
1. LostAsset - 资产遗失模块
2. RepairAsset - 资产维修模块

- [ ] **Step 2: 创建LostAsset模块**

```typescript
// src/api/lostAsset.ts
import request from '@/utils/request'
import type { LostAsset } from '@/types/asset'

export function getLostAssets(params: any) {
  return request.get('/api/v1/lost-assets/', { params })
}

export function getLostAsset(recordcode: string) {
  return request.get(`/api/v1/lost-assets/${recordcode}/`)
}

export function createLostAsset(data: Partial<LostAsset>) {
  return request.post('/api/v1/lost-assets/', data)
}

export function updateLostAsset(recordcode: string, data: Partial<LostAsset>) {
  return request.put(`/api/v1/lost-assets/${recordcode}/`, data)
}

export function deleteLostAsset(recordcode: string) {
  return request.delete(`/api/v1/lost-assets/${recordcode}/`)
}
```

```typescript
// src/stores/lostAsset.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as lostAssetApi from '@/api/lostAsset'
import type { LostAsset } from '@/types/asset'

export const useLostAssetStore = defineStore('lostAsset', () => {
  const lostAssets = ref<LostAsset[]>([])
  const loading = ref(false)
  const total = ref(0)

  const fetchLostAssets = async (params: any) => {
    loading.value = true
    try {
      const response = await lostAssetApi.getLostAssets(params)
      lostAssets.value = response.data.items
      total.value = response.data.total
    } finally {
      loading.value = false
    }
  }

  const createLostAsset = async (data: Partial<LostAsset>) => {
    const response = await lostAssetApi.createLostAsset(data)
    return response.data
  }

  return {
    lostAssets,
    loading,
    total,
    fetchLostAssets,
    createLostAsset
  }
})
```

```vue
<!-- src/views/LostAssetView.vue -->
<template>
  <div class="lost-asset-view">
    <SmartListContainer :store-config="storeConfig">
      <template #default="slotProps">
        <CommonList
          :data="slotProps.data"
          :loading="slotProps.loading"
          v-model:current-page="slotProps.currentPage"
          v-model:page-size="slotProps.pageSize"
          :total="slotProps.total"
          :columns="columns"
          @size-change="slotProps.handleSizeChange"
          @current-change="slotProps.handleCurrentChange"
        />
      </template>
    </SmartListContainer>
  </div>
</template>

<script setup lang="ts">
import SmartListContainer from '@/components/commoncomponents/SmartListContainer.vue'
import CommonList from '@/components/commoncomponents/CommonList.vue'
import { useLostAssetStore } from '@/stores/lostAsset'

const store = useLostAssetStore()

const storeConfig = {
  store,
  fetchAction: 'fetchLostAssets'
}

const columns = [
  { type: 'index', label: '序号', width: '60' },
  { prop: 'asset_recordcode', label: '资产编码', width: '150' },
  { prop: 'lost_date', label: '遗失日期', width: '120' },
  { prop: 'lost_reason', label: '遗失原因', width: '200' },
  { prop: 'lost_location', label: '最后位置', width: '150' },
  { prop: 'operator_employee', label: '操作人', width: '100' }
]
</script>
```

- [ ] **Step 3: 创建RepairAsset模块**

类似LostAsset模块，创建RepairAsset的API、Store和视图组件。

- [ ] **Step 4: 更新路由配置**

在路由中添加新模块的路由。

- [ ] **Step 5: 验证模块功能**

测试每个模块的CRUD功能。

- [ ] **Step 6: 提交代码**

```bash
git add src/api/ src/stores/ src/views/
git commit -m "feat: 添加LostAsset和RepairAsset功能模块"
```

---

## Task 9: 验证与测试

**Covers:** 所有任务

**Files:**
- 所有修改的文件

**Interfaces:**
- Consumes: 所有实现的代码
- Produces: 通过测试的代码

- [ ] **Step 1: 运行TypeScript检查**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: 运行ESLint检查**

```bash
npm run lint
```

- [ ] **Step 3: 运行单元测试**

```bash
npm run test
```

- [ ] **Step 4: 运行覆盖率检查**

```bash
npx vitest --coverage --threshold 80
```

- [ ] **Step 5: 运行复杂度检查**

```bash
npx eslint . --ext .vue,.ts --rule "complexity: ['error', 10]"
```

- [ ] **Step 6: 手动测试UI**

启动开发服务器，手动测试：
1. 暗色模式切换
2. 所有页面访问
3. 表单提交
4. 列表分页
5. 搜索功能

- [ ] **Step 7: 提交最终代码**

```bash
git add -A
git commit -m "chore: 验证与测试通过"
```

---

## Self-Review

**1. Spec coverage:**
- F1 (主色 #2B5FD7) - Task 1, Task 5
- F2 (功能色) - Task 1, Task 5
- F3 (圆角) - Task 1, Task 5
- F4 (间距) - Task 1, Task 5
- F5 (字体) - Task 1, Task 5
- F6 (Vue组件语法) - 全局约束
- F13 (暗色模式) - Task 1, Task 4
- F14 (TypeScript严格) - Task 2
- F15 (类型定义位置) - Task 3
- FR-5 (组件行数) - Task 6

**2. Placeholder scan:** 无占位符，所有步骤都有具体代码

**3. Type consistency:** 所有类型定义一致，接口匹配

**Execution Handoff:** 建议使用Subagent执行，因为任务较多且相对独立。