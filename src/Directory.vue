<script setup lang="ts">
import { computed } from 'vue';
import { getAllFileInDirectory, groupSpecTreeNodes, SpecTreeDirectoryNode } from './tree';
import File from './File.vue'

const props = defineProps<{
  node: SpecTreeDirectoryNode
}>()

const emit = defineEmits<{
  (event: 'handleCollapse', node: SpecTreeDirectoryNode): void
}>()

const fileList = computed(() => getAllFileInDirectory(props.node));

const names = computed(() => fileList.value.map(
  (x) => `${x.data.fileName}${x.data.specFileExtension}`
));

const grouped = computed(() => groupSpecTreeNodes(props.node));

const icon = computed(() => props.node.collapsed ? ">" : "v");
</script>

<template>
  <li>
    <span class="directory-name">{{ props.node.name }}</span>
    <button 
      @click="emit('handleCollapse', props.node)"
    >
      {{ icon }}
    </button>
    <span class="light">
      (Contains {{ fileList.length }} specs:
      <span class="lighter">{{ names.join(", ") }}</span>)
    </span>
  </li>

  <ul v-if="!props.node.collapsed">
    <File v-for="file of grouped.files" :node="file" />
    <Directory 
      v-for="child of grouped.directories"
      :key="child.name"
      :node="child" 
      @handleCollapse="(node: SpecTreeDirectoryNode) => emit('handleCollapse', node)"
    />
  </ul>
</template>