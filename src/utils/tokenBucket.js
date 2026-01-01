/**
 * Token Bucket Algorithm Implementation
 *
 * This implements a token bucket rate limiter where:
 * - Each bucket has a maximum capacity (max tokens)
 * - Tokens refill at a constant rate
 * - Each request consumes 1 token
 * - Requests are rejected when bucket is empty
 */

/**
 * Calculate current token count based on time elapsed since last refill
 *
 * @param {number} lastTokenCount - Number of tokens at last check
 * @param {number} lastRefillTime - Timestamp (ms) of last refill
 * @param {number} maxTokens - Maximum bucket capacity
 * @param {number} refillRate - Tokens refilled per millisecond
 * @returns {number} - Current token count (capped at maxTokens)
 */
export function calculateTokens(
  lastTokenCount,
  lastRefillTime,
  maxTokens,
  refillRate
) {
  const now = Date.now()
  const timeSinceLastRefill = now - lastRefillTime

  // Calculate how many tokens to add based on time elapsed
  const tokensToAdd = timeSinceLastRefill * refillRate

  // Add tokens but don't exceed max capacity
  const newTokenCount = Math.min(lastTokenCount + tokensToAdd, maxTokens)

  return newTokenCount
}

/**
 * Calculate refill rate (tokens per millisecond)
 *
 * @param {number} maxTokens - Maximum tokens (requests per hour)
 * @returns {number} - Tokens per millisecond
 *
 * Example:
 * - 100 requests/hour = 100 tokens/hour
 * - 1 hour = 3,600,000 milliseconds
 * - Refill rate = 100 / 3,600,000 = 0.0000278 tokens/ms
 */
export function calculateRefillRate(maxTokens) {
  const HOUR_IN_MS = 60 * 60 * 1000 // 3,600,000 milliseconds
  return maxTokens / HOUR_IN_MS
}

/**
 * Check if a request can proceed (has tokens available)
 *
 * @param {number} currentTokens - Current token count
 * @param {number} tokensRequired - Tokens needed (default 1)
 * @returns {boolean} - True if request can proceed
 */
export function canProceed(currentTokens, tokensRequired = 1) {
  return currentTokens >= tokensRequired
}

/**
 * Calculate time until next token is available
 *
 * @param {number} currentTokens - Current token count
 * @param {number} refillRate - Tokens per millisecond
 * @returns {number} - Milliseconds until next token (0 if tokens available)
 */
export function timeUntilNextToken(currentTokens, refillRate) {
  if (currentTokens >= 1) {
    return 0
  }

  const tokensNeeded = 1 - currentTokens
  return Math.ceil(tokensNeeded / refillRate)
}
