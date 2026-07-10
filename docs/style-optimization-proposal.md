# 页面展示格式与样式优化建议方案

> 基于对项目全部 40+ 个组件的逐一审查，按照 `FRONTEND.md` 规范和 `AGENTS.md` 红线要求整理。
>
> **状态：** 仅建议方案，暂不进行代码调整。
>
> 日期：2026-06-01

---

## 一、全局样式基础设施问题

### 1.1 `outline: none` 全局移除（严重 · 可访问性）

**文件：** `src/assets/styles/global-reset.scss`

**现状：** 通配选择器 `*` 全局移除了 `outline`，键盘用户无法看到焦点位置。

**建议：** 移除全局 `outline: none`，改用 `:focus-visible` 为自定义焦点样式的元素单独处理：

```scss
// 移除
* { outline: none; }

// 替换为
:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}
```

**影响范围：** 全局，WCAG 可访问性合规。

---

### 1.2 `normalize.css` 重复导入

**文件：** `src/main.ts`（第 18 行）+ `src/views/MainView.vue`（第 33 行）

**现状：** 两处均导入了 `normalize.css/normalize.css`，样式被处理两次。

**建议：** 删除 `MainView.vue` 中的重复导入，仅在 `main.ts` 中全局导入一次。

---

### 1.3 滚动条宽度偏大

**文件：** `src/assets/styles/global-scroll.scss`

**现状：** 滚动条宽度设为 `15px`，视觉上偏笨重，占用内容区域空间。

**建议：** 将宽度从 `15px` 调整为 `8px`，与现代 UI 设计趋势一致。

---

### 1.4 `common-forms.scss` 中 `responsive-design` 与 `responsive-layout` 功能重复

**文件：** `src/assets/styles/common-forms.scss`（第 548-646 行）

**现状：** 两个 mixin 处理了相同的移动端适配选择器，维护时容易遗漏同步。

**建议：** 合并为单一 mixin，删除冗余的那个。所有引用处统一调用合并后的 mixin。

---

### 1.5 大量 `!important` 覆盖 Element Plus 样式

**文件：** `src/assets/styles/common-forms.scss` 的 `table-container` mixin

**现状：** 多处使用 `!important` 强制覆盖 Element Plus 内部样式，Element Plus 版本升级后容易失效。

**建议：** 优先使用 `:deep()` 穿透 + 更高选择器优先级替代 `!important`。仅在无法避免时保留。

---

## 二、布局与容器问题

### 2.1 `98vw` 含滚动条宽度导致水平溢出

**文件：** `src/views/MainView.vue`

**现状：** `.common-layout` 使用 `width: 98vw`，`vw` 单位包含滚动条宽度，当页面出现垂直滚动条时可能产生水平溢出。

**建议：** 改为 `width: calc(100vw - 16px)` 或 `width: 98%`。

---

### 2.2 `min-height: 100vh` 移动端地址栏问题

**涉及文件：** `LogIn.vue`、`common-forms.scss` 中多个 mixin（`form-container`、`detail-container`、`list-container`）

**现状：** 移动端浏览器地址栏收缩/展开时，`100vh` 不会动态调整，导致布局跳动或内容被截断。

**建议：** 使用 CSS 自定义属性方案替代：

```scss
min-height: 100dvh; // dynamic viewport height
// 或回退方案
min-height: 100vh;
@supports (min-height: 100dvh) {
  min-height: 100dvh;
}
```

---

### 2.3 `fade` 过渡动画未定义 CSS

**文件：** `src/views/MainView.vue`

**现状：** 模板中使用 `<transition name="fade">`，但 scoped 样式中未定义 `.fade-enter-active`、`.fade-leave-active` 等过渡类，路由切换动画实际不生效。

**建议：** 补充过渡动画 CSS，或移除无效果的 `<transition>` 标签。

---

### 2.4 `height: 100%` 依赖链断裂风险

**涉及文件：** `SmartListContainer.vue`、`AssetDetails.vue`、`DepartmentForm.vue` 等

**现状：** 多个组件使用 `height: 100%`，但如果祖先链中任何一级缺少明确高度设定，容器高度将失效（塌缩为 0 或 auto）。

**建议：** 审查从 `el-main` 到各子组件的高度传递链，确保每一级都有明确的高度定义。或改用 `flex: 1` + `overflow: auto` 替代。

---

### 2.5 无效样式属性

**文件：** `src/views/MainView.vue`

