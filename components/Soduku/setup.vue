<script setup>
const grid = ref([])
const init = ref('')

for (let i=0;i<9; i++){
  grid.value.push([])
  for (let j=0;j<9; j++){
    grid.value[i].push({value: ''})
  }
}

const emit = defineEmits(['solve'])

function importValues(){
  const initObj = JSON.parse(init.value)

  for (let i=0;i<initObj.length; i++){
    grid.value[initObj[i].x-1][initObj[i].y-1].value = initObj[i].value
  }

}


function solve(){
  const cells = []
  for (let i=0;i<9; i++){
    for (let j=0;j<9; j++){
      if (grid.value[i][j].value){
        cells.push({ x: i+1, y: j+1, value: parseInt(grid.value[i][j].value) })
      }
    }
  }

  emit('solve', cells)
}

function solveLast(){
  const lastSolve = JSON.parse(localStorage.getItem('lastSolve'))
  if (lastSolve){
    emit('solve', lastSolve)
  }
}

function inputValue(e, cell){
  let value = e.target.value
  if (value.length>1){
    value = value.slice(-1)
    e.target.value = value
  }
  if (parseInt(value).toString()===value){
    e.target.value = parseInt(value)
    const nextSibling = e.target.parentNode?.nextElementSibling
    if (nextSibling && nextSibling.firstElementChild){
      e.target.parentNode.nextElementSibling.firstElementChild.focus()
    } else {
      const nextRow = e.target.parentNode.parentNode.nextElementSibling
      if (nextRow) {
        nextRow.firstElementChild.firstElementChild.focus()
      } else
        e.target.parentNode.parentNode.parentNode.firstElementChild.firstElementChild.firstElementChild.focus()
    }
  } else {
    e.target.value = ''
  }

  if (value==='0'){
    value = ''
    e.target.value = value
  }
  cell.value = value
}

//[{"x":1,"y":3,"value":8},{"x":1,"y":4,"value":5},{"x":1,"y":5,"value":4},{"x":1,"y":7,"value":1},{"x":2,"y":1,"value":1},{"x":2,"y":3,"value":5},{"x":2,"y":5,"value":7},{"x":2,"y":9,"value":4},{"x":3,"y":5,"value":3},{"x":3,"y":6,"value":1},{"x":3,"y":7,"value":5},{"x":3,"y":8,"value":2},{"x":4,"y":1,"value":6},{"x":4,"y":4,"value":1},{"x":4,"y":8,"value":8},{"x":5,"y":4,"value":2},{"x":5,"y":5,"value":8},{"x":5,"y":6,"value":4},{"x":5,"y":7,"value":9},{"x":5,"y":8,"value":1},{"x":5,"y":9,"value":6},{"x":7,"y":1,"value":2},{"x":7,"y":2,"value":6},{"x":7,"y":4,"value":4},{"x":7,"y":7,"value":7},{"x":7,"y":8,"value":3},{"x":8,"y":5,"value":6},{"x":8,"y":6,"value":3},{"x":8,"y":8,"value":4},{"x":9,"y":4,"value":9}]

</script>

<template>
  <div>

    <table>
      <tr v-for="row in grid">
        <td v-for="cell in row">
          <input type="text" v-model="cell.value"  @input="e=>inputValue(e,cell)"/>
        </td>
      </tr>
    </table>
    <input type="textArea" v-model="init" class="setup"><br>
    <button @click="solve">Solve</button>
    <button @click="importValues">Import</button>
    <button @click="solveLast">repeatLastSolve</button>
  </div>
</template>

<style scoped>
td{
  border: 1px solid black;
  width: 40px;
  height: 40px;
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

table{
  border-collapse: collapse;
}
td input{
  width: 100%;
  height: 100%;
  text-align: center;
  border: none;
  margin: 0;
  padding: 0;
  caret-color: transparent;
}

td input:focus{
  outline: none;
  background: paleturquoise;
}
td input::selection {
  background-color:transparent;
}


.setup{
  width: 400px;
  height: 40px;
  margin: 20px 0;
  padding: 0;
  text-align: center;
  font-size: 20px;
  border: 1px solid black;
}
</style>


