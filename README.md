# One Million Checkbox Project

A real-time, multiplayer checkbox grid. Tick a box in one browser tab and it updates instantly in every other connected tab.

Built with **Node.js**, **Express**, **Socket.IO** and **Redis/Valkey**.

## Features

- Real-time sync across all connected clients via WebSockets
- Shared state stored in Redis/Valkey, so it survives server restarts
- Redis Pub/Sub for broadcasting changes
- Simple per-user rate limiting (one change every 5.5 seconds)
- Health check endpoint


## Tech Stack

| Part      | Technology                         |
| --------- | ---------------------------------- |
| Server    | Node.js (ES modules), Express 5    |
| Real-time | Socket.IO                          |
| Storage   | Valkey (Redis-compatible), ioredis |
| Dev tools | nodemon, Docker Compose            |

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (to run Valkey/Redis)

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start Valkey** (make sure Docker Desktop is running first)

   ```bash
   docker compose up -d
   ```

3. **Start the server**

   ```bash
   npm run dev
   ```

4. Open <http://localhost:5000> in two browser tabs and start clicking.

## Configuration

All settings are optional environment variables.

| Variable     | Default     | Description            |
| ------------ | ----------- | ---------------------- |
| `PORT`       | `5000`      | Port the server uses   |
| `REDIS_HOST` | `localhost` | Redis/Valkey host      |
| `REDIS_PORT` | `6379`      | Redis/Valkey port      |

## API

| Method | Endpoint       | Description                         |
| ------ | -------------- | ----------------------------------- |
| GET    | `/checkboxes`  | Current state of all checkboxes     |
| GET    | `/health`      | Health check (`{ "healthy": true }`) |
| GET    | `/api/user`    | Returns the bearer token, if any    |
| POST   | `/api/logout`  | Logout stub                         |

### Socket.IO events

| Event                       | Direction        | Payload                     |
| --------------------------- | ---------------- | --------------------------- |
| `client:checkbox:change`    | client → server  | `{ index, checked }`        |
| `server:checkbox:change`    | server → clients | `{ index, checked }`        |
| `server:error`              | server → client  | `{ error }` (e.g. rate limit) |

## Project Structure

```
.
├── index.js              # Express + Socket.IO server
├── redis-connection.js   # Redis/Valkey clients (main, publisher, subscriber)
├── docker-compose.yml    # Valkey container
└── public/               # Frontend (index.html, callback.html)
```

## Troubleshooting

**`[ioredis] ... ECONNREFUSED` when starting the server**
Redis/Valkey isn't running. Start Docker Desktop, then run `docker compose up -d`.

## License

ISC
