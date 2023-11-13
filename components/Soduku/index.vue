<script setup lang="ts">
const props = defineProps({
  initialCells: Array
})

import solve, {state} from '~/solver/newSolver'

let hasRun = false


const runOnce = ()=>{
  if (hasRun) return
  hasRun = true
  solve(props.initialCells)
  console.log(state)
}
runOnce()

function cellState(cell){
  const {x, y, possibleValues} = cell
  if (possibleValues.length>1) return 'unsolved'
  if (possibleValues.length===0) return 'unsolvable'
  const initialCell = props.initialCells.find( (definition) => {
    return definition.x === x && definition.y === y
  } )

  if (!initialCell || !initialCell.value){
    return 'solved'
  }
  if (initialCell){
    if (possibleValues[0] === initialCell.value) return "initial"
    console.log("initError", possibleValues[0], initialCell.value)
    return "initError"
  }

}

const showSetup = ref(false)
</script>

<template>
  <div>
    <table>
      <tr v-for="row in state?.grid">
        <td v-for="cell in row" :class="cellState(cell)">
          <SodukuCell :cell="cell" />
        </td>
      </tr>
    </table>
    <div class="setupBox">
      <div @click="showSetup= !showSetup" class="setupHeader">
        showSetupObj
      </div>
      <div v-if="showSetup">
        {{JSON.stringify(props.initialCells)}}
      </div>
    </div>
  </div>

</template>

<style scoped>
  td{
    border: 1px solid black;
    width: 40px;
    height: 40px;
    text-align: center;
  }

  td:nth-child(3n){
    border-right: 3px solid black;
  }
  tr:nth-child(3n) td{
    border-bottom: 3px solid black;
  }
  td:first-child{
    border-left: 3px solid black;
  }
  tr:first-child td{
    border-top: 3px solid black;
  }

  .setupBox{
    border-radius: 15px;
    border: 1px solid black
  }
  .setupHeader{
    border-bottom: 1px solid black;
  }
  .setupBox div{
    padding: 10px;
  }

  table{
    border-collapse: collapse;
  }

  .solved{
    background: palegreen;
  }
  .unsolvable{
    background: red
  }
  .initial{
    background: lightslategray;
    font-weight: bold;
  }
  .initError{
    background: lightslategray;
    font-weight: bold;
    color: red;
  }
</style>
