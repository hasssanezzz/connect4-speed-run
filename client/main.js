function make2dArray(r, c) {
    const result = []
    for (let i = 0; i < r; i++) result.push(new Array(c).fill(0))
    return result
}

let clientId
let gameState = 'idle' // idle | wait | on
let player
let turn = 'red'

const [ROWS, COLS] = [6, 7]
const grid = make2dArray(ROWS, COLS)
const gridDom = document.querySelector('#grid')
const turnDOM = document.querySelector('#turn')
const switchTurns = () => (turn = turn === 'red' ? 'blue' : 'red')
const renderTurn = () => (turnDOM.innerHTML = turn)
const modal = document.querySelector('main')

const toggleModal = () => modal.classList.toggle('hidden')

const setClientId = (id) => {
    clientId = id
    document.getElementById('xid').innerHTML = id
}

function render() {
    gridDom.innerHTML = ''
    renderTurn()

    for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
            const state = grid[i][j]
            gridDom.innerHTML += `<button row="${i}" col="${j}" class="cell aspect-square rounded-full ${
                state === 1 && 'bg-red-600'
            } ${state === -1 && 'bg-blue-600'} ${
                state === 0 &&
                'border-2 border-gray-500 hover:bg-gray-700 hover:border-green-500'
            }"></button>`
        }
    }

    document.querySelectorAll('.cell').forEach((btn) => {
        btn.addEventListener('click', () => {
            if (turn !== player) return
            socket.send(
                JSON.stringify({
                    action: 'move',
                    payload: +btn.getAttribute('col'),
                })
            )
            insertToColumn(+btn.getAttribute('col'))
            switchTurns()

            renderTurn()
        })
    })
}

function arrHas4(arr) {
    if (arr.length < 4) return [false, undefined]

    let sameCount = 1
    let last = arr[0]
    for (let i = 1; i < arr.length; i++) {
        if (sameCount >= 4 && last != 0) return [true, last]
        if (last == arr[i]) sameCount++
        else {
            last = arr[i]
            sameCount = 1
        }
    }
    if (sameCount >= 4 && last != 0) return [true, last]

    return [false, undefined]
}

function findWins() {
    // row
    for (let i = 0; i < ROWS; i++) {
        const row = grid[i]
        const [has4, repeatedValue] = arrHas4(row)
        if (has4) {
            declareWinner(repeatedValue)
            return
        }
    }

    // cols
    for (let i = 0; i < COLS; i++) {
        const col = []
        for (let j = 0; j < ROWS; j++) {
            col.push(grid[j][i])
        }
        const [has4, repeatedValue] = arrHas4(col)
        if (has4) {
            declareWinner(repeatedValue)
            return
        }
    }

    for (let startCol = 0; startCol < COLS; startCol++) {
        let diagonal = []
        for (let i = 0; i < Math.min(ROWS, COLS - startCol); i++) {
            diagonal.push(grid[i][startCol + i])
        }
        const [has4, repeatedValue] = arrHas4(diagonal)
        if (has4) {
            declareWinner(repeatedValue)
            return
        }
    }

    for (let startRow = 1; startRow < ROWS; startRow++) {
        let diagonal = []
        for (let i = 0; i < Math.min(ROWS - startRow, COLS); i++) {
            diagonal.push(grid[startRow + i][i])
        }
        const [has4, repeatedValue] = arrHas4(diagonal)
        if (has4) {
            declareWinner(repeatedValue)
            return
        }
    }

    for (let startCol = COLS - 1; startCol >= 0; startCol--) {
        let diagonal = []
        for (let i = 0; i < Math.min(ROWS, startCol + 1); i++) {
            diagonal.push(grid[i][startCol - i])
        }
        const [has4, repeatedValue] = arrHas4(diagonal)
        if (has4) {
            declareWinner(repeatedValue)
            return
        }
    }

    for (let startRow = 1; startRow < ROWS; startRow++) {
        let diagonal = []
        for (let i = 0; i < Math.min(ROWS - startRow, COLS); i++) {
            diagonal.push(grid[startRow + i][COLS - 1 - i])
        }
        const [has4, repeatedValue] = arrHas4(diagonal)
        if (has4) {
            declareWinner(repeatedValue)
            return
        }
    }
}

function declareWinner(winner) {
    alert((winner === 1 ? 'Red' : 'Blue') + ' has won the game!!🥳')
    setTimeout(clearBoard, 1000)
}

function clearBoard() {
    for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
            grid[i][j] = 0
        }
    }

    render()
}

function insertToColumn(col) {
    for (let j = ROWS - 1; j >= 0; j--) {
        if (grid[j][col] === 0) {
            grid[j][col] = turn === 'red' ? 1 : -1
            break
        }
    }

    render()
    findWins()
}

const form = document.querySelector('form')
form.addEventListener('submit', (e) => {
    e.preventDefault()

    form.classList.toggle('hidden')
    const formData = new FormData(e.target)

    // TODO use client id to be able to join games with friends
    const [nickname, clientId] = [
        formData.get('nickname'),
        formData.get('clientId'),
    ]

    socket.send(
        JSON.stringify({
            action: 'join',
            payload: nickname || '',
        })
    )

    gameState = 'wait'
    form.classList.add('hidden')
    document.querySelector('#wait').classList.remove('hidden')
})

const socket = new WebSocket('/')
socket.onmessage = (msg) => {
    const json = JSON.parse(msg.data)
    const { action, payload } = json

    if (action === 'clientId') setClientId(payload)
    else if (action === 'join') {
        modal.classList.add('hidden')
        player = payload
        json.nickname &&
            (document.getElementById('op').innerHTML = json.nickname)
        document.getElementById('player').innerHTML = player.toUpperCase()
        render()
    } else if (action === 'move') {
        insertToColumn(+payload)
        switchTurns()
        render()
    } else if (action === 'close') {
        form.classList.remove('hidden')
        document.getElementById('wait').classList.add('hidden')
        toggleModal()
        alert('opponent has left the game 😢')
    }
}

document.getElementById('exit').onclick = () => {
    socket.send(JSON.stringify({action: 'exit'}))
    form.classList.remove('hidden')
    document.getElementById('wait').classList.add('hidden')
    toggleModal()
}
