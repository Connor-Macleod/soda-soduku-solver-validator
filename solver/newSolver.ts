const initialState = {
    rules: {},
    grid: [] as Cell[][],
    regions: [] as region[],
    getCell: null,
    history: [] as string[],
    limitSteps: false,
    totalSteps: 0,
    stepsRemaining: 0,
}

let state = {} as typeof initialState

function highlightCells(targets, defaultHighlightString = `--<$1>--`, defaultString = '$1') {


    targets = targets.map(target => {
        if (target instanceof Cell){
            return {cell: target, highlight: defaultHighlightString}
        } else {
            return target
        }
    })

    const grid = state.grid.map(row=>row.map(cell=>{
        const target = targets.find(target=>target.cell.is(cell))
        if (target){
            return target.highlight.replace('$1',cell.possibleValues.join(','))
        } else {
            return defaultString.replace('$1',cell.possibleValues.join(','))
        }
    }))
    grid.forEach(row=>row.unshift(''))
    grid.unshift(['','','','','','','','','',''])
    console.table(grid)
}
initialState.highlightCells = highlightCells

let stopped = false
let frozenGrid = null
let frozenHistory = null

function stop() {
    console.log('stopping')
    frozenGrid = state.grid.map(row => row.map(cell => cell.clone()))
    stopped = true
    state.grid = frozenGrid

    frozenHistory = state.history.map(item => ({...item}))
}

let last = 0
class Cell {

    readonly x: number
    readonly y: number

    get dom() {
        return this.ref.value.parentNode
    }

    possibleValues: number[]
    regions: region[] = []
    interactions: Cell[] = []
    history: string[] = []
    readonly initValue = 0
    ref: null
    matches: Cell[] = []
    color = []

    clone() {
        const cell = new Cell(this.x, this.y, undefined, true)
        cell.possibleValues = [...this.possibleValues]
        cell.history = [...this.history]
        cell.color = this.color
        return cell
    }

    is(value, y) {
        if (value instanceof Cell) {
            return (this.x === value.x && this.y === value.y)
        }
        if (y) {
            return this.x === value && this.y === y
        }
        if (Array.isArray(value)) {
            return value.every(val => this.possibleValues.includes(val))
        }
        return this.possibleValues.length === 1 && this.possibleValues[0] === value

    }

    toString() {
        return `${this.x},${this.y}(${this.possibleValues.join(',')})`
    }

    constructor(x, y, value?, clone = false) {
        this.x = x;
        this.y = y;
        if (!clone) {
            state.grid[x - 1] = state.grid[x - 1] || [];
            state.grid[x - 1][y - 1] = this;
        }
        this.possibleValues = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        if (value) {
            this.setValue(value);
            this.initValue = value
        }
    }

    initInteractions() {
        const allCells = new Set()
        this.regions.forEach(region => {
            region.cells.forEach(cell => {
                if (cell !== this) allCells.add(cell)
            })
        })
        this.interactions = [...allCells]
    }

    removePossibleValue(value, reason) {
        if (stopped) return
        if (state.limitSteps){
            if (state.stepsRemaining<=0){
                stop()
            }
        }
        if (stopped) return
        if (this.initValue && this.initValue === value) {
            console.error(`removing value ${value} from cell ${this.x}, ${this.y} that started with ${this.initValue} and therefore shouldn't be removed`)
            return stop();
        }
        if (stopped) return
        if (this.possibleValues.length === 1 && this.possibleValues[0] === value) {
            console.error(`removing last possible value (${value}) from cell ${this.x},${this.y}`)
            return stop()
        }
        if (this.possibleValues.includes(value)) {
            this.addHistory(reason)
            this.possibleValues = this.possibleValues.filter(v => v !== value);
            state.stepsRemaining--;
        }


        this.matches.forEach(cell=>{
            if (cell.possibleValues.includes(value)) {
                cell.removePossibleValue(value, reason)
            }
        })
    }

