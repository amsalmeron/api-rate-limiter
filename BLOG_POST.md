# Building a Production-Ready API Rate Limiter with Node.js, Redis, and the Token Bucket Algorithm

## Introduction

Rate limiting is a critical component of any production API. Without it, a single user (or attacker) can overwhelm your servers, causing downtime for everyone. In this post, I'll walk through building a complete rate limiting system from scratch, including real-time analytics and Docker deployment.

**What we'll build:**
- Token bucket rate limiting algorithm
- Multi-tier rate limits (free, pro, enterprise)
- Real-time analytics dashboard
- Request logging and monitoring
- Fully containerized with Docker

**Tech stack:** Node.js, Express, Redis, PostgreSQL, Chart.js

---

## Part 1: Understanding Rate Limiting

### Why Rate Limit?

1. **Prevent abuse** - Stop bad actors from overwhelming your API
2. **Ensure fair usage** - Prevent one user from monopolizing resources
3. **Cost control** - Limit expensive operations (external API calls, compute)
4. **Monetization** - Different tiers for different paying customers

### Rate Limiting Algorithms Compared

#### Fixed Window
```
12:00-12:59: Allow 100 requests
13:00-13:59: Allow 100 requests (resets)
```
**Problem:** Burst at window edges. User can make 100 requests at 12:59 and 100 at 13:00 = 200 in 1 minute!

#### Sliding Window
Tracks requests in rolling time periods. More accurate but complex to implement.

#### Token Bucket (What We Built)
The sweet spot - simple, efficient, allows bursts, fair over time.

---

## Part 2: The Token Bucket Algorithm

### How It Works

Imagine a bucket that:
1. Holds tokens (capacity = max requests allowed)
2. Each request consumes 1 token
3. Tokens refill at a constant rate
4. If bucket is empty → request rejected

### Visual Example

```
Time    | Tokens | Action
--------|--------|------------------
0:00    | 100    | Start (full bucket)
0:01    | 50     | Made 50 requests
0:02    | 51.67  | Waited 1 min, gained 1.67 tokens
0:03    | 0      | Made 51 more requests
0:04    | REJECT | No tokens left!
0:05    | 1.67   | Waited 1 min, can make 1 request now
```

### The Math

For 100 requests per hour:
- **Capacity:** 100 tokens
- **Refill rate:** 100 tokens / 60 minutes = 1.67 tokens/minute
- **Time per token:** 36 seconds

```javascript
const refillRate = maxTokens / (60 * 60 * 1000); // tokens per millisecond
const tokensToAdd = (currentTime - lastRefill) * refillRate;
const newTokenCount = Math.min(oldTokens + tokensToAdd, maxTokens);
```

### Why Token Bucket?

✅ **Allows bursts** - User can use all 100 tokens quickly if needed  
✅ **Fair over time** - Can't exceed limit in any hour  
✅ **Simple** - Just track token count and timestamp  
✅ **Efficient** - Single Redis operation per request

---

## Part 3: Implementation Deep Dive

### Architecture Overview

```
Client Request
    ↓
[API Key Auth Middleware]
    ↓ (validates key exists)
[Rate Limiter Middleware]
    ↓ (checks Redis, consumes token)
[Route Handler]
    ↓
Response
    ↓
[Request Logger]
    ↓ (async write to PostgreSQL)
```

### Key Design Decisions

#### 1. Why Redis for Rate Limiting?

**Speed is critical.** Every API request must check the rate limit:

```javascript
// Without caching: ~50ms database query per request
// With Redis: ~1ms lookup per request
```

At 1000 requests/second, that's the difference between 50 seconds of database load vs 1 second.

**Redis operations:**
```javascript
// Store bucket state as JSON
await redis.set('ratelimit:user123', JSON.stringify({
  tokens: 87.5,
  lastRefillTime: 1702668372890
}), { EX: 3600 }); // Expire after 1 hour
```

#### 2. Why PostgreSQL for Analytics?

Redis is fast but volatile (data can be lost). PostgreSQL gives us:
- **Persistence** - Request logs survive server restarts
- **Complex queries** - Joins, aggregations for analytics
- **Audit trail** - Complete history of API usage

```sql
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status_code < 400) as successful
FROM request_logs 
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour;
```

#### 3. Fail Open vs Fail Closed

What if Redis is down?

**Fail Open (what we chose):**
```javascript
catch (error) {
  console.error('Rate limiter error:', error);
  next(); // Allow request through
}
```

**Fail Closed (alternative):**
```javascript
catch (error) {
  return res.status(503).json({ error: 'Service Unavailable' });
}
```

**Our reasoning:** Availability > strict enforcement. If Redis dies, users can still use the API rather than complete outage. Monitor errors and page on-call.

---

## Part 4: Code Walkthrough

### Token Bucket Core Logic

```javascript
export function calculateTokens(lastTokenCount, lastRefillTime, maxTokens, refillRate) {
  const now = Date.now();
  const timeSinceLastRefill = now - lastRefillTime;
  
  // Calculate tokens to add based on elapsed time
  const tokensToAdd = timeSinceLastRefill * refillRate;
  
  // Don't exceed bucket capacity
  return Math.min(lastTokenCount + tokensToAdd, maxTokens);
}
```

