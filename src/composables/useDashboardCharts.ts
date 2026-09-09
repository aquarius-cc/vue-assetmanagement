/**
 * @file 仪表盘图表配置 Composable — 趋势折线图 + 两个饼图
 * @module composables/useDashboardCharts
 * @description
 *   纯函数层：接收 store 的响应式数据，返回 ECharts 图表配置。
 *   职责分离：不触发 API 调用，不修改 store 状态。
 * @callers
 *   - DashboardPage.vue
 * @dependsOn
 *   - types/dashboard: 数据类型定义
 */
import { computed, type Ref } from 'vue'
import type { EChartsOption } from 'echarts'
import { useChartTheme, type ChartTheme } from '@/composables/useChartTheme'
import type {
  AssetTrendData,
  DepartmentDistributionItem,
  AssetTypeDistributionItem,
} from '@/types/dashboard'

/**
 * Top-N 聚合：取前 N 项，其余归入"其他"
 */
function aggregateTopN<T extends { percentage: number }>(
  items: T[],
  topN: number,
  nameKey: keyof T,
  countKey: keyof T,
): Array<{ name: string; value: number }> {
  const sorted = [...items].sort((a, b) => Number(b[countKey]) - Number(a[countKey]))
  const top = sorted.slice(0, topN)
  const rest = sorted.slice(topN)
  const result = top.map((item) => ({
    name: String(item[nameKey]),
    value: Number(item[countKey]),
  }))
  if (rest.length > 0) {
    const restTotal = rest.reduce((sum, item) => sum + Number(item[countKey]), 0)
    result.push({ name: '其他', value: restTotal })
  }
  return result
}

/**
 * 通用饼图 option 生成
 */
function buildPieOption(
  data: Array<{ name: string; value: number }>,
  theme: ChartTheme,
  title?: string,
): EChartsOption {
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      textStyle: { color: theme.textColor, fontSize: 12 },
    },
    title: title
      ? {
          text: title,
          left: 'center',
          textStyle: { fontSize: 14, fontWeight: 600, color: theme.textColor },
        }
      : undefined,
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'middle',
      textStyle: { fontSize: 12, color: theme.secondaryText },
    },
    color: theme.pieColors,
    series: [
      {
        type: 'pie',
        radius: ['40%', '65%'],
        center: title ? ['40%', '60%'] : ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 4, borderColor: theme.dividerColor, borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 13, fontWeight: 'bold' },
          scaleSize: 6,
        },
        data,
      },
    ],
  }
}

/**
 * 仪表盘图表 Composable
 *
 * @param assetTrend - 资产趋势数据 Ref
 * @param departmentDistribution - 部门分布数据 Ref
 * @param assetTypeDistribution - 类型分布数据 Ref
 */
export function useDashboardCharts(
  assetTrend: Ref<AssetTrendData[]>,
  departmentDistribution: Ref<DepartmentDistributionItem[]>,
  assetTypeDistribution: Ref<AssetTypeDistributionItem[]>,
) {
  const { theme, isDark } = useChartTheme()

  /**
   * 趋势折线图 option — 仅展示 new_assets 一条线
   */
  const trendChartOption = computed<EChartsOption>(() => {
    const t = theme.value
    void isDark.value
    const dates = assetTrend.value.map((d) => d.date)
    const values = assetTrend.value.map((d) => d.new_assets)
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: t.tooltipBg,
        borderColor: t.tooltipBorder,
        textStyle: { color: t.textColor, fontSize: 12 },
      },
      grid: { left: 40, right: 20, top: 20, bottom: 30 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { fontSize: 11, color: t.axisText, rotate: dates.length > 15 ? 45 : 0 },
        axisLine: { lineStyle: { color: t.borderColor } },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { fontSize: 11, color: t.axisText },
        splitLine: { lineStyle: { color: t.gridLine } },
      },
      series: [
        {
          type: 'line',
          data: values,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: t.lineColor, width: 2 },
          itemStyle: { color: t.lineColor },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: t.lineAreaTop },
                { offset: 1, color: t.lineAreaBottom },
              ],
            },
          },
        },
      ],
    }
  })

  /**
   * 部门分布饼图 option — Top5 + 其他
   */
  const deptPieOption = computed<EChartsOption>(() => {
    const data = aggregateTopN(departmentDistribution.value, 5, 'department_name', 'asset_count')
    return buildPieOption(data, theme.value)
  })

  /**
   * 类型分布饼图 option — Top5 + 其他
   */
  const typePieOption = computed<EChartsOption>(() => {
    const data = aggregateTopN(assetTypeDistribution.value, 5, 'type_name', 'count')
    return buildPieOption(data, theme.value)
  })

  return {
    trendChartOption,
    deptPieOption,
    typePieOption,
  }
}
