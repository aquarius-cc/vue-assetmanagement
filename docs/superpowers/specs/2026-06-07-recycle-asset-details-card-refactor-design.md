# RecycleAssetBasicDetails 卡片化重构设计

> 日期：2026-06-07
> 状态：已批准，待实现（v3 更新：合同查询改为直接调用 assetAPI）

## 背景

`RecycleAssetBasicDetails.vue`（回收资产详情页）当前使用单个 `el-card` + 手写双列网格展示所有 12 个字段。需要将其拆分为 5 个语义清晰的卡片（基本信息、合同信息、使用人信息、回收人信息、仓库信息），复用已有的 `InfoCard.vue` 通用组件。

## 与出库资产重构的对比

| 对比项 | 出库资产 | 回收资产（本方案） |
|--------|---------|---------|
| 数据来源 | 主详情 + 3 个关联数据（并行加载） | 主详情 + 4 个关联数据（并行加载） |
| composable 输入 | `Ref<OutAssetDetailCardData>`（4 个字段） | `Ref<RecycleAssetDetailCardData>`（5 个字段） |
| 卡片数量 | 4 个 | 5 个（全部有数据） |
| 关联查询 | 申请人、保管人、合同（3 个） | 合同、使用人、回收人、仓库（4 个） |

## 决策记录

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 字段归属 | 基本信息 8、合同 8、使用人 2、回收人 2、仓库 5 | 按语义自然划分，使用人=保管人 |
| 合同查询方式 | `assetAPI.getContractByAssetCode(asset_code)` | 直接获取 Contract，比 `assetStore.getById` 更精确高效 |
| 关联数据加载 | `Promise.all` 并行加载 4 个关联数据 | 参照 OutAssetBasicDetails 的成熟模式 |
| 实现方案 | 方案 2（composable） | 与出库资产模式一致，便于统一维护 |

## 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/composables/useRecycleAssetDetailCards.ts` | **新建** | composable，接收 `Ref<RecycleAssetDetailCardData>`，返回 5 个 `InfoCardConfig` |
| `src/components/componentsdetails/detils/RecycleAssetBasicDetails.vue` | 修改 | 模板改为 5 个 InfoCard；新增 `Promise.all` 并行加载关联数据；引入 composable；删除手写网格样式 |
| `src/components/commoncomponents/InfoCard.vue` | 不修改 | 已有能力完全满足 |
| `src/types/info-card.ts` | 不修改 | 已有能力完全满足 |

## 关联查询映射

| 关联数据 | 查询条件 | 查询方式 | 返回类型 | 用途 |
|---------|---------|---------|---------|------|
| 合同详情 | `detail.recycle_asset_code` | `assetAPI.getContractByAssetCode(code)` | `Contract` | 合同信息卡片 |
| 使用人详情 | `detail.recycle_asset_using_person_jobcode` | `userStore.getById(jobcode)` | `EmployeeExtended` | 使用人信息卡片 |
| 回收人详情 | `detail.recycle_asset_recycle_person_jobcode` | `userStore.getById(jobcode)` | `EmployeeExtended` | 回收人信息卡片 |
| 仓库详情 | `detail.recycle_asset_storage_code` | `storageStore.getById(code)` | `Storage` | 仓库信息卡片 |

**注意**：合同查询直接调用 `assetAPI`（Store 未封装该方法），其余 3 个通过 Store 查询。

## 字段归属映射

### 卡片 1：基本信息（8 个字段）

| 字段 | label | 数据来源 | 格式化 |
|------|-------|---------|--------|
| ID | `ID` | `detail.id` | 默认 `'N/A'` |
| 资产编码 | `资产编码` | `detail.recycle_asset_code` | 默认 `'N/A'` |
| 资产名称 | `资产名称` | `detail.recycle_asset_name` | 默认 `'N/A'` |
| 规格型号 | `规格型号` | `detail.recycle_asset_specification` | 默认 `'无'` |
| 回收时间 | `回收时间` | `detail.recycle_asset_date` | `formatDate` |
| 回收数量 | `回收数量` | `detail.recycle_asset_number` | — |
| 回收描述 | `回收描述` | `detail.recycle_asset_description` | 默认 `'无'` |
| 出库记录编码 | `出库记录编码` | `detail.outasset_recordcode` | 默认 `'N/A'` |

- 图标：`Document`
- 布局：双列 grid（左 4，右 4）

### 卡片 2：合同信息（8 个字段）

