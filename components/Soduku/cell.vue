
<script setup>

const props = defineProps({
  cell: Object,
  lastStep: Object
})

const cellDom = ref(null)

props.cell.ref = cellDom

</script>

<template>
  <div ref="cellDom" :class="{
    'lastFrom': lastStep?.from?.find(target => target.is(cell)),
    'lastTo': lastStep?.target?.find(target => target.is(cell)),
  }"
  :title="lastStep?.from?.indexOf(lastStep?.from?.find(target => target.is(cell)))"
  >
      {{props.cell.possibleValues.join(" ")}} <span v-if="lastStep?.target?.find(target=>target.is(cell))" class="removed">{{lastStep?.value}}</span>
  </div>

</template>

<style scoped>
.removed {
    text-decoration: line-through;
    color: red;
}

.lastFrom {
    background: yellow;
}

.lastTo {
    background: lightgreen;
}

</style>
