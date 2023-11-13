<script setup>
let cells = ref([])
function solve(e){
  localStorage.setItem('lastSolve', JSON.stringify(e))
  cells.value = e
}
</script>

<template>
  <div>
    <SodukuSetup v-if="!cells.length" @solve="solve" />
    <Soduku v-if="cells.length" :initialCells="cells"/>
  </div>
</template>


