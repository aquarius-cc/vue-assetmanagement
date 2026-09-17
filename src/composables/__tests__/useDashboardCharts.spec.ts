import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useDashboardCharts } from '../useDashboardCharts'
import { useChartTheme } from '../useChartTheme'
import type {
  AssetTrendData,
  DepartmentDistributionItem,
  AssetTypeDistributionItem,
} from '@/types/dashboard'

function trendData(count: number): AssetTrendData[] {
  return Array.from({ length: count }, (_, i) => ({
    date: `2026-09-${String(i + 1).padStart(2, '0')}`,
    new_assets: i + 1,
    distributed: 0,
    recovered: 0,
    scrapped: 0,
  }))
}

function deptItems(entries: Array<[string, number]>): DepartmentDistributionItem[] {
  return entries.map(([department_name, asset_count]) => ({
    department_name,
    asset_count,
    percentage: asset_count,
  }))
}

function typeItems(entries: Array<[string, number]>): AssetTypeDistributionItem[] {
  return entries.map(([type_name, count]) => ({ type_name, count, percentage: count }))
}

function pieSeriesData(option: {
  series?: Array<{ data?: Array<{ name: string; value: number }> }>
}) {
  return option.series?.[0]?.data ?? []
}

describe('useDashboardCharts', () => {
  describe('trendChartOption', () => {
    it('reflects dates and new_assets arrays from the refs', () => {
      const assetTrend = ref(trendData(3))
      const { trendChartOption } = useDashboardCharts(
        assetTrend,
        ref<DepartmentDistributionItem[]>([]),
        ref<AssetTypeDistributionItem[]>([]),
      )
      const option = trendChartOption.value
      const xAxis = option.xAxis as { data: string[] }
      const series = option.series?.[0] as { type: string; data: number[] }
      expect(xAxis.data).toEqual(['2026-09-01', '2026-09-02', '2026-09-03'])
      expect(series.type).toBe('line')
      expect(series.data).toEqual([1, 2, 3])
    })

    it('computes reactively when the trend ref changes', () => {
      const assetTrend = ref(trendData(2))
      const { trendChartOption } = useDashboardCharts(assetTrend, ref([]), ref([]))
      assetTrend.value.push({
        date: '2026-09-03',
        new_assets: 3,
        distributed: 0,
        recovered: 0,
        scrapped: 0,
      })
      const series = trendChartOption.value.series?.[0] as { data: number[] }
      expect(series.data).toEqual([1, 2, 3])
    })

    it('rotates axis labels 45 degrees when more than 15 dates', () => {
      const { trendChartOption } = useDashboardCharts(ref(trendData(16)), ref([]), ref([]))
      const axisLabel = (trendChartOption.value.xAxis as { axisLabel?: { rotate: number } })
        .axisLabel
      expect(axisLabel?.rotate).toBe(45)
    })

    it('keeps axis labels horizontal at or below 15 dates', () => {
      const { trendChartOption } = useDashboardCharts(ref(trendData(15)), ref([]), ref([]))
      const axisLabel = (trendChartOption.value.xAxis as { axisLabel?: { rotate: number } })
        .axisLabel
      expect(axisLabel?.rotate).toBe(0)
    })

    it('renders a gradient areaStyle for the line series', () => {
      const { trendChartOption } = useDashboardCharts(ref(trendData(2)), ref([]), ref([]))
      const series = trendChartOption.value.series?.[0] as {
        areaStyle?: { color: { colorStops: Array<{ offset: number; color: string }> } }
      }
      expect(series.areaStyle?.color.type).toBe('linear')
      expect(series.areaStyle?.color.colorStops).toHaveLength(2)
      expect(series.areaStyle?.color.colorStops[0].offset).toBe(0)
      expect(series.areaStyle?.color.colorStops[1].offset).toBe(1)
    })

    it('flows theme colors into tooltip and axis label', () => {
      const { theme } = useChartTheme()
      const { trendChartOption } = useDashboardCharts(ref(trendData(2)), ref([]), ref([]))
      const tooltip = trendChartOption.value.tooltip as { backgroundColor: string }
      const axisLabel = (trendChartOption.value.xAxis as { axisLabel?: { color: string } })
        .axisLabel
      const series = trendChartOption.value.series?.[0] as { lineStyle: { color: string } }
      expect(tooltip.backgroundColor).toBe(theme.value.tooltipBg)
      expect(axisLabel?.color).toBe(theme.value.axisText)
      expect(series.lineStyle.color).toBe(theme.value.lineColor)
    })
  })

  describe('deptPieOption aggregation', () => {
    it('collapses items beyond top-5 into 其他 with summed value', () => {
      const items = deptItems([
        ['研发部', 10],
        ['市场部', 8],
        ['财务部', 6],
        ['人事部', 4],
        ['采购部', 3],
        ['法务部', 2],
        ['行政部', 1],
      ])
      const { deptPieOption } = useDashboardCharts(ref([]), ref(items), ref([]))
      const data = pieSeriesData(deptPieOption.value)
      expect(data).toHaveLength(6)
      expect(data[0]).toEqual({ name: '研发部', value: 10 })
      expect(data[4]).toEqual({ name: '采购部', value: 3 })
      expect(data[5]).toEqual({ name: '其他', value: 3 })
    })

    it('keeps all items when five or fewer', () => {
      const items = deptItems([
        ['研发部', 5],
        ['市场部', 3],
        ['财务部', 1],
      ])
      const { deptPieOption } = useDashboardCharts(ref([]), ref(items), ref([]))
      const data = pieSeriesData(deptPieOption.value)
      expect(data.map((d) => d.name)).toEqual(['研发部', '市场部', '财务部'])
      expect(data.map((d) => d.name)).not.toContain('其他')
    })

    it('returns empty data for an empty array', () => {
      const { deptPieOption } = useDashboardCharts(
        ref([]),
        ref<DepartmentDistributionItem[]>([]),
        ref([]),
      )
      expect(pieSeriesData(deptPieOption.value)).toEqual([])
    })

    it('handles a single item', () => {
      const items = deptItems([['研发部', 7]])
      const { deptPieOption } = useDashboardCharts(ref([]), ref(items), ref([]))
      const data = pieSeriesData(deptPieOption.value)
      expect(data).toEqual([{ name: '研发部', value: 7 }])
    })

    it('sorts by count descending and emits no title', () => {
      const items = deptItems([
        ['研发部', 2],
        ['市场部', 9],
        ['财务部', 5],
      ])
      const { deptPieOption } = useDashboardCharts(ref([]), ref(items), ref([]))
      const data = pieSeriesData(deptPieOption.value)
      expect(data.map((d) => d.value)).toEqual([9, 5, 2])
      expect(deptPieOption.value.title).toBeUndefined()
      const series = deptPieOption.value.series?.[0] as { center: string[] }
      expect(series.center).toEqual(['50%', '50%'])
    })
  })

  describe('typePieOption aggregation', () => {
    it('uses type_name/count keys and collapses beyond top-5', () => {
      const items = typeItems([
        ['台式机', 12],
        ['笔记本', 9],
        ['显示器', 7],
        ['打印机', 5],
        ['网络设备', 4],
        ['服务器', 3],
        ['配件', 1],
      ])
      const { typePieOption } = useDashboardCharts(ref([]), ref([]), ref(items))
      const data = pieSeriesData(typePieOption.value)
      expect(data).toHaveLength(6)
      expect(data[0]).toEqual({ name: '台式机', value: 12 })
      expect(data[5]).toEqual({ name: '其他', value: 4 })
    })

    it('flows theme colors into legend, color and borders', () => {
      const { theme } = useChartTheme()
      const items = deptItems([
        ['研发部', 6],
        ['行政部', 2],
      ])
      const { deptPieOption } = useDashboardCharts(ref([]), ref(items), ref([]))
      const legend = deptPieOption.value.legend as { textStyle: { color: string } }
      const series = deptPieOption.value.series?.[0] as {
        itemStyle?: { borderColor: string }
      }
      expect((deptPieOption.value.tooltip as { backgroundColor: string }).backgroundColor).toBe(
        theme.value.tooltipBg,
      )
      expect(legend.textStyle.color).toBe(theme.value.secondaryText)
      expect(deptPieOption.value.color).toEqual(theme.value.pieColors)
      expect(series.itemStyle?.borderColor).toBe(theme.value.dividerColor)
    })
  })
})
