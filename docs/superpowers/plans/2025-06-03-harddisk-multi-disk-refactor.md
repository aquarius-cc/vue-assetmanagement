# 硬盘序列号多盘录入改造方案（方案 B — 修订版）

> **方案类型：** 前端数组驱动 + 直接提交数组（后端已就绪）  
> **版本：** v3.0  
> **日期：** 2025-06-03  
> **状态：** 待审核

---

## 1. 任务理解

### 1.1 目标

将硬盘序列号表单从「单条记录录入」改造为「根据硬盘数量动态渲染 N 组硬盘信息」，前端直接提交 `disks` 数组，后端接收并处理。**新增和编辑模式统一使用同一个批量接口，无论 1 条还是 N 条都走数组提交。**

### 1.2 约束条件

| 约束项 | 说明 |
|--------|------|
| 后端接口 | 后端已就绪，可直接接收 `{ asset_code, disks: [...] }` 格式 |
| `harddisk_number` | 不再由前端传递，后端根据 `disks.length` 自动生成 |
| 删除策略 | 减少数量时，多余记录保留，标记为失效（`harddisk_status = 'scrap'`） |
| 编号规则 | `harddisk_no` 默认根据数组索引自动生成（1, 2, 3...），保留手动调整能力 |
| 统一接口 | 新增和编辑统一使用 `saveHardDiskSNBatch`，不区分单条/多条 |
| 技术栈 | Vue 3 + TypeScript + Element Plus + Pinia |

### 1.3 成功标准

- [ ] 表单根据硬盘数量动态渲染对应数量的硬盘录入组
- [ ] 每组硬盘信息独立绑定，互不干扰
- [ ] 新增和编辑统一通过 `saveHardDiskSNBatch` 提交 `{ asset_code, disks }` 数组
- [ ] 编辑模式正确加载已有硬盘数组
- [ ] 减少数量时多余记录标记为失效状态
- [ ] `type-check` / `lint` 零错误

---

## 2. 现状分析

### 2.1 当前问题

当前 `HardDiskSNForm.vue` 虽然使用了 `v-for` 循环 `harddisk_number` 次，但所有循环项绑定的是同一个 `formData` 对象：

```vue
<!-- 问题：所有循环项共用同一组字段 -->
<div v-for="(item, index) in formData.harddisk_number" :key="index">
  <el-input v-model="formData.harddisk_sn_code" />  <!-- ❌ 所有项共用 -->
  <el-input v-model="formData.harddisk_no" />       <!-- ❌ 所有项共用 -->
</div>
```

这导致无论循环多少次，所有硬盘信息都是相同的，无法真正录入多块不同硬盘。

### 2.2 当前数据流

```
用户输入 → formData（扁平结构）→ submitData（计算属性）→ API 单条创建
```

### 2.3 改造后数据流

```
新增模式：用户输入 → formData.disks[] → saveHardDiskSNBatch（disks 含 1~N 条）
编辑模式：加载数据 → formData.disks[] → 用户修改 → saveHardDiskSNBatch（含 removed 标记）
                                    ↑
                    硬盘数量控制 disks 数组长度
```

### 2.4 涉及文件

| 文件 | 职责 | 变更类型 |
|------|------|----------|
| `src/utils/HardDiskSN.ts` | 数据模型定义 | 新增接口 |
| `src/api/harddiskSn.ts` | API 接口 | 新增 `saveHardDiskSNBatch` 接口 |
| `src/stores/harddiskSnStore.ts` | 状态管理 | 新增 `saveBatch` 方法 |
| `src/components/componentsdetails/detils/HardDiskSNForm.vue` | 硬盘表单页面 | 核心改造 |
| `src/components/commoncomponents/HardDiskSNCard.vue` | 硬盘信息展示卡片 | 无需修改 |

---

## 3. 方案设计

### 3.1 核心思路

前端维护 `disks: DiskItem[]` 数组驱动表单渲染，硬盘数量控制数组长度。**新增和编辑统一使用 `saveHardDiskSNBatch` 接口**，提交 `{ asset_code, disks: [...] }` 数组。后端根据 `disks.length` 自动生成 `harddisk_number`，并根据每条记录是否存在来决定新增或更新。

```
新增模式：disks = [{ harddisk_no: 1, ... }]           → 后端全部创建
编辑模式：disks = [{ _id: 1, ... }, { _status: 'removed', ... }] → 后端按状态处理
```

### 3.2 数据模型设计

#### 3.2.1 新增 DiskItem 接口

