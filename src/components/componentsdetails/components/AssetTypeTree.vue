<template>
  <div class="asset-type-tree">
    <div class="tree-header">
      <span class="title">资产分类目录</span>
      <el-button link size="small" @click="expandAll">
        <el-icon><ArrowDown /></el-icon>
        展开
      </el-button>
      <el-button link size="small" @click="collapseAll">
        <el-icon><ArrowUp /></el-icon>
        折叠
      </el-button>
    </div>

    <el-tree
      ref="treeRef"
      :data="treeData"
      :props="{ label: 'type_name', children: 'children' }"
      node-key="recordcode"
      highlight-current
      :current-node-key="currentKey"
      :default-expanded-keys="expandedKeys"
      @node-click="handleNodeClick"
      class="tree-content"
    >
      <template #default="{ node, data }">
        <div class="tree-node" :class="{ 'is-leaf': !data.children?.length }">
          <el-icon v-if="data.children?.length" class="node-icon">
            <FolderOpened v-if="node.expanded" />
            <Folder v-else />
          </el-icon>
          <el-icon v-else class="node-icon"><Document /></el-icon>
          <span class="node-label" :title="data.type_name">
            {{ data.type_name }}
          </span>
          <el-tag
            v-if="data.level !== undefined && data.level > 0"
            size="small"
            type="info"
            class="level-tag"
          >
            L{{ data.level }}
          </el-tag>
        </div>
      </template>
    </el-tree>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ArrowDown, ArrowUp, Folder, FolderOpened, Document } from '@element-plus/icons-vue'
import type { AssetType } from '@/types/assettype'

interface AssetTypeTreeNode extends AssetType {
  children?: AssetTypeTreeNode[]
}

interface Props {
  data: AssetType[]
  currentKey?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  currentKey: null,
})

const emit = defineEmits<{
  (e: 'select', assetType: AssetType): void
}>()

const treeRef = ref()
const expandedKeys = ref<string[]>([])

/** 从扁平数据构建树（基于 parent FK） */
function buildTree(flatData: AssetType[]): AssetTypeTreeNode[] {
  const roots: AssetTypeTreeNode[] = []
  const rcMap = new Map<string, AssetTypeTreeNode>()

  flatData.forEach((item) => {
    const node: AssetTypeTreeNode = { ...item, children: [] }
    rcMap.set(item.recordcode, node)
  })

  flatData.forEach((item) => {
    const node = rcMap.get(item.recordcode)!
    if (item.parent && rcMap.has(item.parent)) {
      rcMap.get(item.parent)!.children!.push(node)
    } else {
      roots.push(node)
    }
  })

  function sortTree(nodes: AssetTypeTreeNode[]) {
    nodes.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) sortTree(node.children)
    })
  }
  sortTree(roots)
  return roots
}

const treeData = computed(() => buildTree(props.data))

const handleNodeClick = (data: AssetType) => {
  emit('select', data)
}

const expandAll = () => {
  const store = treeRef.value?.store
  if (!store) return
  Object.values(store.nodesMap).forEach((node) => {
    ;(node as { expanded: boolean }).expanded = true
  })
}

const collapseAll = () => {
  const store = treeRef.value?.store
  if (!store) return
  Object.values(store.nodesMap).forEach((node) => {
    ;(node as { expanded: boolean }).expanded = false
  })
}

watch(
  () => props.data,
  (newData) => {
    if (newData.length > 0 && expandedKeys.value.length === 0) {
      expandedKeys.value = newData.map((node) => node.recordcode)
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.asset-type-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .tree-header {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color-light);

    .title {
      font-weight: 600;
      font-size: 14px;
      color: var(--text-primary);
      margin-right: auto;
    }
  }

  .tree-content {
    flex: 1;
    overflow: auto;
    padding: 8px 4px 8px 0;

    .tree-node {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 4px 4px 4px 0;

      &.is-leaf {
        padding-left: 8px;
      }

      .node-icon {
        margin-right: 8px;
        color: var(--text-secondary);
        font-size: 16px;
      }

      .node-label {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 13px;
      }

      .level-tag {
        margin-left: 4px;
        font-size: 11px;
      }
    }
  }
}
</style>
