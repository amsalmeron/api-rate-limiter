import { createClient } from 'redis'
import dotenv from 'dotenv'

dotenv.config()

// Create Redis client
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
})

// Error handling
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err)
})

redisClient.on('connect', () => {
  console.log('✅ Connected to Redis')
})

// Connect to Redis
await redisClient.connect()

export default redisClient