    identicalCells(otherCell){
        // we do a lot of redundant recursion here, to ensure it all stays in sync
        if (otherCell === this) return
        if (this.matches.includes(otherCell)) return

        this.matches.push(otherCell)

        this.matches.forEach(cell=>{
            cell.identicalCells(otherCell)
        })
        otherCell.identicalCells(this)
    }

    findIdenticalCells(){
        this.regions.forEach(region=>{
            const matches = region.cells.filter(cell=> cell.possibleValues.find(value=>this.possibleValues.includes(value)))
            const allValues = [...new Set(matches.map(cell=>cell.possibleValues).flat())]
            if (matches.length !== allValues.length || matches.length<=2) return
            let regions = [...new Set(matches.map(cell=>cell.regions).flat())]
            matches.map(cell=>{
                if (cell===this) {
                    cell.regions.forEach(region=>{
                        regions.splice(regions.indexOf(region),1)
                    })
                } else {
                    regions = regions.filter(region=>cell.regions.includes(region))
                }
            })
            if (!regions.length) return
            regions.forEach(region=>{
                region.cells.forEach(cell=>{
                    if (cell===this) return
                    if (cell.possibleValues.length !== this.possibleValues.length) return
                    if (!cell.possibleValues.every(value=>this.possibleValues.includes(value))) return


                    const theRegion =
                        this.regions.find(region=>{
                            if (! matches.every(match=>match.regions.includes(region))) return false
                            return true
                        })

                    const highlights = [cell, ...matches, ...theRegion.cells].map(thisCell=>{
                        let highlight = '$1'
                        if (thisCell===cell) highlight = highlight.replace('$1',`===$1===`)
                        if (thisCell===this) highlight = highlight.replace('$1',`===$1===`)
                        if (matches.includes(thisCell)) highlight = highlight.replace('$1',`<$1>`)
                        if (theRegion.cells.includes(thisCell)) highlight = highlight.replace('$1',`$1*`)

                        return {
                            cell: thisCell,
                            highlight
                        }
                    })

                    this.identicalCells(cell)
                })
            })
        })

    }

    addHistory(reason) {
        if (stopped) return
        if (reason.target && !Array.isArray(reason.target)) {
            reason.target = [reason.target]
        }
        if (reason.target && !Array.isArray(reason.from)) {
            reason.from = [reason.from]
        }
        const lastItem = this.history[this.history.length - 1]
        if (lastItem && lastItem.value === reason.value && lastItem.reason === reason.reason && lastItem.region === reason.region) {
            lastItem.target = [...lastItem.target, ...reason.target]
        } else {
            state.history.push(reason)
        }
        if (reason.target)
            reason.target = reason.target.map(cell => cell.clone())
        if (reason.from)
            reason.from = reason.from.map(cell => cell.clone())

        this.history.push(reason)
    }

    static getCell(x, y) {
        return state.grid[x - 1][y - 1];
    }

    setValue(value, reason?) {
        if (stopped) return
        if (state.limitSteps && reason){
            if (state.stepsRemaining<=0){
                stop()
            }
        }

        if (stopped) return

        if (this.possibleValues.length === 1 && this.possibleValues[0] === value) {
            return
        }
        if (this.initValue) {
            console.error(`setting value ${value} on cell ${this.x}, ${this.y} that started with ${this.initValue} and therefore shouldn't be changed`)
            return stop();
        }
        if (!this.possibleValues.includes(value)) {
            console.warn(`setting value ${value} on cell ${this.x}, ${this.y} that doesn't contain it`)
        }
        if (reason) {
            this.addHistory(reason)
            state.stepsRemaining--;
        }
        this.possibleValues = [value];
        this.history.push(`set ${value}`)


        this.matches.forEach(cell=>{
            if (cell.possibleValues.includes(value)) {
                cell.setValue(value, reason)
            }
        })
    }

    updateValues() {
        this.findIdenticalCells()
        this.ywing()
        this.xychain()
    }


