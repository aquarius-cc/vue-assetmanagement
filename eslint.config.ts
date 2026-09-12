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

  // 存量 36 个直连文件待迁移清单(迁移一个移除一个, 直到本块清空)
  {
    name: 'app/legacy-direct-api-files',
    files: [
      'src/components/system/BindAuthUserDialog.vue',
      'src/components/system/RolePermDialog.vue',
      'src/components/system/UserRoleAssignDialog.vue',
      'src/components/componentsdetails/AssetTypeDetails.vue',
      'src/components/componentsdetails/AuditLogDetails.vue',
      'src/components/componentsdetails/components/DepartmentFormDialog.vue',
      'src/components/componentsdetails/UserDetails.vue',
      'src/components/componentsdetails/components/DepartmentEmployeeList.vue',
      'src/components/componentsdetails/components/DepartmentBatchAddDialog.vue',
      'src/components/componentsdetails/detils/AssetTypeBatchImport.vue',
      'src/components/componentsdetails/DepartmentManagement.vue',
      'src/components/componentsdetails/detils/AuditLogDetail.vue',
      'src/components/componentsdetails/detils/AssetForm.vue',
      'src/components/componentsdetails/detils/ContractBatchImport.vue',
      'src/components/componentsdetails/detils/ContractPaymentRecord.vue',
      'src/components/componentsdetails/detils/DepartmentBatchImport.vue',
      'src/components/componentsdetails/detils/UserBatchImport.vue',
      'src/components/componentsdetails/detils/UnregisteredAssetBasicDetails.vue',
      'src/components/componentsdetails/detils/RecycleAssetBasicDetails.vue',
      'src/components/componentsdetails/detils/OutAssetBatchImport.vue',
      'src/components/componentsdetails/detils/HardDiskSNForm.vue',
      'src/components/componentsdetails/detils/StorageBatchImport.vue',
      'src/views/LostAssetView.vue',
      'src/views/ContactsView.vue',
      'src/views/MarkBrokenView.vue',
      'src/views/LogIn.vue',
      'src/views/AssetLogsView.vue',
      'src/views/FoundAssetView.vue',
      'src/views/NotificationList.vue',
      'src/views/RecycleAssetView.vue',
      'src/views/RepairAssetView.vue',
      'src/views/RepairDoneView.vue',
      'src/views/RepairFailedView.vue',
      'src/views/system/RoleManage.vue',
      'src/views/system/AuthUserManage.vue',
      'src/views/ScrapAssetView.vue',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
)
