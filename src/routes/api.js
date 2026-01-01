import express from 'express'
import { apiKeyAuth } from '../middleware/apiKeyAuth.js'
import { rateLimiter } from '../middleware/rateLimiter.js'

const router = express.Router()

// Apply authentication and rate limiting to ALL routes in this file
router.use(apiKeyAuth)
router.use(rateLimiter)

/**
 * GET /api/data
 * Example protected endpoint - returns some data
 */
router.get('/data', (req, res) => {
  res.json({
    message: 'Here is your data!',
    data: {
      timestamp: new Date().toISOString(),
      randomNumber: Math.floor(Math.random() * 1000),
      user: req.apiKey.user_id,
    },
  })
})

/**
 * POST /api/process
 * Example protected endpoint - processes some data
 */
router.post('/process', (req, res) => {
  const { input } = req.body

  res.json({
    message: 'Data processed successfully',
    processed: {
      input: input,
      output: input ? input.toUpperCase() : null,
      processedAt: new Date().toISOString(),
    },
  })
})

/**
 * GET /api/user
 * Returns information about the authenticated API key
 */
router.get('/user', (req, res) => {
  res.json({
    user_id: req.apiKey.user_id,
    tier: req.apiKey.tier,
    max_requests_per_hour: req.apiKey.max_requests_per_hour,
    key_created: req.apiKey.created_at,
  })
})

/**
 * GET /api/status
 * Simple status check (still rate limited)
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
  })
})

export default router
