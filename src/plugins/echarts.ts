/**
 * @file ECharts 按需引入配置，注册渲染器、图表类型与组件
 * @module src/plugins/echarts
 * @exports
 *   - VChart: vue-echarts 组件（已注册所需图表类型与组件）
 * @callers
 *   - components/DashboardPage.vue
 * @dependsOn
 *   - echarts/core (use)
 *   - echarts/renderers (CanvasRenderer)
 *   - echarts/charts (LineChart, PieChart)
 *   - echarts/components (GridComponent, TooltipComponent, LegendComponent, TitleComponent)
 *   - vue-echarts (VChart)
 */

import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'

use([
  CanvasRenderer,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
])

export { VChart }