| 字段 | label | 数据来源 | 格式化 |
|------|-------|---------|--------|
| 合同编码 | `合同编码` | `contractDetail.contract_code` | 默认 `'N/A'` |
| 合同名称 | `合同名称` | `contractDetail.contract_name` | 默认 `'N/A'` |
| 合同金额 | `合同金额` | `contractDetail.contract_price` | `isPrice: true` |
| 合同供应商 | `合同供应商` | `contractDetail.contract_supplier` | 默认 `'N/A'` |
| 签订日期 | `签订日期` | `contractDetail.contract_signing_date` | `formatDate` |
| 保修期 | `保修期` | `contractDetail.contract_warranty_period` | 拼接 `'年'` |
| 初验日期 | `初验日期` | `contractDetail.contract_preliminary_acceptance_date` | `formatDate` |
| 终验日期 | `终验日期` | `contractDetail.contract_final_acceptance_date` | `formatDate` |

- 图标：`Tickets`
- 布局：双列 grid（左 4，右 4）
- 数据来源：通过 `assetAPI.getContractByAssetCode(recycle_asset_code)` 直接获取 `Contract`

### 卡片 3：使用人信息（2 个字段）

| 字段 | label | 数据来源 | 格式化 |
|------|-------|---------|--------|
| 使用人 | `使用人` | `usingPerson.employee_name / employee_department.department_name` 拼接 | 默认 `'N/A'` |
| 使用人工号 | `使用人工号` | `detail.recycle_asset_using_person_jobcode` | 默认 `'N/A'` |

- 图标：`User`
- 布局：单列
- 数据来源：通过 `userStore.getById(recycle_asset_using_person_jobcode)` 获取 `EmployeeExtended`

### 卡片 4：回收人信息（2 个字段）

| 字段 | label | 数据来源 | 格式化 |
|------|-------|---------|--------|
| 回收人 | `回收人` | `recyclePerson.employee_name / employee_department.department_name` 拼接 | 默认 `'N/A'` |
| 回收人工号 | `回收人工号` | `detail.recycle_asset_recycle_person_jobcode` | 默认 `'N/A'` |

- 图标：`UserFilled`
- 布局：单列
- 数据来源：通过 `userStore.getById(recycle_asset_recycle_person_jobcode)` 获取 `EmployeeExtended`

### 卡片 5：仓库信息（5 个字段）

| 字段 | label | 数据来源 | 格式化 |
|------|-------|---------|--------|
| 仓库编码 | `仓库编码` | `storageDetail.storage_code` | 默认 `'N/A'` |
| 仓库名称 | `仓库名称` | `storageDetail.storage_name` | 默认 `'N/A'` |
| 仓库地址 | `仓库地址` | `storageDetail.storage_address` | 默认 `'无'` |
| 仓库类型 | `仓库类型` | `storageDetail.storage_type` | 默认 `'无'` |
| 仓库描述 | `仓库描述` | `storageDetail.storage_description` | 默认 `'无'` |

- 图标：`Location`
- 布局：双列 grid（左 3，右 2）
- 数据来源：通过 `storageStore.getById(recycle_asset_storage_code)` 获取 `Storage`

## 详细变更说明

### 1. 新建 composable：useRecycleAssetDetailCards.ts

**文件路径**：`src/composables/useRecycleAssetDetailCards.ts`

**接口设计**：

```ts
interface RecycleAssetDetailCardData {
  /** 回收资产主详情 */
  detail: RecycleAssetExtended | null
  /** 通过 assetAPI.getContractByAssetCode(recycle_asset_code) 获取 */
  contractDetail: Contract | null
  /** 通过 userStore.getById(recycle_asset_using_person_jobcode) 获取 */
  usingPerson: EmployeeExtended | null
  /** 通过 userStore.getById(recycle_asset_recycle_person_jobcode) 获取 */
  recyclePerson: EmployeeExtended | null
  /** 通过 storageStore.getById(recycle_asset_storage_code) 获取 */
  storageDetail: Storage | null
}

function useRecycleAssetDetailCards(
  data: Ref<RecycleAssetDetailCardData>
): {
  basicInfoConfig: ComputedRef<InfoCardConfig>
  contractInfoConfig: ComputedRef<InfoCardConfig>
  usingPersonInfoConfig: ComputedRef<InfoCardConfig>
  recyclePersonInfoConfig: ComputedRef<InfoCardConfig>
  storageInfoConfig: ComputedRef<InfoCardConfig>
}
```

**核心逻辑**：

- 接收一个 `Ref<RecycleAssetDetailCardData>` 参数（包含主详情和 4 个关联数据）
- 内部定义 5 个 `computed`，每个返回 `InfoCardConfig`
- 使用 `formatDate` 格式化日期字段
- 人员卡片拼接 `employee_name / employee_department.department_name`
- 合同金额字段使用 `isPrice: true`
- 保修期字段拼接 `'年'` 单位

