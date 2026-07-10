# OutAssetBasicDetails 卡片化重构设计

> 日期：2026-06-06
> 状态：已批准，待实现

## 背景

`OutAssetBasicDetails.vue`（出库资产详情页）当前使用单个 `el-card` + 手写双列网格展示所有 17 个字段。需要将其拆分为 4 个语义清晰的卡片（基本信息、合同信息、申请人信息、保管人信息），复用已有的 `InfoCard.vue` 通用组件。

## 决策记录

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 字段归属 | 方案 A | 按语义自然划分：基本信息 11 字段、合同 2、申请人 2、保管人 2 |
| 卡片图标 | 扩展 InfoCard | 新增 Tickets/Stamp/UserFilled/Avatar 图标，丰富卡片视觉区分 |
| 实现方案 | 方案 2（composable） | 将卡片配置逻辑抽取到 `useOutAssetDetailCards.ts`，便于未来复用 |

## 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/components/commoncomponents/InfoCard.vue` | 修改 | iconMap 新增 4 个图标导入 |
| `src/types/info-card.ts` | 修改 | `icon` 类型联合新增 4 个值 |
| `src/composables/useOutAssetDetailCards.ts` | **新建** | composable，接收详情数据，返回 4 个 `InfoCardConfig` |
| `src/components/componentsdetails/detils/OutAssetBasicDetails.vue` | 修改 | 模板改为 4 个 InfoCard；引入 composable；删除手写网格样式 |

## 字段归属映射

### 卡片 1：基本信息（11 个字段）

| 字段 | label | 数据来源 | 格式化 |
|------|-------|---------|--------|
| ID | `ID` | `detail.id` | 默认 `'N/A'` |
| 出库唯一标识码 | `出库唯一标识码` | `detail.outasset_recordcode` | 默认 `'N/A'` |
| 资产码 | `资产码` | `detail.outasset_code` | — |
| 资产名称 | `资产名称` | `detail.outasset_name` | — |
| 规格型号 | `规格型号` | `detail.outasset_specification` | — |
| 出库时间 | `出库时间` | `detail.outasset_date` | `formatDate` |
| 归还日期 | `归还日期` | `detail.return_date` | `formatDate` |
| 资产状态 | `资产状态` | `detail.outasset_current_status` | `getOutAssetStatusText` |
| 使用地点 | `使用地点` | `detail.outasset_using_location` | 默认 `'无'` |
| 出库类型 | `出库类型` | `detail.outasset_type` | `getOutAssetTypeText` |
| 备注描述 | `备注描述` | `detail.outasset_description` | 默认 `'无'` |

- 图标：`Document`
- 布局：双列 grid（左 6，右 5）

### 卡片 2：合同信息（2 个字段）

| 字段 | label | 数据来源 | 格式化 |
|------|-------|---------|--------|
| 所在合同号 | `所在合同号` | `assetContract.asset_contract.contract_code` | 默认 `'N/A'` |
| 所在合同名称 | `所在合同名称` | `assetContract.asset_contract.contract_name` | 默认 `'N/A'` |

- 图标：`Tickets`
- 布局：单列

### 卡片 3：申请人信息（2 个字段）

| 字段 | label | 数据来源 | 格式化 |
|------|-------|---------|--------|
| 申请人 | `申请人` | `applicantUser.employee_name / department_name` 拼接 | 默认 `'N/A'` |
| 申请人工号 | `申请人工号` | `detail.outasset_applicant_jobcode` | 默认 `'N/A'` |

- 图标：`User`
- 布局：单列

### 卡片 4：保管人信息（2 个字段）

| 字段 | label | 数据来源 | 格式化 |
|------|-------|---------|--------|
| 保管人 | `保管人` | `managerUser.employee_name / department_name` 拼接 | 默认 `'N/A'` |
| 保管人工号 | `保管人工号` | `detail.outasset_manager_jobcode` | 默认 `'N/A'` |

- 图标：`UserFilled`
- 布局：单列

## 详细变更说明

### 1. InfoCard.vue 变更

**新增图标导入**：

```ts
import {
  Document, User, Location, InfoFilled,
  Tickets, Stamp, UserFilled, Avatar  // 新增
} from '@element-plus/icons-vue'
```