**Why pure functions?** No side effects = easy to test:

```javascript
// Test without mocking Redis or database
const tokens = calculateTokens(50, Date.now() - 60000, 100, 0.0000278);
assert(tokens === 51.67); // 50 + (1 minute * 1.67 tokens/min)
```

### Rate Limiter Middleware

```javascript
export async function rateLimiter(req, res, next) {
  const apiKey = req.apiKey; // Set by auth middleware
  const redisKey = `ratelimit:${apiKey.key}`;
  
  // Get current bucket state
  const bucketData = await redisClient.get(redisKey);
  
  let currentTokens;
  if (bucketData) {
    const bucket = JSON.parse(bucketData);
    currentTokens = calculateTokens(
      bucket.tokens,
      bucket.lastRefillTime,
      apiKey.max_requests_per_hour,
      calculateRefillRate(apiKey.max_requests_per_hour)
    );
  } else {
    currentTokens = apiKey.max_requests_per_hour; // First request
  }
  
  if (currentTokens >= 1) {
    // Allow request, consume token
    await redisClient.set(redisKey, JSON.stringify({
      tokens: currentTokens - 1,
      lastRefillTime: Date.now()
    }), { EX: 3600 });
    
    // Add rate limit headers (industry standard)
    res.set({
      'X-RateLimit-Limit': apiKey.max_requests_per_hour,
      'X-RateLimit-Remaining': Math.floor(currentTokens - 1),
      'X-RateLimit-Reset': Date.now() + timeUntilNextToken(currentTokens - 1, refillRate)
    });
    
    next();
  } else {
    // Rate limit exceeded
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Try again in 36 seconds.',
      retryAfter: 36
    });
  }
}
```

### Database Connection Pooling

**Why pools?** PostgreSQL connections are expensive to create (~100ms). A pool maintains reusable connections:

```javascript
const pool = new Pool({
  max: 20, // 20 concurrent connections
  idleTimeoutMillis: 30000, // Close idle after 30s
  connectionTimeoutMillis: 2000 // Error if no connection in 2s
});
```

With 20 connections, we can handle 20 simultaneous database queries. For higher scale, use a managed service (AWS RDS) with larger pools.

---

## Part 5: Analytics Dashboard

### Real-Time Metrics

The dashboard queries PostgreSQL for:
1. **Overall stats** - Total requests, success rate, avg response time
2. **Hourly volume** - Chart showing request patterns
3. **Top consumers** - Which API keys are hitting hardest
4. **Endpoint breakdown** - Which routes get traffic

### Key SQL Query

```sql
-- Hourly request statistics
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status_code < 400) as successful_requests,
  COUNT(*) FILTER (WHERE status_code >= 400) as failed_requests,
  AVG(response_time_ms) as avg_response_time
FROM request_logs 
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;
```

**PostgreSQL-specific features:**
- `DATE_TRUNC('hour', timestamp)` - Rounds to nearest hour for grouping
- `COUNT(*) FILTER (WHERE ...)` - Conditional aggregation (cleaner than CASE)

### Chart.js Integration

```javascript
new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['12:00', '13:00', '14:00', ...],
    datasets: [{
      label: 'Successful Requests',
      data: [45, 67, 89, ...],
      borderColor: '#10b981',
      fill: true
    }]
  }
});
```

Auto-refreshes every 30 seconds for near-real-time monitoring.

---

## Part 6: Docker Deployment

### Why Docker?

1. **Consistency** - "Works on my machine" → "Works everywhere"
2. **Isolation** - Dependencies don't conflict
3. **Scalability** - Easy to run multiple instances
4. **Portability** - Deploy to AWS, Azure, your laptop, anywhere

### Docker Compose Architecture

```yaml
services:
  postgres:
    image: postgres:14-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready"]
      
  redis:
    image: redis:7-alpine
    
  app:
    build: .
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
```

**Health checks prevent race conditions.** App waits for database to be ready before starting.

### One Command Deployment

```bash
docker compose up -d
```

This:
1. Builds your Node app image
2. Pulls PostgreSQL and Redis images
3. Creates a network
4. Starts all services
5. Runs database migrations
6. Your API is live on port 3000

---

## Part 7: Performance & Scale

### Benchmarks

**Single instance (MacBook Pro M1):**
- 5,000 requests/second sustained
- ~2ms average response time
- Redis latency: <1ms
- PostgreSQL logging: async, doesn't block

**Load test results:**
```bash
# 10,000 requests, 100 concurrent
wrk -t10 -c100 -d30s http://localhost:3000/api/status

Requests/sec: 5247.23
Latency avg: 1.95ms
```

### Scaling Strategies

**Horizontal scaling:**
```bash
docker compose up --scale app=5
```

Add a load balancer (nginx) in front:
```
Load Balancer (nginx)
    ↓
[App 1] [App 2] [App 3] [App 4] [App 5]
    ↓       ↓       ↓       ↓       ↓
    Redis (shared state)
    PostgreSQL (shared data)
```

