# 前端开发规范

> 编写 Vue 3 组件、样式、状态管理时必须遵守的约定。

## 1. 代码风格与格式化
- 使用 **单引号**、**无分号**、每行最大 **100** 字符（Prettier 自动处理）
- 缩进统一为 2 空格
- 变量/函数命名采用 **camelCase**，组件名 **PascalCase**（必须多词）
- 禁止拼音、无意义简写，语义化命名
- 未使用变量使用 `_` 前缀，如 `_unusedVar`

## 2. TypeScript 规范
- 强制使用 TypeScript，启用严格模式
- 禁止隐式 `any`，必须显式声明类型
- 接口/类型命名采用 **PascalCase**
- API 返回数据必须定义对应的 response 类型
- 组件 `props` 和 `emits` 必须类型化
- 优先使用 `interface` 定义对象结构，`type` 用于联合类型或工具类型

```ts
// ✅ 正确示例
interface AssetItem {
  id: number
  name: string
  status: AssetStatus
}
const props = defineProps<{ asset: AssetItem }>()
```

## 3. 组件设计规范
- 统一使用` <script setup lang="ts"> `组合式 API
- 组件文件命名：AssetTable.vue，必须 多词
- 单向数据流：父传子用 props，子传父用 emits
- UI 组件只负责渲染，业务逻辑抽离到 composables/ 或 services/
- 禁止在组件内直接操作 DOM（除非封装为自定义指令）
- 组件结构顺序：`<template> → <script setup> → <style scoped>`

## 4. 样式规范
- 使用`<style scoped lang="scss"> `实现样式隔离
- 全局样式和 SCSS 变量放在 src/assets/，通过 main.ts 导入
- 禁止污染全局样式，主题色等常量统一管理
- 禁止使用 !important（覆盖第三方样式除外）
- 原子化 CSS 不作为强制要求，组件内优先使用 Element Plus 内置样式

## 5. 导入与模块规范
- 强制使用别名 @/，禁止 ../ 相对路径
- 导入顺序：Vue 核心 → 第三方库 → @/ 内部模块 → 相对路径（尽量避免）
- 自动导入 API（ref, reactive, useRouter 等）无需手动 import
- API 函数统一放在 src/api/ 目录下，按业务模块分文件
- 使用封装后的 request 实例，禁止直接使用 axios

```ts
// ✅ 正确导入顺序
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAssetStore } from '@/stores/asset'
import AssetTable from '@/components/AssetTable.vue'

import request from '@/utils/request'
export function getAssetList(params: AssetListParams) {
  return request.get('/api/assets', { params })
}
```

## 6. 状态管理（Pinia）
- 使用组合式 Store：defineStore + setup 函数
- Store 命名规范：useXxxStore，文件放在 src/stores/
- 全局状态集中管理，局部状态在组件内维护
- 需要持久化的状态（如 token）开启 persist: true
- 异步操作统一在 store 的 actions 中处理，组件只负责触发

```ts
// ✅ Store 示例
export const useAuthStore = defineStore('auth', () => {
  const token = ref('')
  return { token }
}, { persist: true })
```

## 7. UI组件使用规范

### 7.1 表格
- 简单表格使用` <el-table>`，复杂表格（可编辑、虚拟滚动、多级表头等）使用` <vxe-grid>`
- 表格列定义必须使用配置式数组，避免在模板中重复编写列结构
- 表格数据必须提供类型声明

```vue
<vxe-grid :columns="columns" :data="tableData" />
```
### 7.2 图标
- 使用 `<icon-ep-xxx />` 或` <icon-carbon-xxx />`（已自动全局注册）
- 禁止手动导入 @element-plus/icons-vue

### 7.3 图表
- 使用 `<v-chart :option="chartOption" />`
- 图表配置抽离为独立函数或 composable，避免在组件内写长配置

