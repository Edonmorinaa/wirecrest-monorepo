import { ConnectionOptions } from "bullmq";
import IORedis from "ioredis";

export const redisConnection: ConnectionOptions = {
    host: process.env.REDIS_HOST,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    port: parseInt(process.env.REDIS_PORT ?? "6379")
}