All app instances share Redis and PostgreSQL, so rate limiting works across instances.

**Redis clustering:**
For > 100k requests/second, use Redis Cluster or ElastiCache with read replicas.

---

## Part 8: Security Considerations

### API Key Generation

```javascript
const key = `${tier}_${crypto.randomBytes(32).toString('hex')}`;
```

- 32 random bytes = 256 bits of entropy
- Hex encoding = 64 characters
- Cryptographically secure (not `Math.random()`)

### SQL Injection Prevention

```javascript
// ❌ NEVER do this
db.query(`SELECT * FROM api_keys WHERE key = '${userInput}'`);

// ✅ Always use parameterized queries
db.query('SELECT * FROM api_keys WHERE key = $1', [userInput]);
```

PostgreSQL escapes parameters, preventing injection attacks.

### Soft Deletes

```sql
UPDATE api_keys SET is_active = false WHERE id = $1;
```

Don't delete API keys - deactivate them. Preserves audit trail in request logs.

---

## Part 9: What I Learned

### Technical Insights

1. **Redis is essential for high-frequency operations** - Database queries are too slow for per-request rate checks
2. **Token bucket is elegant** - Simple math, handles bursts naturally
3. **Middleware patterns are powerful** - Clean separation of concerns
4. **Docker eliminates "works on my machine"** - Huge productivity boost

### Mistakes & Iterations

**Attempt 1:** Used PostgreSQL for rate limit checks
- **Problem:** 50ms per request = bottleneck at 20 req/sec
- **Fix:** Moved to Redis, 100x faster

**Attempt 2:** Stored individual request timestamps
- **Problem:** Redis list grows unbounded, memory leak
- **Fix:** Token bucket stores just 2 numbers (tokens, timestamp)

**Attempt 3:** Synchronous request logging
- **Problem:** Slowed every response by 15ms
- **Fix:** Async logging with `res.on('finish', ...)`

### Zoho vs Modern Stack

Coming from Zoho development, the biggest differences:

| Zoho (Deluge) | Node.js Ecosystem |
|---------------|-------------------|
| Proprietary language | JavaScript (transferable) |
| Built-in rate limiting | Build your own (deeper understanding) |
| GUI-based setup | Code-based infrastructure |
| Vendor lock-in | Open source, portable |

Building this deepened my understanding of concepts Zoho abstracts away.

---

## Part 10: Next Steps & Production Readiness

### Future Enhancements

1. **Distributed rate limiting** - Redis Cluster for multi-region
2. **Machine learning** - Detect abuse patterns beyond simple rate limits
3. **GraphQL support** - Cost-based rate limiting (complex queries = more tokens)
4. **Webhook notifications** - Alert when users hit 80% of limit
5. **API key rotation** - Automatic expiration and renewal

### Production Checklist

Before deploying to production:

- [ ] Set strong PostgreSQL passwords
- [ ] Enable HTTPS (use Caddy or nginx reverse proxy)
- [ ] Set up monitoring (Datadog, New Relic, or Prometheus)
- [ ] Configure log aggregation (CloudWatch, Splunk)
- [ ] Set up alerts for high error rates
- [ ] Enable Redis persistence (AOF or RDB)
- [ ] Use managed services (AWS RDS, ElastiCache)
- [ ] Implement backup strategy
- [ ] Load test with realistic traffic
- [ ] Document runbooks for common issues

### Deployment Options

**AWS:**
```bash
# RDS for PostgreSQL
# ElastiCache for Redis
# ECS/Fargate for containers
# ALB for load balancing
```

**Heroku:**
```bash
heroku create my-rate-limiter
heroku addons:create heroku-postgresql
heroku addons:create heroku-redis
git push heroku main
```

**DigitalOcean:**
- Managed PostgreSQL
- Managed Redis
- App Platform for containers

---

## Conclusion

Building this rate limiter taught me:
- How algorithms solve real-world problems (token bucket)
- Why architectural choices matter (Redis vs PostgreSQL)
- The importance of observability (analytics dashboard)
- How Docker simplifies deployment

The complete project is on GitHub: [your-repo-url]

**Key takeaways for developers:**
1. Rate limiting is more nuanced than it seems
2. Choose the right tool for each job (Redis for speed, PostgreSQL for persistence)
3. Test with realistic loads before production
4. Observability isn't optional - you need to see what's happening

This project moved me from Zoho-specific development to portable, production-ready backend engineering. The concepts transfer to any stack - Python/FastAPI, Go/Gin, Java/Spring - the algorithm and architecture remain the same.

---

## Resources

- [Redis Documentation](https://redis.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Token Bucket Algorithm - Wikipedia](https://en.wikipedia.org/wiki/Token_bucket)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Rate Limiting at Stripe](https://stripe.com/blog/rate-limiters)

**Questions?** Open an issue on the GitHub repo or reach out on LinkedIn.

---

*This post is part of my 90-day journey transitioning from Zoho development to full-stack engineering. Follow along for more deep dives into system design, algorithms, and modern backend development.*