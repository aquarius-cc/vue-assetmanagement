import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // 允许以下划线开头的参数（或变量）未使用
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // 禁止 console.log/debug（防调试代码遗留），保留 warn/error 用于错误处理
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  globalIgnores([
    '**/dist/**',
    '**/dist-ssr/**',
    '**/coverage/**',
    '**/*.d.ts', // ⭐ 忽略所有类型声明文件
    'everything-claude-code/**', // 忽略整个工具目录
    '.trae/**', // 忽略 .trae 工具目录
    'graphify-out/**', // 忽略 graphify 输出
    '.agents/skills/impeccable/**', // 忽略 impeccable 技能目录
    'node_modules/**',
    // Stryker 变异测试的 sandbox 工作区。**本条是主防线，不可删。**
    // 机理：sandbox 副本路径形如 .stryker-tmp/sandbox-XXX/src/...，不在
    // tsconfig.app.json 的 include（["env.d.ts","src/**/*","src/**/*.vue"]）内，
    // 故 typescript-eslint 的 projectService（@vue/eslint-config-typescript
    // v14 为 projectService:true）openClientFile 失败，每个误lint 文件各报一次，
    // 累计 1208 errors（实测）。注意并非 tsconfigRootDir「多候选」——它是单值。
    // 为何不能依赖 stryker 自清：cleanTempDir 仅在进程内JS 异常路径生效
    // （stryker.js catch 分支比对 !== 'always' 才保留清理）；被 SIGTERM/SIGINT
    // 或 CI timeout-minutes 强杀时走 unexpected-exit-handler → process.exit()，
    // 而 process.exit() 不执行 async finally，故 TemporaryDirectory.dispose()
    // 根本不会被调用——本次残留正是超时被杀所致。故 cleanTempDir:"always"
    // （stryker.config.json）只覆盖异常路径，此 ignore 行覆盖信号路径，二者互补。
    '.stryker-tmp/**',
  ]),

  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  skipFormatting,

  // 测试文件允许 any 类型（mock 场景必需）
  {
    name: 'app/test-files-relaxed',
    files: ['**/__tests__/**', '**/*.spec.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // ⭐ 架构分层(DRY): 组件/视图禁止直接 import @/api/<业务模块>,
  // API 必须经 store 层消费。增量规则——仅约束新代码, 存量直连文件
  // 登记于下方 legacy-direct-api-files 豁免块, 迁移完毕后逐个移除。
  // infra 例外: @/api/config(BASE_URL 常量)、@/api/request、@/api/index(request 助手)
  //
  // 【为何 composable 不在本规则的 files 内——有意为之, 非遗漏】
  // composable 在本项目中被定位为**API 适配层**: 它把「端点 + 参数 + 响应取值」
  // 封装成可复用的有状态操作(如 useEmployeeSuggestionFetcher 直接调 employeeAPI
  // 并归一 results)。此时它就是 store 与视图之间那一层适配器, 若强制其再绕
  // store, 会为 10 个单端点 composable 各造一个只做透传的 store 方法——
  // 纯粹的转发层, 反而增加跳转层级与重复面。
  //
  // 判定标准(供后续新增 composable 参照):
  //   允许 —— 只封装单个/少数端点调用, 做参数默认值与响应归一, 无跨域业务编排;
  //   违规 —— 编排多个端点、串联业务流程、承载状态机, 此时它已是业务层而非适配层,
  //           应下沉进 store/service。
  // 现状 10 个 composable 均属「允许」一类, 审计记录见
  // Rules_Fiels/Duplicate_Codes/complete-patterns.md(A-45 决策)。
  {
    name: 'app/store-layer-no-direct-api',
    files: ['src/components/**/*.vue', 'src/views/**/*.vue'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // ESLint v10: group 仅支持 glob, 正则必须走显式 regex 字段
              regex: '@\\/api\\/(?!config$|request$|index$)[a-zA-Z0-9_-]+$',
              message:
                '禁止组件/视图直接 import @/api/* — 必须经 store 层消费(架构分层 DRY)。' +
                'infra 例外仅 @/api/config、@/api/request、@/api/index。' +
                '若为业务 API, 请改走对应 Pinia store; 存量豁免清单见 legacy-direct-api-files。',
            },
          ],
        },
      ],
    },
  },

  // 存量直连文件待迁移清单(迁移一个移除一个, 直到本块清空)
  // FE-01 批1 已迁移 11 个视图（LostAsset/MarkBroken/LogIn/AssetLogs/FoundAsset/NotificationList/
  // RecycleAsset/RepairAsset/RepairDone/RepairFailed/ScrapAsset）→ 已移除，仍可运行时直连的 in_use 状态资产操作视图见后续批次
  // FE-01 批2 已迁移 8 个视图/组件（BindAuthUserDialog/RolePermDialog/UserRoleAssignDialog/RoleManage/
  // AuthUserManage/ContactsView/UserDetails/DepartmentEmployeeList）→ 已移除，走 roleStore/authUserStore/userStore
  // FE-01 批3 已迁移 8 个组件（AssetTypeDetails/AuditLogDetails/DepartmentFormDialog/DepartmentBatchAddDialog/
  // AssetTypeBatchImport/DepartmentManagement/AuditLogDetail/ContractPaymentRecord）→ 已移除，走 departmentStore/assetTypeStore/auditLogStore/contractStore
  // FE-01 批4 已迁移 9 个组件（AssetForm/ContractBatchImport/DepartmentBatchImport/UserBatchImport/
  // UnregisteredAssetBasicDetails/RecycleAssetBasicDetails/OutAssetBatchImport/HardDiskSNForm/StorageBatchImport）
  // → 已移除，走 assetStore/contractStore/departmentStore/userStore/unregisteredAssetStore/harddiskSnStore/storageStore
  // FE-01 全部迁移完成，legacy-direct-api-files 豁免清单已清空并移除。
)