**现状：** `.common-layout` 上设置了 `vertical-align: middle` 和 `text-align: center`，对 `display: block` 的 `div` 元素无实际效果。

**建议：** 删除这两个无效属性。

---

## 三、样式预处理器与规范不统一

### 3.1 Less 与 SCSS 混用

**涉及文件：**

| 文件 | 当前预处理器 | 应统一为 |
|------|-------------|---------|
| `HeadersMenue.vue` | Less | SCSS |
| `RecycleAssetBasicDetails.vue` | Less | SCSS |

**建议：** 将以上两个文件从 Less 改为 SCSS，与项目其他组件保持一致。同时确认构建配置中 Less loader 是否可以移除。

---

### 3.2 公共样式引用不统一

**现状：** 部分组件未引用 `common-forms.scss`，样式完全手写，导致视觉风格不一致。

| 组件 | 是否引用公共样式 | 建议 |
|------|----------------|------|
| `CommonList.vue` | ❌ 未引用 | 引入并使用公共 mixin |
| `AssetForm.vue` | ❌ 未引用 | 引入并使用公共 mixin |
| `DepartmentForm.vue` | ❌ 未引用 | 引入并使用公共 mixin |
| `RecycleAssetForm.vue` | ❌ 未引用 | 引入并使用公共 mixin |
| `StorageForm.vue` | ❌ 未引用 | 引入并使用公共 mixin |
| `RecycleAssetBasicDetails.vue` | ❌ 未引用 | 引入并使用公共 mixin |

**建议：** 所有组件统一引用 `common-forms.scss`，使用公共 mixin 保持视觉一致性。

---

### 3.3 `@include` 与 `@extend` 混用

**现状：** 表单组件中，有的使用 `@include form-container`，有的使用 `@extend .form-container !optional`，行为差异可能导致样式优先级问题。

| 组件 | 使用方式 |
|------|---------|
| `DamagedAssetForm.vue` | `@include form-container` |
| `OutAssetForm.vue` | `@extend .form-container !optional` |
| `UserForm.vue` | `@extend .form-container !optional` |
| `ContractForm.vue` | `@extend .form-container !optional` |
| `WasteAssetForm.vue` | `@include form-container` |

**建议：** 统一使用 `@include form-container`，避免 `@extend` 在 scoped 样式中的不确定行为。

---

### 3.4 `section-title` 样式各组件不统一

**现状：** 各表单组件的分区标题样式差异较大：

| 组件 | 样式特征 |
|------|---------|
| `AssetForm.vue` | 左侧蓝色边框 + 渐变背景（自定义） |
| `RecycleAssetForm.vue` | 左侧蓝色边框 + 渐变背景（自定义，颜色不同） |
| `DepartmentForm.vue` | 底部蓝色边框 |
| `StorageForm.vue` | 底部蓝色边框 |
| 其他表单 | 依赖公共样式或无定义 |

**建议：** 在 `common-forms.scss` 中统一定义 `section-title` mixin，所有表单组件统一调用。

---

## 四、列表页问题

### 4.1 `:deep()` 强制居中覆盖列配置对齐方式

**涉及文件：** `DamagedAssetDetails.vue`、`HardDiskSNDetails.vue`、`OperationLogDetails.vue`、`OutAssetDetails.vue`、`UnregisteredAssetDetails.vue`、`WasteAssetDetails.vue`

**现状：** 这些组件在 scoped 样式中使用 `:deep()` 设置 `text-align: center !important`，覆盖了列配置中的 `align: 'left'` 设置，导致所有列都居中显示。

**建议：** 移除 `:deep()` 中的全局 `text-align: center`，改为在需要居中的列上单独设置 `align: 'center'`。

---

### 4.2 `StorageDetails.vue` 架构落后

**文件：** `src/components/componentsdetails/StorageDetails.vue`

**现状：** 唯一未使用 `SmartListContainer + CommonList` 架构的列表页，直接使用 `el-table`，无分页功能，使用前端本地搜索。

**建议：** 重构为 `SmartListContainer + CommonList` 架构，与其他列表页保持一致。增加后端分页支持。

---

### 4.3 子路由判断逻辑不一致

**现状：** `AssetContentDetails.vue` 使用 `matched.length > 3` 硬编码层级判断子路由激活，其他 13 个列表页组件使用 `!isSelfTop` 模式。

**建议：** 统一为 `!isSelfTop` 模式，避免路由结构变化时硬编码失效。

---

### 4.4 遮罩返回行为不一致

**现状：**

