# OutAssetBasicDetails 卡片化重构实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 OutAssetBasicDetails.vue 从单卡片布局重构为 4 个语义卡片，复用 InfoCard 组件

**架构：** 扩展 InfoCard 图标支持 → 新建 useOutAssetDetailCards composable → 重构页面模板和脚本 → 验证

**技术栈：** Vue 3 + TypeScript + Element Plus + Pinia

---

## 文件清单

| 文件 | 变更类型 | 职责 |
|------|---------|------|
| `src/components/commoncomponents/InfoCard.vue` | 修改 | 扩展 iconMap，新增 4 个图标 |
| `src/types/info-card.ts` | 修改 | 扩展 icon 类型联合 |
| `src/composables/useOutAssetDetailCards.ts` | **新建** | 数据驱动生成 4 个 InfoCardConfig |
| `src/components/componentsdetails/detils/OutAssetBasicDetails.vue` | 修改 | 使用 InfoCard + composable 重构模板 |

---

## 任务 1：扩展 InfoCard 图标支持

**文件：**
- 修改：`src/components/commoncomponents/InfoCard.vue`
- 修改：`src/types/info-card.ts`

**前置条件：** 无

- [ ] **步骤 1：验证图标存在**

  运行：`node -e "const {Tickets, Stamp, UserFilled, Avatar} = require('@element-plus/icons-vue'); console.log('Tickets:', !!Tickets, 'Stamp:', !!Stamp, 'UserFilled:', !!UserFilled, 'Avatar:', !!Avatar)"`
  预期：全部输出 `true`

- [ ] **步骤 2：修改 InfoCard.vue 图标导入**

  将：
  ```ts
  import { Document, User, Location, InfoFilled } from '@element-plus/icons-vue'
  ```
  改为：
  ```ts
  import {
    Document,
    User,
    Location,
    InfoFilled,
    Tickets,
    Stamp,
    UserFilled,
    Avatar,
  } from '@element-plus/icons-vue'
  ```

- [ ] **步骤 3：修改 InfoCard.vue iconMap**

  将：
  ```ts
  const iconMap = {
    Document,
    User,
    Location,
    InfoFilled,
  } as const
  ```
  改为：
  ```ts
  const iconMap = {
    Document,
    User,
    Location,
    InfoFilled,
    Tickets,
    Stamp,
    UserFilled,
    Avatar,
  } as const
  ```

- [ ] **步骤 4：修改 info-card.ts 类型**

  将：
  ```ts
  icon: 'Document' | 'User' | 'Location' | 'InfoFilled'
  ```
  改为：
  ```ts
  icon: 'Document' | 'User' | 'Location' | 'InfoFilled' | 'Tickets' | 'Stamp' | 'UserFilled' | 'Avatar'
  ```

- [ ] **步骤 5：验证 type-check**

  运行：`npm run type-check`
  预期：零错误

- [ ] **步骤 6：验证 lint**

  运行：`npm run lint`
  预期：零警告

- [ ] **步骤 7：Commit**

  ```bash
  git add src/components/commoncomponents/InfoCard.vue src/types/info-card.ts
  git commit -m "feat: 扩展 InfoCard 图标支持，新增 Tickets/Stamp/UserFilled/Avatar"
  ```

---

## 任务 2：新建 useOutAssetDetailCards composable

**文件：**
- 新建：`src/composables/useOutAssetDetailCards.ts`

**前置条件：** 任务 1 完成（info-card.ts 类型已扩展）

- [ ] **步骤 1：创建 composable 文件**

  新建 `src/composables/useOutAssetDetailCards.ts`，内容如下：

  ```ts
  import { computed, type ComputedRef, type Ref } from 'vue'
  import type { InfoCardConfig } from '@/types/info-card'
  import type { OutAssetDetail } from '@/utils/OutAsset'
  import type { EmployeeExtended } from '@/utils/User'
  import type { AssetDetail } from '@/utils/Asset'
  import { formatDate, outassetStatusMapping, outassetTypeMapping } from '@/utils/Format'

  export interface OutAssetDetailCardData {
    detail: OutAssetDetail | null
    applicantUser: EmployeeExtended | null
    managerUser: EmployeeExtended | null
    assetContract: AssetDetail | null
  }

  const getOutAssetStatusText = (value: string | null | undefined): string => {
    if (!value) return '未知'
    return outassetStatusMapping[value] || value
  }

  const getOutAssetTypeText = (value: string | null | undefined): string => {
    if (!value) return '未知'
    return outassetTypeMapping[value] || value
  }

  export function useOutAssetDetailCards(data: Ref<OutAssetDetailCardData>) {
    const basicInfoConfig = computed<InfoCardConfig>(() => {
      const d = data.value.detail
      return {
        title: '基本信息',
        icon: 'Document',
        fields: [
          [
            { label: 'ID', value: d?.id, defaultValue: 'N/A' },
            { label: '出库唯一标识码', value: d?.outasset_recordcode, defaultValue: 'N/A' },
            { label: '资产码', value: d?.outasset_code },
            { label: '出库时间', value: d?.outasset_date, formatter: (v) => formatDate(v as string) ?? '无' },
            { label: '资产状态', value: d?.outasset_current_status, formatter: (v) => getOutAssetStatusText(v as string) },
            { label: '使用地点', value: d?.outasset_using_location, defaultValue: '无' },
          ],
          [
            { label: '资产名称', value: d?.outasset_name },
            { label: '规格型号', value: d?.outasset_specification },
            { label: '归还日期', value: d?.return_date, formatter: (v) => formatDate(v as string) ?? '无' },
            { label: '出库类型', value: d?.outasset_type, formatter: (v) => getOutAssetTypeText(v as string) },
            { label: '备注描述', value: d?.outasset_description, defaultValue: '无' },
          ],
        ],
      }
    })

    const contractInfoConfig = computed<InfoCardConfig>(() => {
      const c = data.value.assetContract?.asset_contract
      return {
        title: '合同信息',
        icon: 'Tickets',
        fields: [
          [{ label: '所在合同号', value: c?.contract_code, defaultValue: 'N/A' }],
          [{ label: '所在合同名称', value: c?.contract_name, defaultValue: 'N/A' }],
        ],
      }
    })

    const applicantInfoConfig = computed<InfoCardConfig>(() => {
      const u = data.value.applicantUser
      const d = data.value.detail
      return {
        title: '申请人信息',
        icon: 'User',
        fields: [
          [{
            label: '申请人',
            value: u?.employee_name && u?.employee_department?.department_name
              ? `${u.employee_name} / ${u.employee_department.department_name}`
              : null,
            defaultValue: 'N/A',
          }],
          [{ label: '申请人工号', value: d?.outasset_applicant_jobcode, defaultValue: 'N/A' }],
        ],
      }
    })

    const managerInfoConfig = computed<InfoCardConfig>(() => {
      const u = data.value.managerUser
      const d = data.value.detail
      return {
        title: '保管人信息',
        icon: 'UserFilled',
        fields: [
          [{
            label: '保管人',
            value: u?.employee_name && u?.employee_department?.department_name
              ? `${u.employee_name} / ${u.employee_department.department_name}`
              : null,
            defaultValue: 'N/A',
          }],
          [{ label: '保管人工号', value: d?.outasset_manager_jobcode, defaultValue: 'N/A' }],
        ],
      }
    })

    return {
      basicInfoConfig,
      contractInfoConfig,
      applicantInfoConfig,
      managerInfoConfig,
    }
  }
  ```

