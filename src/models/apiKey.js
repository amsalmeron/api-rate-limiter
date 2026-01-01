import { query } from '../config/database.js'

/**
 * Find an API key by its key string
 * @param {string} key - The API key to search for
 * @returns {object|null} - API key object or null if not found
 */
export async function findByKey(key) {
  const result = await query(
    'SELECT * FROM api_keys WHERE key = $1 AND is_active = true',
    [key]
  )
  return result.rows[0] || null
}

/**
 * Find an API key by its ID
 * @param {number} id - The API key ID
 * @returns {object|null} - API key object or null if not found
 */
export async function findById(id) {
  const result = await query('SELECT * FROM api_keys WHERE id = $1', [id])
  return result.rows[0] || null
}

/**
 * Get all API keys
 * @returns {array} - Array of all API keys
 */
export async function findAll() {
  const result = await query(
    'SELECT id, key, user_id, tier, max_requests_per_hour, created_at, is_active FROM api_keys ORDER BY created_at DESC'
  )
  return result.rows
}

/**
 * Create a new API key
 * @param {object} keyData - { key, user_id, tier, max_requests_per_hour }
 * @returns {object} - The created API key
 */
export async function create(keyData) {
  const { key, user_id, tier, max_requests_per_hour } = keyData
  const result = await query(
    `INSERT INTO api_keys (key, user_id, tier, max_requests_per_hour) 
     VALUES ($1, $2, $3, $4) 
     RETURNING *`,
    [key, user_id, tier, max_requests_per_hour]
  )
  return result.rows[0]
}

/**
 * Deactivate an API key (soft delete)
 * @param {number} id - The API key ID to deactivate
 * @returns {boolean} - True if successful
 */
export async function deactivate(id) {
  const result = await query(
    'UPDATE api_keys SET is_active = false WHERE id = $1',
    [id]
  )
  return result.rowCount > 0
}

/**
 * Update an API key's tier and rate limit
 * @param {number} id - The API key ID
 * @param {string} tier - New tier
 * @param {number} maxRequestsPerHour - New rate limit
 * @returns {object|null} - Updated API key or null
 */
export async function updateTier(id, tier, maxRequestsPerHour) {
  const result = await query(
    `UPDATE api_keys 
     SET tier = $1, max_requests_per_hour = $2, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $3 
     RETURNING *`,
    [tier, maxRequestsPerHour, id]
  )
  return result.rows[0] || null
}
