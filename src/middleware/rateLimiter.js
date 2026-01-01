import redisClient from '../config/redis.js'
import {
  calculateTokens,
  calculateRefillRate,
  canProceed,
  timeUntilNextToken,
} from '../utils/tokenBucket.js'

/**
 * Rate limiting middleware using token bucket algorithm
 * Checks Redis for current token count and decides if request can proceed
 */
export async function rateLimiter(req, res, next) {
  try {
    // API key should be attached by apiKeyAuth middleware
    const apiKey = req.apiKey

    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key required',
      })
    }

    const redisKey = `ratelimit:${apiKey.key}`
    const maxTokens = apiKey.max_requests_per_hour
    const refillRate = calculateRefillRate(maxTokens)

    // Get current bucket state from Redis
    const bucketData = await redisClient.get(redisKey)

    let currentTokens
    let lastRefillTime

    if (bucketData) {
      // Bucket exists - parse stored data
      const bucket = JSON.parse(bucketData)
      lastRefillTime = bucket.lastRefillTime

      // Calculate current tokens based on time elapsed
      currentTokens = calculateTokens(
        bucket.tokens,
        lastRefillTime,
        maxTokens,
        refillRate
      )
    } else {
      // First request - bucket is full
      currentTokens = maxTokens
      lastRefillTime = Date.now()
    }

    // Check if request can proceed
    if (canProceed(currentTokens)) {
      // Consume 1 token
      const newTokenCount = currentTokens - 1

      // Update Redis with new state
      await redisClient.set(
        redisKey,
        JSON.stringify({
          tokens: newTokenCount,
          lastRefillTime: Date.now(),
        }),
        { EX: 3600 } // Expire after 1 hour of inactivity
      )

      // Add rate limit info to response headers
      res.set({
        'X-RateLimit-Limit': maxTokens,
        'X-RateLimit-Remaining': Math.floor(newTokenCount),
        'X-RateLimit-Reset':
          Date.now() + timeUntilNextToken(newTokenCount, refillRate),
      })

      // Allow request to proceed
      next()
    } else {
      // Rate limit exceeded
      const retryAfter = Math.ceil(
        timeUntilNextToken(currentTokens, refillRate) / 1000
      )

      res.set({
        'X-RateLimit-Limit': maxTokens,
        'X-RateLimit-Remaining': 0,
        'Retry-After': retryAfter,
      })

      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter: retryAfter,
      })
    }
  } catch (error) {
    console.error('Rate limiter error:', error)
    // On error, allow request through (fail open)
    // Alternative: fail closed (reject request)
    next()
  }
}