    chainStep(previousValue?, chain?, mustBeStrongLink = false) {
        if (stopped) return
        if (!(this.possibleValues.length === 2)) return
        if (chain && chain.find(item => item.cell===this)) return
        const [valueA, valueB] = this.possibleValues


        let nextValue
        if (previousValue && chain){
            nextValue = previousValue === valueA ? valueB : valueA
        } else if (previousValue) {
            chain = []
            nextValue = previousValue === valueA ? valueB : valueA
        } else {
            chain = []
            nextValue = valueB
            previousValue = valueA
            this.chainStep(nextValue)
        }


        chain.push({cell: this, valueA: previousValue, valueB: nextValue})


        if (chain?.length>=3){
            this.testXYchain(chain)
        }


        const nextCells = this.interactingPairs(nextValue).filter(cell => {
            const sharedRegions = cell.regions.filter(region => this.regions.includes(region))
            const strongLink = sharedRegions.find(region => region.values[nextValue].length === 2)
            if (mustBeStrongLink && !strongLink) return false
            return true
        })


        if (!nextCells.length) return
        nextCells.forEach(cell => {
            if (cell === this) return
            if (cell.matches.includes(this)) return
            const sharedRegions = cell.regions.filter(region => this.regions.includes(region))
            const strongLink = sharedRegions.find(region => region.values[nextValue].length === 2)
            const nextChain = [...chain]
            cell.chainStep(nextValue, nextChain, !strongLink)
        })
        /*




         */
    }

    testXYchain(chain) {
        if (stopped) return
        //if the chain has an even count of items, we can't tell much from it, so just return
        let targetValue
        const cell1 = chain[0].cell
        const cell2 = chain[chain.length - 1].cell

        const valueA1 = chain[0].valueA
        const valueB1 = chain[0].valueB
        const valueA2 = chain[chain.length - 1].valueA
        const valueB2 = chain[chain.length - 1].valueB
            if (valueA1 === valueB2) {
                targetValue = valueA1
            }
            if (valueA2 === valueB1) {
                //targetValue = valueA2
            }


        if (!targetValue) return

            if(chain[0]?.cell?.is(9,6) && chain[chain.length - 1]?.cell?.is(7,8) && targetValue===5){
                debugger
            }

            const targetCells = cell1.interactions.filter(cell => cell.possibleValues.includes(targetValue) && cell.interactions.includes(cell2) && !chain.find(item => item.cell === cell))
            if (!targetCells.length) return
            const highlights = [...targetCells.map(cell => ({
                cell: cell,
                highlight: `\\$1// <${targetValue}>`
            })), ...chain.map((item, index) => (index === 0 || index === chain.length - 1) ? {
                cell: item.cell,
                highlight: `[${index+1}]!!!$1!!!`
            } : {cell: item.cell, highlight: `[${index+1}]<<<$1>>>`})]
            highlightCells(highlights)
            console.log(highlights)
            console.log(targetValue, chain, targetCells)
            targetCells.forEach(targetCell => {
                targetCell.removePossibleValue(targetValue, {
                    reason: 'xychain removal',
                    from: chain.map(item => item.cell),
                    value: targetValue,
                    target: targetCell
                })
            })
    }

    xychain() {
        this.chainStep() //if this works we can rename
    }

    continueChain(valueA, chain, depth) {
        if (!(this.possibleValues.length === 2)) return
        let valueB = this.possibleValues.find(value => value !== valueA)
        if (depth > 0) {
            [valueA, valueB] = [valueB, valueA]
        }
        if (chain.find(cell => cell.cell === this)) return
        chain.push({cell: this, valueA, valueB, linked: false, depth})
    }

    interactingPairs(value?, secondValue?, both?) {
        return this.interactions.filter(cell => {
            if (!cell.possibleValues.length === 2) return false
            if (value && !cell.possibleValues.includes(value)) return false
            if (secondValue && !cell.possibleValues.includes(secondValue)) return false
            if (both && value && secondValue && !cell.possibleValues.includes(value) && !cell.possibleValues.includes(secondValue)) return false
            return true
        })
    }