| 组件 | 返回方式 | 是否有提示消息 |
|------|---------|--------------|
| 大部分组件 | `router.go(-1)` | 无 |
| `DepartmentDetails.vue` | `router.push({ name: 'DepartmentDetails' })` | 无 |
| `ContractDetails.vue` | `router.go(-1)` | 有 `ElMessage.info` |
| `StorageDetails.vue` | `router.go(-1)` | 有 `ElMessage.info` |
| `UserDetails.vue` | `router.go(-1)` | 有 `ElMessage.info` |

**建议：** 统一返回方式为 `router.go(-1)`，统一不显示提示消息（或统一显示）。

---

### 4.5 底部按钮类型和顺序不统一

**现状：** 不同列表页的底部按钮 `type`（primary/success）和排列顺序不一致。

**建议：** 制定统一的按钮规范：
- 「新增」按钮：`type="primary"`（蓝色，主操作）
- 「批量导入」按钮：`type="default"` 或 `type="info"`
- 「导出 Excel」按钮：`type="success"`（绿色）
- 顺序固定为：新增 → 批量导入 → 导出

---

### 4.6 导出逻辑三种实现方式

**现状：**

| 方式 | 使用组件 |
|------|---------|
| `useExcelExport` composable | `AssetContentDetails.vue` |
| `h()` 渲染函数 + 手动弹窗 | `ContractDetails.vue`、`UserDetails.vue` |
| 直接调用 `exportToExcel` | 其他大部分组件 |

**建议：** 统一使用 `useExcelExport` composable，删除各组件中的重复导出逻辑。

---

## 五、表单页问题

### 5.1 双列布局缺少响应式适配

**涉及文件：** `AssetForm.vue`、`UserForm.vue`、`ContractForm.vue`、`DepartmentForm.vue`、`WasteAssetForm.vue`、`HardDiskSNForm.vue`、`UnregisteredAssetForm.vue`

**现状：** 所有表单使用 `el-col :span="12"` 双列布局，但均无 `xs` 或 `sm` 响应式断点，移动端两个字段挤压在一起。

**建议：** 改为 `:xs="24" :sm="24" :md="12"`，移动端自动切换为单列。

---

### 5.2 表单模式判断路由参数不统一

**现状：**

| 组件 | 路由参数 |
|------|---------|
| 大部分表单 | `route.query.code` |
| `HardDiskSNForm.vue` | `route.query.id` |
| `RecycleAssetForm.vue` | `route.query.recordcode` |

**建议：** 统一使用 `route.query.code` 作为编辑模式的判断参数。

---

### 5.3 提交按钮文字不统一

**现状：** 部分表单根据模式显示「提交」/「保存修改」，部分固定显示「提交」。

**建议：** 所有表单统一：新增模式显示「提交」，编辑模式显示「保存修改」。

---

### 5.4 `UserForm.vue` 表单验证规则字段名不匹配

**文件：** `src/components/componentsdetails/detils/UserForm.vue`

**现状：** `formRules` 中使用 `user_name`、`user_jobcode`、`user_phone` 等键名，但 `userForm` 的实际字段名是 `employee_name`、`employee_jobcode`、`employee_phone`。**表单验证规则完全不会生效。**

**建议：** 修正 `formRules` 的键名，与 `userForm` 字段名保持一致。

---

### 5.5 编辑模式重置按钮显示不一致

**现状：** `RecycleAssetForm.vue` 在编辑模式下仍显示重置按钮，其他表单（`DamagedAssetForm`、`OutAssetForm` 等）在编辑模式下隐藏重置按钮。

**建议：** 统一为编辑模式下隐藏重置按钮：`v-if="!isEditMode"`。

---

### 5.6 `RecycleAssetForm.vue` 缺少 `v-loading`

**现状：** 其他表单组件都有 `v-loading` 加载状态，此组件没有，编辑模式加载数据时用户无反馈。

**建议：** 添加 `v-loading` 指令。

---

## 六、详情页问题

### 6.1 详情页样式代码高度重复

**涉及文件：** `DamagedAssetBasicDetails.vue`、`OutAssetBasicDetails.vue`、`HardDiskSNBasicDetails.vue`、`UnregisteredAssetBasicDetails.vue`、`WasteAssetBasicDetails.vue`

**现状：** 这些详情页的样式代码几乎完全相同（约 80 行），包括 `detail-container`、`info-card`、`info-grid`、响应式断点等。

