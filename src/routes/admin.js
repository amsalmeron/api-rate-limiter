import express from 'express'
import crypto from 'crypto'
import * as apiKeyModel from '../models/apiKey.js'

const router = express.Router()

/**
 * GET /admin/keys
 * List all API keys
 */
router.get('/keys', async (req, res) => {
  try {
    const keys = await apiKeyModel.findAll()
    res.json({ keys })
  } catch (error) {
    console.error('Error fetching keys:', error)
    res.status(500).json({ error: 'Failed to fetch API keys' })
  }
})

/**
 * POST /admin/keys
 * Create a new API key
 * Body: { user_id, tier }
 */
router.post('/keys', async (req, res) => {
  try {
    const { user_id, tier = 'free' } = req.body

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    // Validate tier
    const validTiers = ['free', 'pro', 'enterprise']
    if (!validTiers.includes(tier)) {
      return res.status(400).json({
        error: `Invalid tier. Must be one of: ${validTiers.join(', ')}`,
      })
    }

    // Generate secure random API key
    const key = `${tier}_${crypto.randomBytes(32).toString('hex')}`

    // Get max requests based on tier
    const tierLimits = {
      free: parseInt(process.env.TIER_FREE) || 100,
      pro: parseInt(process.env.TIER_PRO) || 1000,
      enterprise: parseInt(process.env.TIER_ENTERPRISE) || 10000,
    }

    const max_requests_per_hour = tierLimits[tier]

    // Create in database
    const newKey = await apiKeyModel.create({
      key,
      user_id,
      tier,
      max_requests_per_hour,
    })

    res.status(201).json({
      message: 'API key created successfully',
      apiKey: newKey,
    })
  } catch (error) {
    console.error('Error creating key:', error)
    res.status(500).json({ error: 'Failed to create API key' })
  }
})

/**
 * DELETE /admin/keys/:id
 * Deactivate an API key
 */
router.delete('/keys/:id', async (req, res) => {
  try {
    const { id } = req.params
    const success = await apiKeyModel.deactivate(id)

    if (success) {
      res.json({ message: 'API key deactivated successfully' })
    } else {
      res.status(404).json({ error: 'API key not found' })
    }
  } catch (error) {
    console.error('Error deactivating key:', error)
    res.status(500).json({ error: 'Failed to deactivate API key' })
  }
})

/**
 * PATCH /admin/keys/:id/tier
 * Update API key tier
 * Body: { tier, max_requests_per_hour }
 */
router.patch('/keys/:id/tier', async (req, res) => {
  try {
    const { id } = req.params
    const { tier, max_requests_per_hour } = req.body

    if (!tier || !max_requests_per_hour) {
      return res.status(400).json({
        error: 'Both tier and max_requests_per_hour are required',
      })
    }

    const updatedKey = await apiKeyModel.updateTier(
      id,
      tier,
      max_requests_per_hour
    )

    if (updatedKey) {
      res.json({
        message: 'API key updated successfully',
        apiKey: updatedKey,
      })
    } else {
      res.status(404).json({ error: 'API key not found' })
    }
  } catch (error) {
    console.error('Error updating key:', error)
    res.status(500).json({ error: 'Failed to update API key' })
  }
})

export default router