- [ ] **步骤 2：验证 type-check**

  运行：`npm run type-check`
  预期：零错误

- [ ] **步骤 3：验证 lint**

  运行：`npm run lint`
  预期：零警告

- [ ] **步骤 4：Commit**

  ```bash
  git add src/composables/useOutAssetDetailCards.ts
  git commit -m "feat: 新建 useOutAssetDetailCards composable，生成 4 个 InfoCardConfig"
  ```

---

## 任务 3：重构 OutAssetBasicDetails.vue

**文件：**
- 修改：`src/components/componentsdetails/detils/OutAssetBasicDetails.vue`

**前置条件：** 任务 1 和任务 2 完成

- [ ] **步骤 1：修改模板部分**

  将 `<div class="child-page-content">` 内的内容替换为：

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

- [ ] **步骤 2：修改脚本导入**

  在现有导入后新增：
  ```ts
  import InfoCard from '@/components/commoncomponents/InfoCard.vue'
  import { useOutAssetDetailCards } from '@/composables/useOutAssetDetailCards'
  ```

- [ ] **步骤 3：新增 composable 调用**

  在 `const assetContract = ref<AssetDetail | null>(null)` 之后添加：

  ```ts
  const cardData = computed(() => ({
    detail: showOutAssetDetails.value,
    applicantUser: applicantUser.value,
    managerUser: managerUser.value,
    assetContract: assetContract.value,
  }))

  const {
    basicInfoConfig,
    contractInfoConfig,
    applicantInfoConfig,
    managerInfoConfig,
  } = useOutAssetDetailCards(cardData)
  ```

- [ ] **步骤 4：删除手写网格样式**

  从 `<style>` 中删除以下样式类：
  - `.main-info-card`
  - `.section-header`
  - `.section-title`
  - `.info-grid`
  - `.info-column`
  - `.info-item`
  - `.info-label`
  - `.info-value`

  保留：`.outasset-detail-page`、`.child-page-header`、`.page-title`、`.action-buttons`、`.child-page-content` 及响应式规则

- [ ] **步骤 5：验证 type-check**

  运行：`npm run type-check`
  预期：零错误

- [ ] **步骤 6：验证 lint**

  运行：`npm run lint`
  预期：零警告

- [ ] **步骤 7：Commit**

  ```bash
  git add src/components/componentsdetails/detils/OutAssetBasicDetails.vue
  git commit -m "refactor: OutAssetBasicDetails 使用 InfoCard 组件重构为 4 卡片布局"
  ```

---

## 任务 4：最终验证

**文件：** 全部 4 个文件

**前置条件：** 任务 1-3 全部完成

- [ ] **步骤 1：全量 type-check**

  运行：`npm run type-check`
  预期：零错误

- [ ] **步骤 2：全量 lint**

  运行：`npm run lint`
  预期：零警告

- [ ] **步骤 3：手动代码审查**

  检查清单：
  - [ ] 17 个字段在 4 个卡片中无遗漏
  - [ ] 空值处理与原页面一致（'N/A' / '无' / '未知'）
  - [ ] 导出功能未受影响（exportColumns 配置未改动）
  - [ ] 全项目使用 `@/` 别名导入，无相对路径
  - [ ] 响应式布局规则保留
  - [ ] 数据加载逻辑未改动

- [ ] **步骤 4：Commit（可选，如有审查修复）**

  ```bash
  git add .
  git commit -m "fix: 审查修复"
  ```

---

## 自检

**规格覆盖度：**
- ✅ 扩展 InfoCard 图标 → 任务 1
- ✅ 新建 composable → 任务 2
- ✅ 重构页面 → 任务 3
- ✅ 验证 → 任务 4

**占位符扫描：** 无 TODO/待定/后续实现

**类型一致性：**
- `InfoCardConfig` 在 info-card.ts、InfoCard.vue、useOutAssetDetailCards.ts 中一致
- `OutAssetDetailCardData` 字段名与 OutAssetBasicDetails.vue 中 ref 名一致