## 8. 性能与体验
- 路由组件使用动态 import() 实现懒加载
- 列表数据使用分页或虚拟滚动，避免一次性渲染大量数据
- 避免在模板中使用复杂表达式，通过 computed 预计算
- 合理使用 v-if / v-show，频繁切换用 v-show
- 图片资源使用懒加载或 Element Plus 的 el-image 组件

### 8.1 部门管理组件
- `DepartmentBatchAddDialog`：批量新增子部门弹窗，支持动态添加/删除行，调用 `POST /api/users/departments/batch-create/` 接口
- `DepartmentInfoCard`：部门信息卡片，支持编辑、新增子部门、批量新增子部门、删除操作

### 8.2 资产表单组件（AssetForm）

**组件结构**（2026-06-28 重构，拆分为 4 个子组件）：

| 组件 | 路径 | 职责 |
|------|------|------|
| `AssetForm` | `detils/AssetForm.vue` | 主表单容器，管理表单状态、验证、提交 |
| `AssetBasicInfo` | `detils/detilschildcomponents/AssetBasicInfo.vue` | 基本信息区（编码/名称/规格/品牌/单位/价格/数量/日期/分类/录入人） |
| `AssetContractInfo` | `detils/detilschildcomponents/AssetContractInfo.vue` | 合同信息区（合同名称 autocomplete + 合同编码 select） |
| `AssetManagementInfo` | `detils/detilschildcomponents/AssetManagementInfo.vue` | 管理信息区（申请人/管理员/使用地点） |
| `AssetStorageInfo` | `detils/detilschildcomponents/AssetStorageInfo.vue` | 存储位置区（仓库名称 select + 仓库编码 + 描述） |

**Props 传递**：
- 所有子组件接收 `form: AssetCreateFormExtended`（父组件 reactive 对象的引用，子组件可直接修改属性）
- `AssetBasicInfo` 额外接收 `entryLinkage`（录入人联动方法）、`assetTypes`（资产类型列表）、`displayStatus`（状态文本）
- `AssetContractInfo` 额外接收 `associationMethods`（合同联动方法）、`contracts`（合同列表）
- `AssetManagementInfo` 额外接收 `applicantLinkage`/`managerLinkage`（人员联动方法）
- `AssetStorageInfo` 额外接收 `associationMethods`（仓库联动方法）、`storages`（仓库列表）

**Events**：
- `AssetBasicInfo` → `@typeChange(primaryName: string)`：资产分类选择变更，父组件调用 `handleAssetTypeChange` 设置 `asset_type`

**验证规则**（`assetFormRules.ts`）：
- 必填：`asset_name`（2-100字符）、`asset_type`（change+blur）、`asset_purchase_price`（≥0）、`asset_purchase_date`、`asset_entry_date`
- 其余字段后端均为可选

**提交流程**：
- 新增：`assetAPI.createAsset(getAssetCreateForm.value)` → `POST /api/assets/assets/`
- 编辑：`assetAPI.updateAsset({ ...getAssetCreateForm.value, asset_code })` → `PUT /api/assets/assets/{asset_code}/`
- 成功后调用 `assetStore.setRefreshFlag(true)` 触发列表刷新

**Composables**：
- `useAssetFormHelpers.ts`：导出 `UserSuggestion`、`ContractSuggestion` 类型（子组件 prop 类型使用）
- `useAssetFormAssociations`：加载资产类型/合同/仓库基础数据
- `useAssetFormAssociationMethods`：合同名称-编码联动、仓库名称-编码联动
- `useEmployeeLinkage`：姓名-工号联动（通用）

### 8.2 回收资产表单（RecycleAssetForm）

**功能**：
- 新增模式：支持多条回收（selectedRecords 列表 + batch_create 批量提交）
- 编辑模式：保持原有单条逻辑

**数据结构**：
- `selectedRecords: SelectedRecord[]` — 已选可回收出库记录列表（按 recordcode 去重）
- `formData` — 共享信息（仓库、回收人、日期、回收原因、描述）

