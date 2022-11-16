<script setup lang="ts">
import { SpecTreeFileNode } from './tree';

const props = defineProps<{
  node: SpecTreeFileNode
}>()
</script>

<template>
  <li>{{ props.node.name }}</li>
</template>