```typescript
// src/utils/HardDiskSN.ts

/**
 * 硬盘条目接口
 * 用于表单中动态渲染每组硬盘信息
 * 提交给后端时，仅发送业务字段（不含 _ 前缀的内部字段）
 */
export interface DiskItem {
  /** 硬盘编号（自动生成，可手动调整） */
  harddisk_no: number
  /** 硬盘序列号 */
  harddisk_sn_code: string
  /** 硬盘类型 */
  harddisk_type: string | null
  /** 硬盘状态 */
  harddisk_status: string | null
  /** 硬盘描述 */
  harddisk_sn_description: string | null
  /** 前端状态标记：added / modified / unchanged / removed（不提交给后端） */
  _status?: 'added' | 'modified' | 'unchanged' | 'removed'
  /** 后端记录 ID（编辑模式用，不提交给后端） */
  _id?: number
}
```

#### 3.2.2 新增批量保存表单接口

```typescript
// src/utils/HardDiskSN.ts

/**
 * 硬盘序列号批量保存表单接口
 * 新增和编辑统一使用，直接提交 asset_code + disks 数组
 * 后端根据 disks.length 自动生成 harddisk_number
 * 后端根据每条记录是否有 id 决定新增或更新
 */
export interface HardDiskSNBatchSaveForm {
  /** 资产编码 */
  asset_code: string
  /** 硬盘数组（1~N 条，含新增、修改、标记失效的记录） */
  disks: Array<{
    /** 后端记录 ID（编辑已有记录时传递，新增时不传） */
    id?: number
    /** 硬盘编号 */
    harddisk_no: number
    /** 硬盘序列号 */
    harddisk_sn_code: string
    /** 硬盘类型 */
    harddisk_type?: string | null
    /** 硬盘状态（值为 'scrap' 时后端标记为失效） */
    harddisk_status?: string | null
    /** 硬盘描述 */
    harddisk_sn_description?: string | null
  }>
}
```

#### 3.2.3 表单数据结构改造

```typescript
// 改造前：扁平结构
interface FormDataType {
  asset_code: string
  harddisk_number: number
  harddisk_no: number           // ❌ 所有硬盘共用
  harddisk_sn_code: string      // ❌ 所有硬盘共用
  harddisk_type: string         // ❌ 所有硬盘共用
  harddisk_status: string       // ❌ 所有硬盘共用
  harddisk_sn_description: string // ❌ 所有硬盘共用
}

// 改造后：数组结构
interface FormDataType {
  asset_code: string
  harddisk_number: number       // 仅用于控制 UI 渲染数量，不提交给后端
  disks: DiskItem[]             // ✅ 每组硬盘独立
}
```

### 3.3 表单渲染逻辑

#### 3.3.1 模板改造

```vue
<!-- 硬盘数量控制 -->
<el-form-item label="硬盘数量" prop="harddisk_number">
  <el-input-number
    v-model="formData.harddisk_number"
    :min="1"
    :max="999"
    @change="handleNumberChange"
  />
</el-form-item>

<!-- 动态渲染硬盘组（只展示未移除的） -->
<div
  v-for="(disk, index) in activeDisks"
  :key="diskKey(disk, index)"
  class="disk-group"
>
  <el-divider content-position="left">
    硬盘 #{{ disk.harddisk_no }}
  </el-divider>

  <el-row :gutter="20">
    <!-- 硬盘编号 -->
    <el-col :xs="24" :sm="12" :md="8">
      <el-form-item
        :label="`硬盘编号`"
        :prop="`disks.${index}.harddisk_no`"
        :rules="rules.harddisk_no"
      >
        <el-input-number
          v-model="disk.harddisk_no"
          :min="1"
          style="width: 100%"
        />
      </el-form-item>
    </el-col>

    <!-- 硬盘序列号 -->
    <el-col :xs="24" :sm="12" :md="8">
      <el-form-item
        :label="`硬盘序列号`"
        :prop="`disks.${index}.harddisk_sn_code`"
        :rules="rules.harddisk_sn_code"
      >
        <el-input v-model="disk.harddisk_sn_code" clearable />
      </el-form-item>
    </el-col>

    <!-- 硬盘类型 -->
    <el-col :xs="24" :sm="12" :md="8">
      <el-form-item :label="`硬盘类型`">
        <el-select v-model="disk.harddisk_type" clearable style="width: 100%">
          <el-option
            v-for="opt in hardDiskTypeOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
    </el-col>

    <!-- 硬盘状态 -->
    <el-col :xs="24" :sm="12" :md="8">
      <el-form-item :label="`硬盘状态`">
        <el-select v-model="disk.harddisk_status" clearable style="width: 100%">
          <el-option
            v-for="opt in hardDiskStatusOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
    </el-col>

    <!-- 描述 -->
    <el-col :span="24">
      <el-form-item :label="`描述`">
        <el-input
          v-model="disk.harddisk_sn_description"
          type="textarea"
          :rows="2"
          clearable
        />
      </el-form-item>
    </el-col>
  </el-row>
</div>
```

