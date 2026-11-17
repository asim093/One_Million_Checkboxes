import http from "node:http"
import path from "node:path";
import { publisher, subscriber, redis } from './redis-connection.js'

import express from 'express'
import { Server } from "socket.io";


const checkboxes_count = 1000000
const checkbox_key = "checkbox-bitmap:v1"
const rate_limit_ms = 5000

async function main() {
    const app = express();
    const server = http.createServer(app);
    const port = process.env.PORT ?? 5000;
    const io = new Server()
    io.attach(server)

    await subscriber.subscribe('checkbox:change')
    subscriber.on('message', (channel, message) => {
        if (channel === 'checkbox:change') {
            const { index, checked } = JSON.parse(message);
            io.emit("server:checkbox:change", { index, checked });
        }
    })

    app.use(express.static(path.resolve('./public')));
    app.use(express.json());


    app.post('/api/logout', (req, res) => {
        res.json({ message: "Logged out successfully" });
    });

    app.get('/api/user', (req, res) => {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: "No token" });
        }
        res.json({ authenticated: true, token });
    });


    io.on('connection', (socket) => {
        console.log(`Socket Id ${socket.id}`)
        socket.on("client:checkbox:change", async (data) => {
            const index = data?.index
            if (!Number.isInteger(index) || index < 0 || index >= checkboxes_count) return
            const checked = Boolean(data.checked)

            const allowed = await redis.set(`rate-limiting:${socket.id}`, 1, 'PX', rate_limit_ms, 'NX')
            if (!allowed) {
                const current = await redis.getbit(checkbox_key, index)
                socket.emit("server:error", { error: `Slow down! You can tick one checkbox every ${(rate_limit_ms / 1000).toFixed(1)}s.`, index, checked: current === 1 })
                return
            }

            await redis.setbit(checkbox_key, index, checked ? 1 : 0)
            await publisher.publish("checkbox:change", JSON.stringify({ index, checked }))
        })
    })


    app.get('/health', (_, res) => {
        return res.json({ healthy: true })
    })


    app.get("/callback", (req, res) => {
        res.sendFile(path.resolve("public/callback.html"));
    });

    app.get('/checkboxes', async (req, res) => {
        const stored = (await redis.getBuffer(checkbox_key)) ?? Buffer.alloc(0)
        const bitmap = Buffer.alloc(Math.ceil(checkboxes_count / 8))
        stored.copy(bitmap, 0, 0, bitmap.length)
        return res.json({ count: checkboxes_count, bitmap: bitmap.toString('base64') })
    })

    server.listen(port, () => {
        console.log(`server is running on http://localhost:${port}`)
    })
}

main();