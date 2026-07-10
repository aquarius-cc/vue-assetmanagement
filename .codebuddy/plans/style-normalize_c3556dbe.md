---
name: style-normalize
overview: 按照 AGENTS.md / FRONTEND.md 规范，将 loginDialog.vue、DashboardPage.vue、AssetDetails.vue、AsideMenue.vue 四个文件的样式统一调整为符合规范的 SCSS，消除 !important，使用公共 SCSS 变量，并将 loginDialog.vue 的原生 input 替换为 el-input，同时优化视觉样式。
design:
  architecture:
    framework: vue
  styleKeywords:
    - 企业管理平台
    - 现代简约
    - 信息层级清晰
    - 卡片化设计
    - 统一圆角阴影
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 18px
      weight: 600
    subheading:
      size: 14px
      weight: 500
    body:
      size: 14px
      weight: 400
  colorSystem:
    primary:
      - "#409eff"
      - "#667eea"
    background:
      - "#f5f7fa"
      - "#ffffff"
    text:
      - "#303133"
      - "#606266"
    functional:
      - "#67c23a"
      - "#e6a23c"
      - "#f56c6c"
todos:
  - id: fix-login-dialog
    content: 调整 loginDialog.vue：less→scss、原生input改el-input、props类型化、消除硬编码颜色
    status: completed
  - id: fix-dashboard-page
    content: 调整 DashboardPage.vue：less→scss、修复:deep()泄漏、使用SCSS变量、内联样式移入CSS
    status: completed
  - id: fix-asset-details
    content: 调整 AssetDetails.vue：less→scss、优化容器样式、统一背景色
    status: completed
  - id: fix-aside-menue
    content: 调整 AsideMenue.vue：消除!important、硬编码颜色改SCSS变量、优化菜单视觉、修复语法错误
    status: completed
  - id: verify-all
    content: 运行 npm run type-check、lint、test 验证所有修改符合规范
    status: completed
    dependencies:
      - fix-login-dialog
      - fix-dashboard-page
      - fix-asset-details
      - fix-aside-menue
---

## 用户需求

按照 AGENTS.md 和 FRONTEND.md 规范，对以下四个文件的样式进行检查和调整，并列出调整结果：

1. `src/components/loginDialog.vue`
2. `src/components/DashboardPage.vue`
3. `src/components/AssetDetails.vue`
4. `src/components/AsideMenue.vue`

## 调整范围

- 规范修复：less → scss、消除 `!important`、使用 common-forms.scss 变量、修复 props 类型
- 视觉优化：统一设计语言、优化间距/圆角/阴影、提升整体质感
- loginDialog.vue：原生 input 改为 el-input 组件

## 规范依据

- FRONTEND.md：使用 `<style scoped lang="scss">`、禁止 `!important`（覆盖第三方除外）、主题色常量统一管理
- AGENTS.md：禁止 `any`、最小侵入、路径别名 `@/`、组件 ≤500 行
- common-forms.scss：已定义 `$primary-color`、`$text-primary`、`$border-color`、`$background-color` 等变量及多个 mixin

## 技术栈

- 框架：Vue 3 + TypeScript + `<script setup lang="ts">`
- 样式：SCSS（弃用 Less）、Element Plus 组件库
- 变量源：`@/assets/common-forms.scss`（已定义完整变量和 mixin）

## 实现方案

### 核心策略

1. **统一 lang 属性**：所有文件 `<style>` 标签统一为 `lang="scss"`
2. **消除 `!important`**：通过提高选择器优先级或使用 `:deep()` 精确命中替代
3. **引入公共变量**：`@use "@/assets/common-forms.scss" as *` 使用已有变量，消除硬编码
4. **修复 props 规范**：loginDialog.vue 的 props 显式类型化，停止直接修改 prop
5. **视觉优化**：统一圆角、阴影、间距，采用现代化卡片设计语言

### 各文件具体调整

#### 1. loginDialog.vue

