import * as apiKeyModel from './src/models/apiKey.js'
import * as requestLogModel from './src/models/requestLog.js'
import pool from './src/config/database.js'

console.log('Testing database models...\n')

// Test API Key model
console.log('1. Testing API Key Model:')
const testKey = await apiKeyModel.findByKey('dev_test_key_123')
console.log(
  'Found test key:',
  testKey ? `${testKey.user_id} (${testKey.tier})` : 'Not found'
)

const allKeys = await apiKeyModel.findAll()
console.log(`Total API keys: ${allKeys.length}\n`)

// Test Request Log model
console.log('2. Testing Request Log Model:')

// Create a test log
const logData = {
  api_key_id: testKey.id,
  endpoint: '/api/test',
  method: 'GET',
  status_code: 200,
  ip_address: '127.0.0.1',
  user_agent: 'test-script',
  response_time_ms: 42,
}

const log = await requestLogModel.create(logData)
console.log('Created test log:', log.id)

// Get stats
const stats = await requestLogModel.getOverallStats()
console.log('Overall stats:', stats)

const endpointStats = await requestLogModel.getEndpointStats()
console.log('Endpoint stats:', endpointStats)

// Cleanup
await pool.end()
console.log('\nTests complete!')