    ywing() {

        if (this.possibleValues.length !== 2) return
        const [valueA, valueB] = this.possibleValues
        this.regions.forEach(regionA => {
            regionA.values[valueA].forEach(cellA => {
                if (cellA === this || cellA.possibleValues.length !== 2) return
                const valueC = cellA.possibleValues.find(value => value !== valueA && value !== valueB)
                if (!valueC) return
                this.regions.forEach(regionB => {
                    if (regionB === regionA) return
                    regionB.values[valueB].forEach(cellB => {
                        if (cellB === this || cellB.possibleValues.length !== 2 || !cellB.possibleValues.includes(valueC)) return
                        if (cellB.possibleValues.filter(celBValue => cellA.possibleValues.includes(celBValue)).length !== 1) return
                        const ywing = [this, cellA, cellB]
                        const interactions = cellA.interactions.filter(interaction => cellB.interactions.includes(interaction) && !ywing.includes(interaction))
                        interactions.forEach(interaction => {
                            if (interaction.possibleValues.includes(valueC)) {
                                // console.log(`removing ${valueC} from ${interaction.x},${interaction.y} because of ywing in ${this.x},${this.y}(${this.possibleValues.join(',')}), looking at ${cellA.x},${cellA.y}(${cellA.possibleValues.join(',')}) and ${cellB.x},${cellB.y}(${cellB.possibleValues.join(',')})`)
                                interaction.removePossibleValue(valueC, {
                                    from: ywing,
                                    value: valueC,
                                    target: interaction,
                                    reason: 'ywing removal'
                                })
                            }
                        })
                    })
                })
            })
        })
    }
}

initialState.getCell = Cell.getCell;

class region {
    cells: Cell[]
    id: string
    sum: number
    group: region[] = []

    values: Cell[][] = []

    constructor(cells, id, group, sum = 45) {
        state.regions.push(this)
        this.cells = cells.map(cell => Cell.getCell(cell.x, cell.y));
        this.id = id;
        this.sum = sum;
        this.cells.forEach(cell => cell.regions.push(this))
        this.group = group
        this.group.push(this)

        this.updateValues()
    }


    toString() {
        return this.id
    }

    get solved() {
        return this.values.every(value => value.length === 1)
    }

    updateValues() {
        for (let i = 1; i < 10; i++) {
            this.values[i] = this.cells.filter(cell => cell.possibleValues.includes(i))
            const singleValue = this.values[i].find(cell => cell.possibleValues.length === 1)
            if (singleValue) {
                this.values[i] = [singleValue]
            }
        }


        this.updateCells()
        this.findMultiples()
        this.findIntersections()
        this.chain()
        this.xwing()
        this.swordfish()
    }

    updateCells() {
        this.values.forEach((value, index) => {
            if (!value) return
            if (value.length === 1) {
                const cell = value[0]
                cell.setValue(index, {
                    region: this.id,
                    from: cell,
                    value: index,
                    target: cell,
                    reason: 'only possible location for value in region'
                })
                this.cells.forEach(cellChecking => {
                    if (cellChecking === cell) return
                    cellChecking.removePossibleValue(index, {
                        region: this.id,
                        from: cell,
                        value: index,
                        target: cellChecking,
                        reason: 'value in region'
                    })
                })
            }
        })
    }

    findMultiples() {
        const multiples = []
        this.cells.forEach(cell => {
            const values = cell.possibleValues
            if (values.length === 1) return // we don't care about singles
            if (values.length > 5) return // we could handle large, but probably not worth the computation of going over 5
            const multiple = this.cells.filter(cellChecking =>
                cellChecking.possibleValues.every(value => values.includes(value)))

            if (multiple.length === values.length) {
                multiples.push(multiple)
                this.cells.forEach(cellChecking => {
                    if (multiple.includes(cellChecking)) return
                    values.forEach(value => {
                        cellChecking.removePossibleValue(value, {
                            region: this.id,
                            from: cell,
                            value: value,
                            target: cellChecking,
                            reason: 'value in region'
                        })
                    })
                })
            }
        })

        return multiples
    }

