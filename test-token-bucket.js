import {
  calculateTokens,
  calculateRefillRate,
  canProceed,
  timeUntilNextToken,
} from './src/utils/tokenBucket.js'

console.log('Testing Token Bucket Algorithm\n')

// Test 1: Refill rate calculation
console.log('Test 1: Refill Rate')
const maxTokens = 100
const refillRate = calculateRefillRate(maxTokens)
console.log(`Max tokens: ${maxTokens}/hour`)
console.log(`Refill rate: ${refillRate} tokens/millisecond`)
console.log(`This means: ${refillRate * 60000} tokens/minute\n`)

// Test 2: Token calculation with no time elapsed
console.log('Test 2: No Time Elapsed')
const now = Date.now()
const tokens1 = calculateTokens(50, now, maxTokens, refillRate)
console.log(`Had 50 tokens, 0ms elapsed: ${tokens1} tokens\n`)

// Test 3: Token calculation after 1 minute
console.log('Test 3: After 1 Minute')
const oneMinuteAgo = now - 60 * 1000
const tokens2 = calculateTokens(50, oneMinuteAgo, maxTokens, refillRate)
console.log(`Had 50 tokens, 1 minute elapsed: ${tokens2.toFixed(2)} tokens`)
console.log(`Expected: ~51.67 tokens (50 + 1.67)\n`)

// Test 4: Cap at max capacity
console.log('Test 4: Capping at Max')
const oneHourAgo = now - 60 * 60 * 1000
const tokens3 = calculateTokens(50, oneHourAgo, maxTokens, refillRate)
console.log(`Had 50 tokens, 1 hour elapsed: ${tokens3} tokens`)
console.log(`Capped at max: ${maxTokens}\n`)

// Test 5: Can proceed check
console.log('Test 5: Can Proceed?')
console.log(`With 10 tokens: ${canProceed(10)} (should be true)`)
console.log(`With 0.5 tokens: ${canProceed(0.5)} (should be false)`)
console.log(`With 0 tokens: ${canProceed(0)} (should be false)\n`)

// Test 6: Time until next token
console.log('Test 6: Time Until Next Token')
const time1 = timeUntilNextToken(0.5, refillRate)
console.log(
  `With 0.5 tokens, need ${(time1 / 1000).toFixed(1)} seconds for next token`
)
const time2 = timeUntilNextToken(0, refillRate)
console.log(
  `With 0 tokens, need ${(time2 / 1000).toFixed(1)} seconds for next token`
)

console.log('\n✅ All token bucket tests complete!')
