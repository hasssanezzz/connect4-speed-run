import express from 'express'
import http from 'http'
import { WebSocketServer } from 'ws'

const app = express()
const port = process.env.PORT || 3000

const server = http.createServer(app)
const wss = new WebSocketServer({ server })

const clients = new Map()
const games = new Map()
const queue = []

const utils = {
    joinGame(a, b) {
        games.set(a, b)
        games.set(b, a)
    },
    deleteGame(a, b) {
        games.delete(a)
        games.delete(b)
    },
    removeClient(address) {
        // notify the opponent
        if (games.has(address)) {
            clients
                .get(games.get(address))
                .send(JSON.stringify({ action: 'close' }))
            games.delete(address)
            games.forEach((val, key) => {
                if (val === address) games.delete(key)
            })
        }

        if (clients.has(address)) clients.delete(address)

        const addressIndexInQueue = queue.indexOf(address)
        if (addressIndexInQueue !== -1) delete queue[addressIndexInQueue]
    },
}

wss.on('connection', (ws, req) => {
    const address = req.socket.remoteAddress + ':' + req.socket.remotePort

    clients.set(address, ws)

    ws.send(
        JSON.stringify({
            action: 'clientId',
            payload: address,
        })
    )

    ws.on('message', (message) => {
        const { action, payload } = JSON.parse(message)

        if (action === 'join') {
            let nickname = payload

            // set nickname
            if (nickname.length) ws.nickname = nickname
            clients.set(address, ws)

            if (queue.length) var clientId = queue.pop()
            else return queue.push(address)

            const turn = Math.random() > 0.5
            clients.get(clientId).send(
                JSON.stringify({
                    action: 'join',
                    payload: turn ? 'red' : 'blue',
                    nickname,
                })
            )
            ws.send(
                JSON.stringify({
                    action: 'join',
                    payload: !turn ? 'red' : 'blue',
                    nickname: clients.get(clientId)?.nickname,
                })
            )
            utils.joinGame(address, clientId)
        } else if (action === 'move') {
            if (games.has(address) && clients.has(games.get(address)))
                clients.get(games.get(address)).send(
                    JSON.stringify({
                        action: 'move',
                        payload,
                    })
                )
        } else if (action === 'exit') {
            utils.removeClient(address)
        }
    })

    ws.on('close', () => {
        utils.removeClient(address)
        console.log(`Client ${address} disconnected`)
    })
})

app.use(express.static('./public'))

app.get('/', (req, res) => {
    res.send('Hello World!')
})

// Start the server
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
})