**建议：** 样式已通过公共 mixin 解决大部分，但各组件仍有重复的 scoped 样式。考虑创建一个 `BaseDetailPage` 组件封装公共结构，各详情页仅传入差异化的字段配置。

---

### 6.2 `detail-container` mixin 的 `.header-section` 与实际模板不匹配

**涉及文件：** `ContractOfDetails.vue`、`OperationLogDetail.vue`、`WasteAssetBasicDetails.vue`

**现状：** `common-forms.scss` 中 `detail-container` mixin 定义的头部类名为 `.header-section`，但上述组件使用 `.child-page-header`，导致 mixin 中的头部样式未生效。

**建议：** 统一头部的类名。要么修改 mixin 适配 `.child-page-header`，要么修改组件模板使用 `.header-section`。

---

### 6.3 `min-height: 100vh` 在嵌套路由中导致双重滚动条

**涉及文件：** `BasicAssetDetails.vue`、`ContractOfDetails.vue`、`OperationLogDetail.vue`、`WasteAssetBasicDetails.vue`、`DamagedAssetBasicDetails.vue` 等

**现状：** 这些详情页被包裹在 `AssetDetails.vue`（有 `height: 100%` + `overflow-y: auto`）中，同时自身又设置 `min-height: 100vh`，可能导致双重滚动条。

**建议：** 嵌套路由内的详情页移除 `min-height: 100vh`，改用 `min-height: 100%` 或依赖父容器的高度。

---

### 6.4 `RecycleAssetBasicDetails.vue` 需重点重构

**文件：** `src/components/componentsdetails/detils/RecycleAssetBasicDetails.vue`

**问题清单：**

| 问题 | 说明 |
|------|------|
| 使用 Less 而非 SCSS | 与项目规范不统一 |
| 未使用公共 mixin | 视觉风格与其他详情页不一致 |
| 图标使用旧版写法 | `<i class="el-icon-document">` 应改为 `<el-icon><Document /></el-icon>` |
| 导出功能未实现 | `handleExport` 仅弹出提示 |
| import 路径带 `.ts` 后缀 | 与其他组件风格不一致 |
| 无响应式断点 | 移动端适配缺失 |
| 标题分隔符不统一 | 使用 `---`，其他详情页使用 `--` |

**建议：** 按其他详情页（如 `DamagedAssetBasicDetails.vue`）的标准结构重构此组件。

---

### 6.5 `WasteAssetForm.vue` 与 `WasteAssetBasicDetails.vue` 功能重复

**现状：** 两个组件展示相同数据（已报废资产详情），一个用表单风格，一个用卡片风格。

**建议：** 确认是否两个都必要。如果卡片风格为标准展示方式，考虑移除表单风格的 `WasteAssetForm.vue`，统一使用 `WasteAssetBasicDetails.vue`。

---

## 七、登录页问题

### 7.1 固定宽度缺乏响应式

**文件：** `src/views/LogIn.vue`

**现状：** 登录卡片固定 `480px` 宽度，小屏设备上可能溢出。

**建议：** 改为 `width: min(480px, 90vw)` 或添加媒体查询。

---

### 7.2 注释残留代码

**涉及文件：** `LogIn.vue`（Mock 模式复选框、大量注释脚本）、`MainView.vue`（HeadersMenue 注释）、`App.vue`（旧代码注释）、`DashboardPage.vue`（console.log）

**建议：** 清理所有注释掉的废弃代码和 `console.log` 调试语句。

---

### 7.3 `HeadersMenue.vue` 死代码

**文件：** `src/components/HeadersMenue.vue`

**现状：** 组件在 `MainView.vue` 中被完全注释掉，属于未使用的死代码。且存在拼写错误（`heaeder-container`）、使用 `alert()` 提示、`@click.enter` 无效修饰符等问题。

**建议：** 如果确定不使用，删除此组件。如果计划启用，先修复上述问题。

---

### 7.4 `loginDialog.vue` 问题

**文件：** `src/components/loginDialog.vue`

**问题清单：**

| 问题 | 说明 |
|------|------|
| 登录逻辑不完整 | 仅关闭弹窗跳转到登录页，用户输入的信息未传递 |
| 组件命名不规范 | 应为 `LoginDialog.vue`（PascalCase） |
| 无表单验证 | 用户可提交空用户名和密码 |

**建议：** 如果此组件为过渡方案，考虑移除。如果需要保留，修复上述问题。

---

## 八、DashboardPage 问题

### 8.1 `height: calc(50% - 8px)` 依赖父容器固定高度