- [修改] `lang="less"` → `lang="scss"`
- [修改] 原生 `<input>` → `<el-input>` 组件，绑定 `v-model`
- [修改] props 类型化：`defineProps<{ centerDialogVisible: boolean }>()`，使用 `emit('update:visible')` 替代直接修改 prop
- [修改] 硬编码 `#ccc` → `$border-color`（即 `#e8e8e8`），聚焦态使用 `$primary-color`
- [新增] 引入 `@use "@/assets/common-forms.scss" as *` 使用变量
- [优化] 弹窗内容区增加 `padding: 24px`，输入框统一高度 `40px`，按钮组使用 flex 居中
- [修复] 模板中 `:="centerDialogVisible"` 语法错误 → `:model-value="centerDialogVisible"`

#### 2. DashboardPage.vue

- [修改] `lang="less"` → `lang="scss"`
- [修改] 硬编码颜色替换为 common-forms.scss 变量（`#f5f7fa` → `$background-color`，`#fff` 等）
- [修改] 文件末尾两个游离的 `:deep()` 选择器（第 642-651 行）移入 `.dashboard-page-content` 内，防止样式泄漏
- [修改] 第 17 行和第 104 行内联样式 `style="margin-left: auto; color: white"` 移到 CSS 中
- [优化] 卡片增加 `backdrop-filter: blur(10px)` 提升质感，统计数字增加 `text-shadow`

#### 3. AssetDetails.vue

- [修改] `lang="less"` → `lang="scss"`
- [优化] 作为路由容器，增加 `overflow-y: auto` 支持内容滚动，统一背景色 `$background-color`

#### 4. AsideMenue.vue

- [修改] 消除全部 `!important`（共 7 处），通过提高选择器优先级替代
- [修改] 硬编码颜色替换为 common-forms.scss 变量（`#e8e8e8` → `$border-color`，`#303133` → `$text-primary`，`#409eff` → `$primary-color`）
- [优化] 菜单项增加 `border-radius: 8px` 圆角，子菜单标题增加渐变背景
- [修复] 第 94 行 `linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);` 语法补全为 `linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)`

### 性能与可靠性

- 所有修改仅涉及样式和 props 定义，不改变业务逻辑
- 使用 `:deep()` 精确限定作用域，避免全局污染
- 修改后需通过 `npm run type-check` 和 `npm run lint` 验证

## 设计风格

采用 **现代企业管理平台** 设计风格，干净专业、信息层级清晰。

### 设计语言

- **圆角统一**：卡片/输入框/按钮统一使用 `8px`（小）/`12px`（中）/`16px`（大）圆角
- **阴影体系**：默认 `$card-shadow: 0 2px 8px rgba(0,0,0,0.08)`，悬浮态 `$card-hover-shadow: 0 4px 16px rgba(0,0,0,0.12)`
- **色彩体系**：以 `#409eff` 为主色，配合 `common-forms.scss` 定义的成功/警告/危险色
- **渐变保留**：DashboardPage.vue 的四张卡片渐变作为品牌视觉亮点予以保留，但提取为 SCSS 变量便于统一调整

### 各文件设计调整

#### loginDialog.vue

- 弹窗内容区：增加 `24px` 内边距，输入框高度统一 `40px`
- 按钮组：flex 居中，主次按钮区分（primary + default）
- 输入框聚焦态：使用 `el-input` 原生聚焦样式（无需自定义）

#### DashboardPage.vue

- 卡片：保留渐变背景，增加 `backdrop-filter: blur(10px)` 提升质感
- 统计数字：增加轻微 `text-shadow: 0 1px 2px rgba(0,0,0,0.1)`
- 列表项：增加 `border-radius: 4px` 和 hover 背景色

#### AssetDetails.vue

- 作为容器，统一背景色 `#f5f7fa`，支持内容区滚动

#### AsideMenue.vue

- 菜单项：增加 `border-radius: 8px`，hover 态背景色使用 `rgba($primary-color, 0.08)`
- 激活态：左侧 `3px solid $primary-color` 边框 + 左侧 `8px` 圆角

## Agent Extensions

### Skill

- **frontend-design**
- 用途：辅助创建符合现代设计规范的前端界面样式
- 预期效果：确保样式调整符合生产级视觉标准