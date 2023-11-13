const state = {
    rules: {},
    grid: [] as Cell[][],
    regions: [] as region[]
}

export class Cell{
    coordinates: {x: number, y: number}
    setValue?: number
    regions: region[] = []
    constructor(x: number, y: number, value?: number){
        this.coordinates = {x,y}
        if (value)
            this.setValue = value
    }

    static getCell(x: number, y: number){
        return state.grid?.[x-1]?.[y-1]
    }

    canBe(value: number){
        return this.values.includes(value)
    }
    get values(){
        if (this.setValue){
            return [this.setValue]
        }
        let possibleValues = [1,2,3,4,5,6,7,8,9]

        this.regions.forEach(region => {
            possibleValues = possibleValues.filter(value => region.possibleValuesForCell(this).includes(value))
        })

        return possibleValues
    }


}
state.getCell = Cell.getCell

class region{
    private cells: Cell[] = []
    id: string
    constructor(cells: {x:number,y:number}[], id: string, sum: number = 45){
        if (state.regions.find(region => region.id === id)){
            return console.error(`Region with id ${id} already exists`)
        }
        this.cells = cells.map(cell => {
            const cellFound = Cell.getCell(cell.x, cell.y)
            if (!cellFound){
                throw new Error(`Cell with coordinates ${cell.x}, ${cell.y} not found`)
            }
            cellFound.regions.push(this)
            return cellFound
        }) as Cell[]
        this.id = id
        state.regions.push(this)

    }

    possibleValuesForCell(cell: Cell){
        if (!cell.regions.includes(this)){
            throw new Error(`Cell ${cell.coordinates.x}, ${cell.coordinates.y} is not in region ${this.id}`)
        }
        const possibleValues = [1,2,3,4,5,6,7,8,9]
        this.cells.forEach(cellChecking => {
            if (cell===cellChecking) return
            if (cellChecking.values.length === 1){
                possibleValues.splice(possibleValues.indexOf(cellChecking.values[0]), 1)
            }
        })
        return possibleValues
    }

    get values(){
        const values = {}
        for (let i=1; i<10; i++){
            const cells = this.cells.filter(cell => cell.canBe(i))
            if (cells.length === 0){
                throw new Error(`No cells can be ${i} in region ${this.id}`)
            }
            values[i] = cells

        }
        return values
    }
}

const rulesetRegions = {
    soduku: ()=>{
        for (let i = 0; i<9; i++){
            const row = []
            const col = []
            for (let j = 0; j<9; j++){
                row.push({x: i+1, y: j+1})
                col.push({x: j+1, y: i+1})
            }
            new region(row, `row${i+1}`)
            new region(col, `col${i+1}`)
        }
        for (let i=0; i<9; i+=3){
            for (let j=0; j<9; j+=3){
                const square = []
                for (let k=0; k<3; k++){
                    for (let l=0; l<3; l++){
                        square.push({x: i+k+1, y: j+l+1})
                    }
                }
                new region(square, `square${(i/3)+1}-${(j/3)+1}`)
            }
        }
    }
}

export default function solve(cells: {x:number,y:number, value: number}[] = [], rules = {soduku: true}){
    state.rules = rules
    for (var i = 0; i<9; i++){
        state.grid[i] = []
        for (var j = 0; j<9; j++){

            const cellDef = cells.find(cell => cell.x == i+1 && cell.y == j+1)
            if (cellDef) {
                state.grid[i][j] = new Cell(i+1, j+1, cellDef.value)
            } else {
                state.grid[i][j] = new Cell(i+1,j+1)
            }
        }
    }
    Object.keys(state.rules).forEach(rule => {
        if (state.rules[rule]===true && rulesetRegions[rule]){
            rulesetRegions[rule]()
        }
    })
}

export { state }