**扩展 iconMap**：

```ts
const iconMap = {
  Document,
  User,
  Location,
  InfoFilled,
  Tickets,      // 新增：合同/票据
  Stamp,        // 新增：合同/印章
  UserFilled,   // 新增：保管人
  Avatar,       // 新增：人员头像
} as const
```

### 2. info-card.ts 类型变更

```ts
icon: 'Document' | 'User' | 'Location' | 'InfoFilled'
     | 'Tickets' | 'Stamp' | 'UserFilled' | 'Avatar'
```

### 3. 新建 composable：useOutAssetDetailCards.ts

**文件路径**：`src/composables/useOutAssetDetailCards.ts`

**接口设计**：

```ts
interface OutAssetDetailCardData {
  detail: OutAssetDetail | null
  applicantUser: EmployeeExtended | null
  managerUser: EmployeeExtended | null
  assetContract: AssetDetail | null
}

function useOutAssetDetailCards(
  data: Ref<OutAssetDetailCardData>
): {
  basicInfoConfig: ComputedRef<InfoCardConfig>
  contractInfoConfig: ComputedRef<InfoCardConfig>
  applicantInfoConfig: ComputedRef<InfoCardConfig>
  managerInfoConfig: ComputedRef<InfoCardConfig>
}
```

**核心逻辑**：

- 接收一个 `Ref<OutAssetDetailCardData>` 参数
- 内部定义 4 个 `computed`，每个返回 `InfoCardConfig`
- 使用 `formatDate`、`getOutAssetStatusText`、`getOutAssetTypeText` 等格式化函数
- 格式化函数从 `@/utils/Format` 导入

### 4. OutAssetBasicDetails.vue 变更

**模板变更**：

```html
<div class="child-page-content">
  <template v-if="showOutAssetDetails">
    <InfoCard :config="basicInfoConfig" />
    <InfoCard :config="contractInfoConfig" />
    <InfoCard :config="applicantInfoConfig" />
    <InfoCard :config="managerInfoConfig" />
  </template>
  <div v-else-if="!isLoading">
    <el-empty description="未找到出库资产详情数据" />
  </div>
</div>
```

**脚本变更**：

- 新增导入 `InfoCard` 组件和 `useOutAssetDetailCards` composable
- 构造 `cardData` computed 并传入 composable
- 解构获取 4 个配置

**样式变更**：

- 删除：`.main-info-card`、`.section-header`、`.section-title`、`.info-grid`、`.info-column`、`.info-item`、`.info-label`、`.info-value`
- 保留：`.outasset-detail-page`、`.child-page-header`、`.page-title`、`.action-buttons`、`.child-page-content` 及响应式规则

## 不变部分

以下逻辑完全不受影响：

- 数据加载逻辑（`loadDetail`、`Promise.all` 并行加载）
- 导出功能（`useExcelExport`、`exportColumns` 配置）
- 辅助函数（`getOutAssetStatusText`、`getOutAssetTypeText`、`formatDate`）
- 页面头部（标题、返回按钮、导出按钮）
- 路由参数获取逻辑

## 验证清单

1. `@element-plus/icons-vue` 中确认 `Tickets`、`Stamp`、`UserFilled`、`Avatar` 图标存在
2. `npm run type-check` 零错误
3. `npm run lint` 零警告
4. 17 个字段在 4 个卡片中无遗漏
5. 空值处理与原页面一致
6. 导出功能不受影响
7. 响应式布局正常
8. 全项目使用 `@/` 别名导入，无相对路径

## 风险评估

| 风险 | 等级 | 应对 |
|------|------|------|
| 新图标在 `@element-plus/icons-vue` 中不存在 | 低 | 实现前先验证图标是否存在，不存在则选用已有图标替代 |
| InfoCard 样式与原页面视觉差异 | 低 | InfoCard 的 grid 布局参数与原页面几乎相同（min-width 300px、gap 20px），label min-width 差异（120 vs 110px）可忽略 |
| 遗漏字段 | 低 | 已逐字段映射表验证，17 个字段全覆盖 |
| 导出功能受影响 | 无 | 导出逻辑完全独立于模板 |