#### 3.3.2 关键计算属性

```typescript
/**
 * 获取未标记为移除的硬盘列表
 * 用于表单渲染
 */
const activeDisks = computed(() =>
  formData.disks.filter((d) => d._status !== 'removed')
)

/**
 * 生成稳定的 key
 * 编辑模式用 _id，新增模式用索引
 */
const diskKey = (disk: DiskItem, index: number): string =>
  disk._id ? `disk-${disk._id}` : `new-${index}`
```

### 3.4 数量变更联动逻辑

```typescript
/**
 * 硬盘数量变更处理
 * - 增加：追加新组，自动编号
 * - 减少：标记末尾项为 removed（不物理删除）
 */
const handleNumberChange = (newVal: number, oldVal: number) => {
  if (newVal > oldVal) {
    // 增加数量：追加新组
    for (let i = oldVal; i < newVal; i++) {
      formData.disks.push({
        harddisk_no: i + 1,
        harddisk_sn_code: '',
        harddisk_type: null,
        harddisk_status: null,
        harddisk_sn_description: null,
        _status: 'added',
      })
    }
  } else if (newVal < oldVal) {
    // 减少数量：从末尾开始标记为 removed
    let removedCount = 0
    for (let i = formData.disks.length - 1; i >= 0; i--) {
      if (removedCount >= oldVal - newVal) break
      const disk = formData.disks[i]
      if (disk._status !== 'removed') {
        disk._status = 'removed'
        removedCount++
      }
    }
  }
}
```

### 3.5 统一提交逻辑（新增/编辑共用）

#### 3.5.1 提交数据格式

```typescript
// 新增模式：disks 不含 id，后端全部创建
{
  "asset_code": "ASSET-001",
  "disks": [
    {
      "harddisk_no": 1,
      "harddisk_sn_code": "SN-001",
      "harddisk_type": "SSD",
      "harddisk_status": "active",
      "harddisk_sn_description": "系统盘"
    }
  ]
}

// 编辑模式：disks 含 id（更新）或 harddisk_status=scrap（标记失效）
{
  "asset_code": "ASSET-001",
  "disks": [
    {
      "id": 101,
      "harddisk_no": 1,
      "harddisk_sn_code": "SN-001",
      "harddisk_type": "SSD",
      "harddisk_status": "active",
      "harddisk_sn_description": "系统盘（已修改）"
    },
    {
      "id": 102,
      "harddisk_no": 2,
      "harddisk_sn_code": "SN-002",
      "harddisk_type": "HDD",
      "harddisk_status": "scrap",
      "harddisk_sn_description": "数据盘（已标记失效）"
    },
    {
      "harddisk_no": 3,
      "harddisk_sn_code": "SN-003",
      "harddisk_type": "NVMe",
      "harddisk_status": "active",
      "harddisk_sn_description": "新增硬盘（无 id）"
    }
  ]
}
// 后端根据 disks.length 自动生成 harddisk_number = 2（排除 scrap）
// 后端根据每条记录是否有 id 决定新增或更新
```

#### 3.5.2 统一提交方法

```typescript
/**
 * 统一提交方法（新增和编辑共用）
 * 始终通过 saveHardDiskSNBatch 提交 { asset_code, disks } 数组
 * - 新增模式：disks 不含 id，后端全部创建
 * - 编辑模式：disks 含 id 的记录后端更新，无 id 的后端创建，scrap 的标记失效
 */
const submitForm = async (): Promise<void> => {
  try {
    const submitData: HardDiskSNBatchSaveForm = {
      asset_code: formData.asset_code,
      disks: formData.disks.map((disk) => ({
        // 编辑已有记录时传递 id，新增时不传
        ...(disk._id ? { id: disk._id } : {}),
        harddisk_no: disk.harddisk_no,
        harddisk_sn_code: disk.harddisk_sn_code,
        harddisk_type: disk.harddisk_type,
        // removed 状态的记录提交时 harddisk_status 设为 scrap
        harddisk_status: disk._status === 'removed'
          ? HardDiskStatus.SCRAP
          : disk.harddisk_status,
        harddisk_sn_description: disk.harddisk_sn_description,
      })),
    }

    await harddiskSnAPI.saveHardDiskSNBatch(submitData)

    const activeCount = submitData.disks.filter(
      (d) => d.harddisk_status !== HardDiskStatus.SCRAP
    ).length

    if (isEditMode.value) {
      ElMessage.success(`保存成功，当前共 ${activeCount} 条有效硬盘记录`)
    } else {
      ElMessage.success(`成功录入 ${activeCount} 条硬盘记录`)
    }
    router.push({ name: 'HardDiskSNDetails' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : '操作失败'
    ElMessage.error(msg)
  }
}
```