    findIntersections() {
        this.values.forEach((cells, value) => {
            if (!cells.length) return console.log("no cells", cells, value, this.id)
            const matchingRegion = cells[0].regions.find(region => {
                if (region === this) return false
                return cells.every(cell => cell.regions.includes(region))
            })
            if (matchingRegion) {
                const matchingCells = matchingRegion.cells
                matchingCells.forEach(cell => {
                    if (!cells.includes(cell)) {
                        cell.removePossibleValue(value, {
                            region: this.id,
                            from: cells,
                            value: value,
                            target: cell,
                            reason: 'intersection removal'
                        })
                    }
                })
            }
        })
        this.cells.forEach(cell => {
            if (cell.possibleValues.length === 2) {
                const [valueA, valueB] = cell.possibleValues
                const cellsA = this.values[valueA].filter(filterCell =>
                    cell !== filterCell && filterCell.possibleValues.length === 2
                )
                const cellsB = this.values[valueB].filter(filterCell =>
                    cell !== filterCell && filterCell.possibleValues.length === 2
                )
                const secondValuesA = cellsA.map(cellA => cellA.possibleValues.find(value => value !== valueA))
                const secondValuesB = cellsB.map(cellB => cellB.possibleValues.find(value => value !== valueB))
                cellsA.forEach(cellA => {
                    const secondValueA = cellA.possibleValues.find(value => value !== valueA)
                    if (!secondValuesB.includes(secondValueA)) return
                    const cellB = cellsB.find(cellB => cellB.possibleValues.includes(secondValueA))
                    const trio = [cell, cellA, cellB]
                    if (cell === cellA || cell === cellB || cellA === cellB) return
                    const trioValues = [valueA, valueB, secondValueA]
                    this.cells.forEach(cellChecking => {
                        if (trio.includes(cellChecking)) return
                        trioValues.forEach(value => {
                            cellChecking.removePossibleValue(value,
                                {
                                    region: this.id,
                                    from: trio,
                                    value: value,
                                    target: cellChecking,
                                    reason: 'triple removal'
                                }
                            )
                        })
                    })

                })
            }
        })
    }

    chain() {
        let once = false
        this.values.forEach((cells, value) => {
            if (once) return
            const id = Math.floor(Math.random() * 100)
            if (cells.length !== 2) return
            const red = []
            const blue = []
            red.push(cells[0])
            blue.push(cells[1])
            this.continueChain(value, cells[0], red, blue)
            this.continueChain(value, cells[1], blue, red)
            if (red.length < 2 || blue.length < 2) return
            if (this.evaluateTwiceInChain(red, blue, value)) return
            else
                once = true
            if (this.evaluateTwiceInChain(blue, red, value)) return
            else
                once = true
            this.evaluateChainSharedRegion(red, blue, value)
            red.forEach(cell => {
                cell.color.push(`red-${id}`)
            })
            blue.forEach(cell => {
                cell.color.push(`blue- ${id}`)
            })
        })
    }

    continueChain(value, cell, matchList, diffList) {
        cell.regions.forEach(region => {
            if (region.values[value].length === 2) {
                const otherCell = region.values[value].find(findCell => findCell !== cell)
                if (!diffList.includes(otherCell)) {
                    diffList.push(otherCell)
                    this.continueChain(value, otherCell, diffList, matchList)
                }
            }
        })
    }

    evaluateTwiceInChain(red, blue, value) {
        let blueIsValue = false
        const regions = []
        red.forEach(cell => {
            cell.regions.forEach(region => {
                if (regions.includes(region)) blueIsValue = true
                else regions.push(region)
            })
        })

        if (blueIsValue) {
            blue.forEach(cell => {
                cell.setValue(value, {region: this.id, from: red, value: value, target: cell, reason: 'chain removal'})
            })
            return true
        }
    }

