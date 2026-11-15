/** [批次4 C8] 批次 4 DRY 不变量护栏：11 断言 + 4 夹具（零正则，AR-2）
 *  断言 = 六个收敛项的在场/归零不变量；夹具 = 红态字符串样本经同一断言原语验证「复活会被抓」
 *  （护栏自身变异敏感性自测，先红语义内嵌）。
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const SRC = resolve(__dirname, '..')
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf-8')

// ============ 断言原语（夹具与现网共用） ============
const hasSearchForm = (s: string) => s.includes('interface SearchForm')
const hasCrossFileExport = (s: string) =>
  s.includes('export interface ') || s.includes('export type ')
const includesCommonForms = (s: string) => s.includes('common-forms')
const hasIndexKey = (s: string) => s.includes(':key="index"')

describe('批次4 DRY 不变量（六项收敛护栏，11 断言）', () => {
  // ---------- M-16：表单输入深度覆盖单源 ----------
  const mixinFile = read('assets/styles/common-forms.scss')

  it('A1. M-16：form-input-overrides mixin 在场（唯一实现）', () => {
    expect(mixinFile).toContain('@mixin form-input-overrides')
  })

  it('A2. M-16：SHADOW_ORDER 顺序断言（零正则：indexOf 递增）', () => {
    const mixinStart = mixinFile.indexOf('@mixin form-input-overrides')
    const mixinEnd = mixinFile.indexOf('@mixin', mixinStart + 1)
    const mixinBody = mixinFile.slice(mixinStart, mixinEnd === -1 ? undefined : mixinEnd)
    const SHADOW_ORDER = [
      '--border-color-input',
      '--border-color-input-dark',
      '--color-primary-light',
    ]
    let cursor = mixinStart + mixinBody.indexOf('box-shadow')
    for (const token of [...SHADOW_ORDER, ...SHADOW_ORDER]) {
      const at = mixinFile.indexOf(token, cursor)
      expect(at, `token ${token}`).toBeGreaterThan(-1)
      cursor = at + token.length
    }
  })

  it('A3. M-16：三表单内联 :deep 块归零并 @include mixin', () => {
    const forms = [
      'components/componentsdetails/detils/AssetTypeForm.vue',
      'components/componentsdetails/detils/DepartmentForm.vue',
      'components/componentsdetails/detils/StorageForm.vue',
    ]
    for (const f of forms) {
      const content = read(f)
      expect(content, f).not.toContain('deep(.el-input__wrapper)')
      expect(content, f).not.toContain('deep(.el-textarea__inner)')
      expect(content, f).toContain('@include form-input-overrides')
    }
  })

  it('A4. M-16：LogIn 刻意保留登记 + common-forms 不进全局导入链（红线）', () => {
    expect(read('views/LogIn.vue')).toContain('deep(.el-input__wrapper)')
    expect(read('main.ts')).not.toContain('common-forms')
    expect(read('App.vue')).not.toContain('common-forms')
  })

  // ---------- M-14：SearchForm 收敛 ----------
  it('A5. M-14：4 个搜索组件 interface SearchForm 归零', () => {
    const files = [
      'components/componentsdetails/detils/detilschildcomponents/ScrapableAssetsSearch.vue',
      'components/componentsdetails/detils/detilschildcomponents/RecyclableOutAssetsSearch.vue',
      'components/componentsdetails/detils/detilschildcomponents/WastedAssetsSearch.vue',
      'components/componentsdetails/detils/detilschildcomponents/ExportableAssetsSearch.vue',
    ]
    for (const f of files) {
      expect(hasSearchForm(read(f)), f).toBe(false)
    }
  })

  it('A6. M-14：useAssetSearchForm 唯一实现在场', () => {
    expect(existsSync(resolve(SRC, 'composables/useAssetSearchForm.ts'))).toBe(true)
    expect(read('composables/useAssetSearchForm.ts')).toContain(
      'export function useAssetSearchForm',
    )
  })

  // ---------- M-13：跨组件类型迁 src/types ----------
  it('A7. M-13：6 个涉改文件 export (type|interface) 归零（护栏升级口径，含 type 别名）', () => {
    const files = [
      'components/commoncomponents/DashboardStatCard.vue',
      'components/componentsdetails/detils/detilschildcomponents/SelectedRecordsTable.vue',
      'components/componentsdetails/detils/outAssetFormEditLoader.ts',
      'components/componentsdetails/detils/userBatchImport.config.ts',
    ]
    for (const f of files) {
      expect(hasCrossFileExport(read(f)), f).toBe(false)
    }
  })

  it('A8. M-13：4 类型在 src/types 唯一源在场', () => {
    expect(read('types/dashboard.ts')).toContain('export interface StatItem')
    expect(read('types/recycleasset.ts')).toContain('export interface SelectedRecord')
    expect(read('types/outasset.ts')).toContain('export interface OutAssetEditLoaderDeps')
    expect(read('types/user.ts')).toContain('export type DepartmentMappingGetter')
  })

  // ---------- M-15：分页单源 ----------
  it('A9. M-15：4 页 + CommonList 模板直写 el-pagination 归零（经 CommonPagination 单源）', () => {
    const files = [
      'views/ContactsView.vue',
      'views/NotificationList.vue',
      'views/system/AuthUserManage.vue',
      'views/system/RoleManage.vue',
      'components/commoncomponents/CommonList.vue',
    ]
    for (const f of files) {
      expect(read(f), f).not.toContain('<el-pagination')
      expect(read(f), f).toContain('<CommonPagination')
    }
  })

  // ---------- M-11：稳定行 id ----------
  it('A10. M-11：batchAddList 行 key 为 _rowId，index key 归零', () => {
    const content = read('components/componentsdetails/AssetTypeDetails.vue')
    expect(content).toContain(':key="item._rowId"')
    expect(hasIndexKey(content)).toBe(false)
  })

  // ---------- M-08：resetAppState 走 setter ----------
  it('A11. M-08：resetAppState 含 setTheme/setPrimaryColor setter 通路与 4 storage 清除（M-07/D4=B 无参形态）', () => {
    const content = read('stores/app.ts')
    const start = content.indexOf('const resetAppState')
    const resetBody = content.slice(start, content.indexOf('return {', start))
    expect(resetBody).toContain("setTheme('light')")
    expect(resetBody).toContain('setPrimaryColor()')
    for (const key of ['sidebarCollapsed', 'theme', 'primaryColor', 'appSettings']) {
      expect(resetBody).toContain(`localStorage.removeItem('${key}')`)
    }
    // M-07/D4=B：任意主色内联写入不得回流
    expect(resetBody).not.toContain("setProperty('--el-color-primary'")
  })
})

describe('批次4 护栏夹具（4 个红态样本，验证复活会被抓）', () => {
  it('F1. 红态样本：interface SearchForm 复活 → hasSearchForm 为真', () => {
    const fixture = 'interface SearchForm {\n  asset_code: string\n}'
    expect(hasSearchForm(fixture)).toBe(true)
  })

  it('F2. 红态样本：type 别名形态回潮 → hasCrossFileExport 为真', () => {
    const fixture = 'export type DepartmentMappingGetter = () => Record<string, string>'
    expect(hasCrossFileExport(fixture)).toBe(true)
  })

  it('F3. 红态样本：common-forms 进全局导入链 → includesCommonForms 为真', () => {
    const fixture = "import './assets/styles/common-forms.scss'"
    expect(includesCommonForms(fixture)).toBe(true)
  })

  it('F4. 红态样本：:key="index" 复活 → hasIndexKey 为真', () => {
    const fixture = '<div v-for="(item, index) in list" :key="index">'
    expect(hasIndexKey(fixture)).toBe(true)
  })
})