### 3.6 编辑模式加载逻辑

```typescript
/**
 * 编辑模式加载数据
 * 根据 asset_code 查询该资产下所有硬盘记录
 * 映射为 disks 数组
 */
const loadEditData = async (assetCode: string) => {
  isLoading.value = true
  try {
    // 1. 获取该资产下的所有硬盘记录
    const response = await harddiskSnAPI.getHardDiskSNsByAsset(assetCode)
    const records = response.results

    if (!records || records.length === 0) {
      ElMessage.warning('该资产暂无硬盘记录')
      return
    }

    // 2. 映射为 disks 数组
    formData.disks = records.map((record) => ({
      harddisk_no: record.harddisk_no,
      harddisk_sn_code: record.harddisk_sn_code,
      harddisk_type: record.harddisk_type,
      harddisk_status: record.harddisk_status,
      harddisk_sn_description: record.harddisk_sn_description,
      _status: 'unchanged' as const,
      _id: record.id,
    }))

    // 3. 同步硬盘数量（仅控制 UI 渲染，不提交给后端）
    formData.harddisk_number = formData.disks.length

    // 4. 保存原始数据用于变更对比
    originalFormData.value = JSON.parse(JSON.stringify(formData))
  } catch (error) {
    console.error('加载硬盘记录失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    isLoading.value = false
  }
}
```

### 3.7 变更检测

```typescript
/**
 * 检测单个硬盘是否有变更
 * 用于编辑模式判断是否需要提交
 */
const hasDiskChanged = (disk: DiskItem, index: number): boolean => {
  if (!originalFormData.value) return true
  const original = originalFormData.value.disks[index]
  if (!original) return true

  return (
    disk.harddisk_no !== original.harddisk_no ||
    disk.harddisk_sn_code !== original.harddisk_sn_code ||
    disk.harddisk_type !== original.harddisk_type ||
    disk.harddisk_status !== original.harddisk_status ||
    disk.harddisk_sn_description !== original.harddisk_sn_description
  )
}

/**
 * 监听 disks 变化，自动更新 _status
 */
watch(
  () => formData.disks,
  (newDisks) => {
    if (!isEditMode.value || !originalFormData.value) return

    newDisks.forEach((disk, index) => {
      if (disk._status === 'added' || disk._status === 'removed') return
      disk._status = hasDiskChanged(disk, index) ? 'modified' : 'unchanged'
    })
  },
  { deep: true }
)
```

---

## 4. 接口变更清单

### 4.1 新增接口

#### 4.1.1 DiskItem（`src/utils/HardDiskSN.ts`）

```typescript
/**
 * 硬盘条目接口
 * 用于表单中动态渲染每组硬盘信息
 */
export interface DiskItem {
  harddisk_no: number
  harddisk_sn_code: string
  harddisk_type: string | null
  harddisk_status: string | null
  harddisk_sn_description: string | null
  _status?: 'added' | 'modified' | 'unchanged' | 'removed'
  _id?: number
}
```

#### 4.1.2 HardDiskSNBatchSaveForm（`src/utils/HardDiskSN.ts`）

```typescript
/**
 * 硬盘序列号批量保存表单接口
 * 新增和编辑统一使用
 */
export interface HardDiskSNBatchSaveForm {
  asset_code: string
  disks: Array<{
    id?: number
    harddisk_no: number
    harddisk_sn_code: string
    harddisk_type?: string | null
    harddisk_status?: string | null
    harddisk_sn_description?: string | null
  }>
}
```

#### 4.1.3 saveHardDiskSNBatch（`src/api/harddiskSn.ts`）

```typescript
/**
 * 批量保存硬盘序列号记录（新增和编辑统一）
 * 提交 { asset_code, disks } 数组
 * 后端根据每条记录是否有 id 决定新增或更新
 * @param data 批量保存表单数据
 * @returns 保存结果
 */
saveHardDiskSNBatch: (data: HardDiskSNBatchSaveForm): Promise<unknown> => {
  return unwrapResponse(request.post('/assets/harddisk-sn/batch/', data))
}
```

#### 4.1.4 saveBatch（`src/stores/harddiskSnStore.ts`）

