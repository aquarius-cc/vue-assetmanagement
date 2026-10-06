<!--
  @file 资产分类标签
  @module components/commoncomponents/AssetTypeTag
  @description
    抽取「资产分类名称」单元格渲染，供平铺列表与分组展开表格的明细区共用。

    【为什么抽取】DR-2：分组模式（`enableGrouping=true`）下明细区复用同一列集，
    分类单元格若在两处各写一份 `el-tag + v-else` 即构成重复实现。
    「当前状态」复用既有 `StatusTag`、「合同号」为一表达式，无需抽取。
-->
<template>
  <el-tag v-if="typeName" type="info">{{ typeName }}</el-tag>
  <span v-else>-</span>
</template>

<script setup lang="ts">
interface Props {
  /** 分类名称（AssetListSerializer 反规范输出的 asset_type_name） */
  typeName?: string | null
}

defineProps<Props>()
</script>
