import Redis from 'ioredis';

function createRedisConnection(name) {
    const client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379
    })
    client.on('error', (err) => {
        console.error(`[redis:${name}] ${err.code || err.message} - is Redis/Valkey running? (docker compose up -d)`)
    })
    return client
}
export const redis = createRedisConnection('main');
export const publisher = createRedisConnection('publisher');
export const subscriber = createRedisConnection('subscriber');