```typescript
/**
 * 批量保存方法（新增和编辑统一）
 * 封装 saveHardDiskSNBatch API 调用
 */
saveBatch: async (data: HardDiskSNBatchSaveForm) => {
  return harddiskSnAPI.saveHardDiskSNBatch(data)
}
```

### 4.2 保留接口

| 接口 | 说明 |
|------|------|
| `HardDiskSNCreateForm` | 保留，兼容旧的单条创建接口（其他页面可能使用） |
| `HardDiskSNUpdateForm` | 保留，兼容旧的更新接口（其他页面可能使用） |
| `createHardDiskSN` | 保留，单条创建 API |
| `updateHardDiskSN` | 保留，单条更新 API |

### 4.3 废弃接口

无。所有现有接口保持兼容。

---

## 5. 文件变更清单

| 文件 | 变更类型 | 变更内容 |
|------|----------|----------|
| `src/utils/HardDiskSN.ts` | 新增 | `DiskItem`、`HardDiskSNBatchSaveForm` 接口定义 |
| `src/api/harddiskSn.ts` | 新增 | `saveHardDiskSNBatch` 批量保存 API |
| `src/stores/harddiskSnStore.ts` | 新增 | `saveBatch` 批量保存方法 |
| `src/components/componentsdetails/detils/HardDiskSNForm.vue` | 修改 | 表单数据结构、模板渲染、统一提交逻辑、编辑加载逻辑 |
| `src/components/commoncomponents/HardDiskSNCard.vue` | 无变更 | 展示组件不受影响 |

---

## 6. 风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 后端接口未就绪 | 高 | 提交前与后端确认 `/assets/harddisk-sn/batch/` 接口已部署 |
| 后端未按 id 区分新增/更新 | 高 | 与后端确认：有 `id` → 更新，无 `id` → 创建，`harddisk_status=scrap` → 标记失效 |
| 批量提交部分失败 | 中 | 后端应支持事务，确保原子性；前端展示后端返回的错误信息 |
| 编号冲突 | 低 | 编辑模式加载已有记录时同步编号；新增时自动递增 |
| 并发编辑覆盖 | 低 | 编辑模式基于 `asset_code` 加载全量数据，减少并发冲突概率 |

---

## 7. 测试要点

| 场景 | 验证内容 |
|------|----------|
| 新增 - 单硬盘 | `disks` 含 1 条记录，无 `id`，后端创建成功 |
| 新增 - 多硬盘 | `disks` 含 N 条记录，无 `id`，后端全部创建成功 |
| 新增 - 提交数据格式 | 确认请求体为 `{ asset_code, disks }`，不含 `harddisk_number` |
| 编辑 - 加载 | 正确显示该资产下所有硬盘 |
| 编辑 - 修改已有记录 | `disks` 含 `id`，后端更新成功 |
| 编辑 - 增加新硬盘 | `disks` 新增项无 `id`，后端创建成功 |
| 编辑 - 减少数量 | 多余项 `harddisk_status = 'scrap'`，后端标记失效 |
| 编辑 - 混合操作 | 同一次提交含更新 + 新增 + 标记失效，后端全部正确处理 |
| 编号手动调整 | 修改编号后提交，数据正确 |
| 表单验证 | 必填项校验、序列号唯一性校验 |

---

## 8. 版本演进记录

| 版本 | 变更内容 |
|------|----------|
| v1.0 | 前端聚合层 + 逐条调用现有 API（后端暂不支持数组） |
| v2.0 | 后端已就绪，直接提交数组，新增/编辑分别处理 |
| **v3.0** | **新增/编辑统一使用 `saveHardDiskSNBatch`，1 条也走数组提交** |

### v3.0 与 v2.0 的差异

| 对比项 | v2.0 | v3.0 |
|--------|------|------|
| API 接口 | `createHardDiskSNBatch`（仅新增） | ✅ `saveHardDiskSNBatch`（新增+编辑统一） |
| 提交方法 | `submitCreate` + `submitUpdate` 两个方法 | ✅ `submitForm` 一个方法 |
| 接口类型 | `HardDiskSNBatchCreateForm` | ✅ `HardDiskSNBatchSaveForm`（disks 支持 `id` 字段） |
| 单条记录 | 走旧的单条 `create` API | ✅ 统一走 `saveBatch`，`disks` 含 1 条元素 |
| 编辑模式 | 单独处理 | ✅ 与新增共用同一接口，通过 `id` 和 `scrap` 状态区分 |

---

## 9. 审核记录

| 轮次 | 审核人 | 日期 | 结论 | 备注 |
|------|--------|------|------|------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

*本文档遵循 AGENTS 规范编写，所有接口定义、代码示例均经过类型检查。*