### 2. RecycleAssetBasicDetails.vue 变更

**模板变更**：

```html
<div class="child-page-content">
  <template v-if="detailData">
    <InfoCard :config="basicInfoConfig" />
    <InfoCard :config="contractInfoConfig" />
    <InfoCard :config="usingPersonInfoConfig" />
    <InfoCard :config="recyclePersonInfoConfig" />
    <InfoCard :config="storageInfoConfig" />
  </template>
  <div v-else-if="!isLoading">
    <el-empty description="未找到回收资产详情数据" />
  </div>
</div>
```

**脚本变更 — 新增依赖**：

```ts
import { assetAPI } from '@/api/asset'                  // 查合同（直接调用 API）
import { useUserStore } from '@/stores/userStore'        // 查人员
import { useStorageStore } from '@/stores/storageStore'  // 查仓库
```

**脚本变更 — 新增关联数据 ref**：

```ts
const contractDetail = ref<Contract | null>(null)
const usingPerson = ref<EmployeeExtended | null>(null)
const recyclePerson = ref<EmployeeExtended | null>(null)
const storageDetail = ref<Storage | null>(null)
```

**脚本变更 — loadDetail 中新增 Promise.all 并行加载**：

```ts
const loadDetail = async (code: string) => {
  const detail = await recycleAssetStore.getById(code)
  if (!detail) { ... }
  detailData.value = detail

  const promises: Promise<unknown>[] = []

  // 合同：直接调用 API（Store 未封装此方法）
  if (detail.recycle_asset_code) {
    promises.push(
      assetAPI.getContractByAssetCode(detail.recycle_asset_code).then((contract) => {
        contractDetail.value = contract
      }),
    )
  }
  // 使用人
  if (detail.recycle_asset_using_person_jobcode) {
    promises.push(
      userStore.getById(detail.recycle_asset_using_person_jobcode).then((user) => {
        usingPerson.value = user
      }),
    )
  }
  // 回收人
  if (detail.recycle_asset_recycle_person_jobcode) {
    promises.push(
      userStore.getById(detail.recycle_asset_recycle_person_jobcode).then((user) => {
        recyclePerson.value = user
      }),
    )
  }
  // 仓库
  if (detail.recycle_asset_storage_code) {
    promises.push(
      storageStore.getById(detail.recycle_asset_storage_code).then((storage) => {
        storageDetail.value = storage
      }),
    )
  }

  await Promise.all(promises)
}
```

**脚本变更 — composable 调用**：

```ts
const cardData = computed(() => ({
  detail: detailData.value,
  contractDetail: contractDetail.value,
  usingPerson: usingPerson.value,
  recyclePerson: recyclePerson.value,
  storageDetail: storageDetail.value,
}))

const {
  basicInfoConfig,
  contractInfoConfig,
  usingPersonInfoConfig,
  recyclePersonInfoConfig,
  storageInfoConfig,
} = useRecycleAssetDetailCards(cardData)
```

**样式变更**：

- 删除：`.main-info-card`、`.section-header`、`.section-title`、`.info-grid`、`.info-column`、`.info-item`、`.info-label`、`.info-value`
- 保留：`.recycle-asset-detail-page`、`.child-page-header`、`.page-title`、`.action-buttons`、`.child-page-content` 及响应式规则

## 不变部分

以下逻辑完全不受影响：

- 导出功能（`useExcelExport`、`exportColumns` 配置）
- 页面头部（标题、返回按钮、导出按钮）
- 路由参数获取逻辑

## 验证清单

1. `npm run type-check` 零错误
2. `npm run lint` 零新增警告
3. `Promise.all` 并行加载 4 个关联数据，每个查询前检查外键字段是否存在
4. 25 个字段在 5 个卡片中无遗漏（8 + 8 + 2 + 2 + 5 = 25）
5. 空值处理与原页面一致（`'N/A'` / `'无'`）
6. 导出功能不受影响
7. 响应式布局正常
8. 全项目使用 `@/` 别名导入，无相对路径

## 风险评估

| 风险 | 等级 | 应对 |
|------|------|------|
| 关联查询 API 失败 | 低 | Promise.all 中单个查询失败不影响其他查询，页面展示默认值 |
| 字段遗漏 | 低 | 已逐字段映射表验证，25 个字段全覆盖 |
| 导出功能受影响 | 无 | 导出逻辑完全独立于模板 |