    evaluateChainSharedRegion(red, blue, value) {
        red.forEach(cellRed => {
            blue.forEach(cellBlue => {
                const intersection = cellRed.interactions.filter(cell => cellBlue.interactions.includes(cell))
                intersection.forEach(cell => {
                    cell.removePossibleValue(value, {
                        region: this.id,
                        from: [cellRed, cellBlue],
                        value: value,
                        target: cell,
                        reason: 'chain shared removal'
                    })
                })

            })

        })
    }

    swordfish() {
        this.values.forEach((cells, value) => {
            if (cells.length !== 2) return
            const [cellA, cellB] = cells
            const regionsA = cellA.regions.filter(region => region !== this && !cellB.regions.includes(region))
            if (!regionsA.length) return
            const regionsB = cellB.regions.filter(region => region !== this && !cellA.regions.includes(region))
            if (!regionsB.length) return
            regionsA.forEach(regionA => {
                const cellsA2 = regionA.values[value]
                if (regionA.values[value].length === 1) return
                regionsB.forEach(regionB => {
                    const cellsB2 = regionB.values[value]
                    if (cellsB2.length === 1) return
                    cellsA2.forEach(cellA2 => {
                        if (cellA2 === cellA || cellA2 === cellB) return
                        const regionsA2 = cellA2.regions.filter(region => region !== regionA && region !== this && region !== regionB && region.values[value].length === 2)
                        if (!regionsA2.length) return
                        cellsB2.forEach(cellB2 => {
                            if (cellB2 === cellA || cellB2 === cellB) return
                            if (cellA2 === cellB2) return

                            const regionsB2 = cellB2.regions.filter(region => region !== regionB && region !== this && region !== regionA && region.values[value].length === 2)
                            if (!regionsB2.length) return
                            regionsA2.forEach(regionA2 => {
                                if (regionA2 === regionA) return
                                if (regionA2 === regionB) return
                                if (regionA2 === this) return
                                if (regionsB2.includes(regionA2)) return
                                if (regionA2.values[value].length !== 2) return
                                const cellC = regionA2.values[value].find(cell => cell !== cellA && cell !== cellB)
                                if (!cellC) return
                                if (cellC === cellA2 || cellC === cellB2) return
                                if (cellC === cellA || cellC === cellB) return
                                regionsB2.forEach(regionB2 => {
                                    if (regionB2 === regionA) return
                                    if (regionB2 === regionB) return
                                    if (regionB2 === this) return
                                    if (regionsA2.includes(regionB2)) return
                                    if (regionB2.values[value].length !== 2) return
                                    const cellD = regionB2.values[value].find(cell => cell !== cellA && cell !== cellB)
                                    if (!cellD) return
                                    if (cellD === cellA2 || cellD === cellB2) return
                                    if (cellD === cellA || cellD === cellB) return
                                    if (cellD === cellC) return
                                    const regionC = cellC.regions.find(regionC => cellD.regions.includes(regionC) && regionC !== regionA && regionC !== regionB && regionC !== regionA2 && regionC !== regionB2 && regionC !== this)
                                    if (!regionC) return
                                    const swordfish = [cellA, cellB, cellA2, cellB2, cellC, cellD]
                                    const regions = [regionA, regionB, regionC]
                                    regions.forEach(reg => reg.values[value].forEach(regionACell => {
                                        if (swordfish.includes(regionACell)) return
                                        regionACell.removePossibleValue(value, {
                                            region: this.id,
                                            from: swordfish,
                                            value: value,
                                            target: regionACell,
                                            reason: 'swordfish removal'
                                        })
                                    }))
                                })

                            })
                        })
                    })

                })
            })
        })
    }

