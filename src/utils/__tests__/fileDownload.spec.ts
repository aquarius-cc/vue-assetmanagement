/**
 * Blob 下载工具测试
 *
 * 覆盖两条容易出错的路径：
 * 1. revokeObjectURL 必须**延后**执行（同步释放会让 Safari 取消下载）；
 * 2. Content-Disposition 解析必须容忍头不可见（跨域未暴露），
 *    且优先取 filename*（非 ASCII 场景）。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { XLSX_MIME, downloadBlob, resolveDownloadFilename } from '../fileDownload'

describe('XLSX_MIME', () => {
  it('为标准 xlsx MIME（与后端 StreamingExcelResponse 一致）', () => {
    expect(XLSX_MIME).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  })
})

describe('downloadBlob', () => {
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    vi.useFakeTimers()
  })

  afterEach(() => {
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('创建临时 a 标签并以指定文件名触发下载', () => {
    const blob = new Blob(['xlsx'])
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadBlob(blob, 'report.xlsx')

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    expect(click).toHaveBeenCalledTimes(1)
  })

  it('点击后把临时节点从 DOM 移除（不残留）', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const before = document.body.childElementCount

    downloadBlob(new Blob(['x']), 'a.xlsx')

    expect(document.body.childElementCount).toBe(before)
  })

  it('revokeObjectURL 延后到下一轮任务（同步释放会取消下载）', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadBlob(new Blob(['x']), 'a.xlsx')

    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })
})

describe('resolveDownloadFilename', () => {
  it('头不可见时返回兜底名（跨域未暴露 Content-Disposition）', () => {
    expect(resolveDownloadFilename(undefined, 'fallback.xlsx')).toBe('fallback.xlsx')
    expect(resolveDownloadFilename(null, 'fallback.xlsx')).toBe('fallback.xlsx')
    expect(resolveDownloadFilename('', 'fallback.xlsx')).toBe('fallback.xlsx')
  })

  it('解析带引号的 ASCII filename', () => {
    expect(resolveDownloadFilename('attachment; filename="assets.xlsx"', 'fb.xlsx')).toBe(
      'assets.xlsx',
    )
  })

  it('解析不带引号的 filename', () => {
    expect(resolveDownloadFilename('attachment; filename=assets.xlsx', 'fb.xlsx')).toBe(
      'assets.xlsx',
    )
  })

  it('优先解析 filename*（RFC 6266 非 ASCII 场景）', () => {
    // 操作日志 = %E6%93%8D%E4%BD%9C%E6%97%A5%E5%BF%97
    const header =
      'attachment; filename="fallback.xlsx"; filename*=UTF-8\'\'%E6%93%8D%E4%BD%9C%E6%97%A5%E5%BF%97.xlsx'
    expect(resolveDownloadFilename(header, 'fb.xlsx')).toBe('操作日志.xlsx')
  })

  it('filename* 百分号编码非法时回落到普通 filename', () => {
    const header = 'attachment; filename="assets.xlsx"; filename*=UTF-8\'\'%E4%B8'
    expect(resolveDownloadFilename(header, 'fb.xlsx')).toBe('assets.xlsx')
  })

  it('filename* 为空时回落到普通 filename', () => {
    const header = 'attachment; filename="assets.xlsx"; filename*=UTF-8\'\''
    expect(resolveDownloadFilename(header, 'fb.xlsx')).toBe('assets.xlsx')
  })

  it('无法识别任何 filename 形式时返回兜底名', () => {
    expect(resolveDownloadFilename('attachment', 'fb.xlsx')).toBe('fb.xlsx')
  })
})