**提交逻辑**：
- 0 条记录 → 提示"请至少选择一条"
- 1 条记录 → `POST /assets/recycle-assets/`（单条 create）
- N 条记录 → `POST /assets/recycle-assets/batch-create/`（批量 create）

**字段映射**（前端 → 后端）：
| 前端 | 后端单条 | 后端批量 |
|---|---|---|
| `selectedRecords[i].recordcode` | `recycle_outasset` | `items[i].recycle_outasset_code` |
| `formData.recycle_asset_storage_code` | `recycle_asset_storage` | 顶层 `recycle_asset_storage` |
| `formData.recycle_asset_recycle_person_jobcode` | `recycle_asset_recycle_person_jobcode` | 顶层 `recycle_asset_recycle_person_jobcode` |
| `formData.recycle_type` | `recycle_type` | `items[i].recycle_type` |

### 8.3 审计日志组件
- `AuditLogDetails`：通用审计日志列表页，展示部门/员工/用户等非资产操作的审计记录，支持筛选（应用模块/操作类型/操作人/日期范围）和 Excel 导出
- `AuditLogDetail`：审计日志详情页，展示变更前后数据对比
- `OperationLogDetails`：资产操作日志列表页，展示资产相关操作记录
- `OperationLogDetail`：资产操作日志详情页

### 8.4 前后端字段对齐规范（2026-06-26 审计后固化）

> 以下规范源于综合审计中发现的前后端字段不匹配问题，所有后续开发必须遵守。

**API 层字段映射规则**：
- 前端表单字段名必须与后端序列化器字段名一致（2026-06-28 重构后）
- 如字段名不一致，必须在 `src/api/*.ts` 中做显式映射
- 示例：Asset 模块已重构为字段名一致，API 层直接透传 `AssetCreateForm`
- 禁止直接透传不匹配的字段名，必须在 API 层做 `destructuring + rename`

**Store idKey 规则**：
- `idKey` 必须与后端 `lookup_field` 一致（即后端 URL 路径参数对应的字段名）
- 后端 `lookup_field` 为 FK 穿透时（如 `waste_asset__asset_code`），`idKey` 应为最终穿透字段（如 `asset_code`）
- `update` 方法中传给 API 的标识字段必须与 `idKey` 一致

**后端字段名参考**（`D:\CodeDemo\Python\asset_management_backend\docs\ALL_Fields_details.md`）：

| 实体 | 后端 lookup_field | Store idKey | API 创建字段（SlugRelated） |
|------|-------------------|-------------|---------------------------|
| Asset | `asset_code` | `asset_code` | `asset_type`, `asset_contract`, `asset_storage`, `asset_entry_person`, `asset_applicant`, `asset_manager`（字段名已对齐，直接透传） |
| OutAsset | `recordcode` | `recordcode` | `outasset_asset` |
| RecycleAsset | `recordcode` | `recordcode` | `recycle_outasset`, `recycle_asset_code` |
| DamagedAsset | `damaged_asset` | `damaged_asset` | `damaged_asset` |
| WasteAsset | `waste_asset__asset_code` | `asset_code` | — |
| HardDiskSN | `harddisksn_asset` | `harddisksn_asset` | — |
| Storage | `storage_code` | `storage_code` | — |
| AssetType | `asset_type_code` | `asset_type_code` | — |
| Contract | `contract_code` | `contract_code` | — |
| Department | `department_code` | `department_code` | — |
| Employee | `employee_jobcode` | `employee_jobcode` | — |

**combine_search 参数名**（后端 `CombineSearchSerializer`）：
- 模糊匹配：`asset_name`, `asset_specification`, `asset_brand`
- 精确匹配：`asset_current_status`, `asset_type`, `asset_type_category`, `asset_storage`, `asset_contract`

**search_assets 参数名**（后端 `AssetSelector.search_assets`）：
- `keyword`, `status`, `asset_type`, `storage_code`, `contract_code`
