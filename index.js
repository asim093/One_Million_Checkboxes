import http from "node:http"
import path from "node:path";
import { publisher, subscriber, redis } from './redis-connection.js'

import express from 'express'
import { Server } from "socket.io";


const checkboxes_count = 1000000
const checkbox_key = "checkbox-state:v2"

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
            const existing_state = await redis.get(checkbox_key)
            const lastOperationTime = await redis.get(`rate-limiting:${socket.id}`);

            if (lastOperationTime) {
                const timeElapsed = Date.now() - lastOperationTime;
                if (timeElapsed < 5.5 * 1000) {
                    socket.emit("server:error", { error: "Please wait!" })
                    return
                }
            }
            await redis.set(`rate-limiting:${socket.id}`, Date.now());

            if (existing_state) {
                const rawData = JSON.parse(existing_state);
                rawData[data.index] = data.checked
                await redis.set(checkbox_key, JSON.stringify(rawData))
            } else {
                await redis.set(checkbox_key, JSON.stringify(new Array(checkboxes_count).fill(false)))
            }
            await publisher.publish("checkbox:change", JSON.stringify(data))
        })
    })


    app.get('/health', (_, res) => {
        return res.json({ healthy: true })
    })


    app.get("/callback", (req, res) => {
        res.sendFile(path.resolve("public/callback.html"));
    });

    app.get('/checkboxes', async (req, res) => {
        const existingState = await redis.get(checkbox_key);
        if (existingState) {
            const rawData = JSON.parse(existingState);
            return res.json({ checkboxes: rawData })
        }
        return res.json({ checkboxes: new Array(checkboxes_count).fill(false) });
    })

    server.listen(port, () => {
        console.log(`server is running on http://localhost:${port}`)
    })
}

main();