
<script setup>

const props = defineProps({
  cell: Object
})

const cellDom = ref(null)

props.cell.ref = cellDom

</script>

<template>
  <div ref="cellDom">
      {{props.cell.possibleValues.join(" ")}}
  </div>

</template>

<style scoped>

</style>
