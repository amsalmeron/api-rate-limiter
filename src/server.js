import express from 'express'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Import routes
import apiRoutes from './routes/api.js'
import adminRoutes from './routes/admin.js'
import analyticsRoutes from './routes/analytics.js'

// Import middleware
import * as requestLogModel from './models/requestLog.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Middleware
app.use(express.json()) // Parse JSON request bodies
app.use(express.static(path.join(__dirname, '../public'))) // Serve static files

// Request logging middleware (runs on ALL requests)
app.use(async (req, res, next) => {
  const startTime = Date.now()

  // Capture response
  res.on('finish', async () => {
    const responseTime = Date.now() - startTime

    // Only log if we have an API key (authenticated request)
    if (req.apiKey) {
      try {
        await requestLogModel.create({
          api_key_id: req.apiKey.id,
          endpoint: req.path,
          method: req.method,
          status_code: res.statusCode,
          ip_address: req.ip,
          user_agent: req.get('user-agent') || 'unknown',
          response_time_ms: responseTime,
        })
      } catch (error) {
        console.error('Failed to log request:', error)
      }
    }
  })

  next()
})

// Routes
app.use('/api', apiRoutes) // Protected API endpoints (rate limited)
app.use('/admin', adminRoutes) // Admin endpoints (API key management)
app.use('/analytics', analyticsRoutes) // Analytics dashboard data

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'API Rate Limiter & Analytics Service',
    endpoints: {
      api: '/api/*',
      admin: '/admin/*',
      analytics: '/analytics/*',
      dashboard: '/dashboard.html',
      health: '/health',
    },
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
  })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({
    error: 'Internal Server Error',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Something went wrong',
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html`)
  console.log(`🔍 Health check: http://localhost:${PORT}/health`)
})
