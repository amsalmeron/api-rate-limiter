import { query } from '../config/database.js'

/**
 * Log an API request
 * @param {object} logData - { api_key_id, endpoint, method, status_code, ip_address, user_agent, response_time_ms }
 * @returns {object} - The created log entry
 */
export async function create(logData) {
  const {
    api_key_id,
    endpoint,
    method,
    status_code,
    ip_address,
    user_agent,
    response_time_ms,
  } = logData

  const result = await query(
    `INSERT INTO request_logs 
     (api_key_id, endpoint, method, status_code, ip_address, user_agent, response_time_ms) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) 
     RETURNING *`,
    [
      api_key_id,
      endpoint,
      method,
      status_code,
      ip_address,
      user_agent,
      response_time_ms,
    ]
  )

  return result.rows[0]
}

/**
 * Get request logs for a specific API key
 * @param {number} apiKeyId - The API key ID
 * @param {number} limit - Number of logs to return (default 100)
 * @returns {array} - Array of log entries
 */
export async function findByApiKey(apiKeyId, limit = 100) {
  const result = await query(
    `SELECT * FROM request_logs 
     WHERE api_key_id = $1 
     ORDER BY timestamp DESC 
     LIMIT $2`,
    [apiKeyId, limit]
  )
  return result.rows
}

/**
 * Get hourly request statistics
 * @param {number} hours - Number of hours to look back (default 24)
 * @returns {array} - Array of { hour, total_requests, successful_requests, failed_requests }
 */
export async function getHourlyStats(hours = 24) {
  const result = await query(
    `SELECT 
       DATE_TRUNC('hour', timestamp) as hour,
       COUNT(*) as total_requests,
       COUNT(*) FILTER (WHERE status_code < 400) as successful_requests,
       COUNT(*) FILTER (WHERE status_code >= 400) as failed_requests,
       AVG(response_time_ms) as avg_response_time
     FROM request_logs 
     WHERE timestamp > NOW() - INTERVAL '${hours} hours'
     GROUP BY DATE_TRUNC('hour', timestamp)
     ORDER BY hour DESC`
  )
  return result.rows
}

/**
 * Get top consumers (API keys with most requests)
 * @param {number} limit - Number of top consumers to return (default 10)
 * @returns {array} - Array of { api_key_id, user_id, total_requests }
 */
export async function getTopConsumers(limit = 10) {
  const result = await query(
    `SELECT 
       rl.api_key_id,
       ak.user_id,
       ak.tier,
       COUNT(*) as total_requests,
       COUNT(*) FILTER (WHERE rl.status_code = 429) as rate_limited_requests
     FROM request_logs rl
     JOIN api_keys ak ON rl.api_key_id = ak.id
     WHERE rl.timestamp > NOW() - INTERVAL '24 hours'
     GROUP BY rl.api_key_id, ak.user_id, ak.tier
     ORDER BY total_requests DESC
     LIMIT $1`,
    [limit]
  )
  return result.rows
}

/**
 * Get overall statistics
 * @returns {object} - { total_requests, successful_rate, avg_response_time, most_hit_endpoint }
 */
export async function getOverallStats() {
  const result = await query(
    `SELECT 
       COUNT(*) as total_requests,
       ROUND(100.0 * COUNT(*) FILTER (WHERE status_code < 400) / COUNT(*), 2) as success_rate,
       ROUND(AVG(response_time_ms), 2) as avg_response_time,
       MODE() WITHIN GROUP (ORDER BY endpoint) as most_hit_endpoint
     FROM request_logs
     WHERE timestamp > NOW() - INTERVAL '24 hours'`
  )
  return result.rows[0]
}

/**
 * Get endpoint statistics
 * @returns {array} - Array of { endpoint, total_requests, avg_response_time }
 */
export async function getEndpointStats() {
  const result = await query(
    `SELECT 
       endpoint,
       COUNT(*) as total_requests,
       ROUND(AVG(response_time_ms), 2) as avg_response_time,
       COUNT(*) FILTER (WHERE status_code < 400) as successful_requests
     FROM request_logs
     WHERE timestamp > NOW() - INTERVAL '24 hours'
     GROUP BY endpoint
     ORDER BY total_requests DESC`
  )
  return result.rows
}