**文件：** `src/components/DashboardPage.vue`

**现状：** `.top-row` 和 `.bottom-row` 使用 `height: calc(50% - 8px)`，但父容器 `.dashboard-page-content` 的高度由内容撑开而非固定值，导致计算无效。

**建议：** 父容器设置明确高度（如 `height: 100%` + flex 纵向布局），或改用 `flex: 1` 替代百分比高度。

---

### 8.2 报废概览条形图未绑定数据比例

**现状：** `.waste-bar` 使用 `flex: 1` 等宽显示，无法直观反映待报废/已报废的数量差异。

**建议：** 将 `flex` 值绑定为实际数据比例，或使用 `v-chart` 图表组件替代。

---

### 8.3 退出按钮样式选择器不匹配

**现状：** `logout-btn` 样式定义在 `.user-profile` 内部，但模板中按钮位于 `.card-header` 内，选择器不匹配导致退出按钮可能没有预期样式。

**建议：** 将 `.logout-btn` 样式移到正确的嵌套层级，或改为顶层选择器。

---

## 九、DepartmentManagement 特殊布局

### 9.1 缺少响应式处理

**文件：** `src/components/componentsdetails/DepartmentManagement.vue`

**现状：** 左侧固定 `300px`，右侧 `flex: 1`，无 `@include responsive-design`，小屏幕上左侧面板可能导致右侧内容区不可用。

**建议：** 添加响应式断点，小屏幕时改为上下布局（树在上、内容在下）。

---

### 9.2 `DepartmentInfoCard.vue` 父部门显示编码而非名称

**文件：** `src/components/componentsdetails/components/DepartmentInfoCard.vue`

**现状：** 标签为「父部门名称」，但显示的是 `department.parent_code`（编码）。

**建议：** 通过 store 查询编码对应的部门名称并显示。

---

### 9.3 `DepartmentEmployeeList.vue` 删除无确认

**现状：** 删除人员直接调用 `userStore.remove`，没有 `ElMessageBox.confirm` 确认步骤。

**建议：** 添加删除确认弹窗。

---

## 十、`smartListRef` 类型不统一

**涉及文件：** `OperationLogDetails.vue`、`UnregisteredAssetDetails.vue`、`WasteAssetDetails.vue`

**现状：** 使用 `ComponentPublicInstance | null` 类型，调用 `refresh` 时需要类型断言 `(smartListRef.value as unknown as { refresh: () => void })?.refresh?.()`，类型安全性差。

**建议：** 统一使用 `SmartListContainerExpose | null` 类型（需确认该类型已导出），或定义统一的 expose 接口类型。

---

## 优化优先级建议

| 优先级 | 分类 | 问题数 | 说明 |
|--------|------|--------|------|
| **P0（必须修复）** | 可访问性 | 1 | `outline: none` 全局移除 |
| **P0（必须修复）** | 功能缺陷 | 1 | `UserForm.vue` 验证规则字段名不匹配 |
| **P1（高优先级）** | 视觉一致性 | 6 | Less/SCSS 混用、公共样式引用不统一、按钮类型/顺序不统一 |
| **P1（高优先级）** | 布局缺陷 | 3 | `98vw` 溢出、`100vh` 移动端问题、双重滚动条 |
| **P1（高优先级）** | 架构统一 | 3 | `StorageDetails` 架构落后、导出逻辑不统一、子路由判断不统一 |
| **P2（中优先级）** | 代码质量 | 4 | 注释残留、死代码、console.log、`!important` 滥用 |
| **P2（中优先级）** | 交互一致性 | 3 | 遮罩返回行为、表单模式参数、重置按钮显示 |
| **P3（低优先级）** | 体验优化 | 5 | 响应式适配、滚动条宽度、详情页样式重复、Dashboard 布局 |

---

## 总结

本次审查覆盖了项目全部 40+ 个组件，发现 **7 类全局基础设施问题、6 类列表页问题、6 类表单页问题、5 类详情页问题、4 类登录页问题、3 类 Dashboard 问题、3 类部门管理问题、1 类类型安全问题**，共计约 **35 个具体优化点**。

核心改进方向：
1. **统一性**：样式预处理器、公共 mixin 引用、按钮规范、返回行为、导出逻辑
2. **可访问性**：恢复焦点轮廓
3. **响应式**：表单双列布局、DepartmentManagement 左右分栏
4. **代码清理**：死代码、注释残留、重复样式
5. **架构统一**：StorageDetails 重构、详情页样式复用