    xwing() {
        this.values.forEach((cells, value) => {
            if (cells.length === 2) {
                const [cellA, cellB] = cells
                const cellARegions = cellA.regions.filter(region => region !== this)
                const cellBRegions = cellB.regions.filter(region => region !== this)
                cellARegions.forEach(regionA => {
                    regionA.values[value].forEach(regionACells => {
                        regionACells.regions.forEach(regionC => {
                            if (regionC === this) return
                            if (regionC.values[value].length !== 2) return
                            const [cellC, cellD] = regionC.values[value]
                            if (cellC === cellA || cellC === cellB || cellD === cellA || cellD === cellB) return
                            const regionB = cellBRegions.find(findRegionB => findRegionB.cells.includes(cellD))
                            if (!regionB) return
                            const xwing = [cellA, cellB, cellC, cellD]
                            if (xwing.find(cell => cell.possibleValues.length !== 2)) return
                            const xwingRegions = [this, regionA, regionB, regionC]
                            xwingRegions.forEach(region => {
                                region.values[value].forEach(regionCell => {
                                    if (!xwing.includes(regionCell)) {
                                        regionCell.removePossibleValue(value, {
                                            region: this.id,
                                            from: xwing,
                                            value: value,
                                            target: regionCell,
                                            reason: 'xwing removal'
                                        })
                                    }
                                })
                            })
                        })
                    })
                })

            }
        })
    }

}


const rulesetRegions = {
    soduku: () => {
        console.log('soduku ruleset')
        const rows = []
        const cols = []
        const squares = []
        for (let i = 0; i < 9; i++) {
            const row = []
            const col = []
            for (let j = 0; j < 9; j++) {
                row.push({x: i + 1, y: j + 1})
                col.push({x: j + 1, y: i + 1})
            }
            new region(row, `row${i + 1}`, rows)
            new region(col, `col${i + 1}`, cols)
        }
        for (let i = 0; i < 9; i += 3) {
            for (let j = 0; j < 9; j += 3) {
                const square = []
                for (let k = 0; k < 3; k++) {
                    for (let l = 0; l < 3; l++) {
                        square.push({x: i + k + 1, y: j + l + 1})
                    }
                }
                new region(square, `square${(i / 3) + 1}-${(j / 3) + 1}`, squares)
            }
        }
    }
}

function initGrid(startingCells) {
    if (state.grid.length !== 0) {
        console.warn('Grid already initialized')
        return
    }
    for (var i = 0; i < 9; i++) {
        for (var j = 0; j < 9; j++) {
            const cellDef = startingCells.find(cell => cell.x == i + 1 && cell.y == j + 1)
            if (cellDef) {
                new Cell(i + 1, j + 1, cellDef.value)
            } else {
                new Cell(i + 1, j + 1)
            }
        }
    }
    Object.keys(state.rules).forEach(rule => {
        if (state.rules[rule] === true && rulesetRegions[rule]) {
            rulesetRegions[rule]()
        }
    })
    state.grid.forEach(row => row.forEach(cell => cell.initInteractions()))
}

export default function solve(cells: { x: number, y: number, value: number }[] = [], rules = {soduku: true}, totalSteps) {
    Object.keys(initialState).forEach(key => {
        if (Array.isArray(initialState[key])) {
            state[key] = [...initialState[key]]
            return
        }
        state[key] = initialState[key]
    })
    stopped = false
    if (totalSteps){
        state.limitSteps = true;
        state.totalSteps = totalSteps;
        state.stepsRemaining = totalSteps;
    }
    state.rules = rules
    initGrid(cells)
    let lastHistoryLength = state.history.length - 1 // we always guarantee one run
    let solved = false
    let iteration = 0
    while (lastHistoryLength !== state.history.length && !solved && !stopped) {
        console.log('solve iteration', ++iteration, solved)
        lastHistoryLength = state.history.length


        state.regions.forEach(region => region.updateValues())
        console.log('regions updated')
        state.grid.forEach(row => row.forEach(cell => cell.updateValues()))
        console.log('cells updated')

        if (state.regions.find(region => !region.solved))
            solved = false
        else {
            console.log('solved')
            solved = true
        }
        console.log(lastHistoryLength, state.history.length, solved)

    }
    if (stopped) {
        console.log('stopped')
        state.grid = frozenGrid
        state.history = frozenHistory
    }
    console.log('ended', state)
}

export {state}
