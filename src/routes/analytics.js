import express from 'express'
import * as requestLogModel from '../models/requestLog.js'

const router = express.Router()

/**
 * GET /analytics/overview
 * Get overall statistics
 */
router.get('/overview', async (req, res) => {
  try {
    const stats = await requestLogModel.getOverallStats()
    res.json(stats)
  } catch (error) {
    console.error('Error fetching overview:', error)
    res.status(500).json({ error: 'Failed to fetch overview' })
  }
})

/**
 * GET /analytics/hourly
 * Get hourly request statistics
 * Query params: ?hours=24 (default)
 */
router.get('/hourly', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24
    const stats = await requestLogModel.getHourlyStats(hours)
    res.json(stats)
  } catch (error) {
    console.error('Error fetching hourly stats:', error)
    res.status(500).json({ error: 'Failed to fetch hourly stats' })
  }
})

/**
 * GET /analytics/top-consumers
 * Get top API consumers
 * Query params: ?limit=10 (default)
 */
router.get('/top-consumers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10
    const consumers = await requestLogModel.getTopConsumers(limit)
    res.json(consumers)
  } catch (error) {
    console.error('Error fetching top consumers:', error)
    res.status(500).json({ error: 'Failed to fetch top consumers' })
  }
})

/**
 * GET /analytics/endpoints
 * Get endpoint statistics
 */
router.get('/endpoints', async (req, res) => {
  try {
    const stats = await requestLogModel.getEndpointStats()
    res.json(stats)
  } catch (error) {
    console.error('Error fetching endpoint stats:', error)
    res.status(500).json({ error: 'Failed to fetch endpoint stats' })
  }
})

export default router
