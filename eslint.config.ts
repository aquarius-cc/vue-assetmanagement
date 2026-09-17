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
