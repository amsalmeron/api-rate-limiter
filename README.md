# API Rate Limiter & Analytics Service

A production-ready API rate limiting system with real-time analytics, built with Node.js, Redis, and PostgreSQL.

## 🚀 Features

- **Token Bucket Rate Limiting** - Smooth, burst-tolerant rate limiting algorithm
- **Multiple Tiers** - Free (100 req/hr), Pro (1000 req/hr), Enterprise (10,000 req/hr)
- **Real-time Analytics** - Beautiful dashboard with charts and statistics
- **Request Logging** - Complete audit trail of all API requests
- **Docker Support** - Fully containerized for easy deployment
- **RESTful API** - Clean, intuitive API design

## 🛠️ Tech Stack

- **Backend:** Node.js, Express
- **Rate Limiting:** Redis (token bucket algorithm)
- **Database:** PostgreSQL
- **Analytics:** Chart.js
- **Containerization:** Docker, Docker Compose

## 📋 Prerequisites

- Node.js 20+ (or Docker)
- PostgreSQL 14+ (or Docker)
- Redis 7+ (or Docker)

## 🏃 Quick Start

### Option 1: Docker (Recommended)
```bash
# Clone the repository
git clone <your-repo-url>
cd rate-limiter-api

# Start all services
docker compose up --build

# Access the application
open http://localhost:3000/dashboard.html
```

### Option 2: Local Development
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Create database
psql postgres -c "CREATE DATABASE rate_limiter;"
psql rate_limiter < migrations/001_initial_schema.sql

# Start Redis
brew services start redis

# Start the application
npm run dev

# Access the application
open http://localhost:3000/dashboard.html
```

## 🔑 API Usage

### Authentication

All `/api/*` endpoints require an API key in the `X-API-Key` header:
```bash
curl -H "X-API-Key: your_api_key_here" http://localhost:3000/api/data
```

### Endpoints

#### Protected API Routes (Rate Limited)

- `GET /api/data` - Get sample data
- `POST /api/process` - Process data
- `GET /api/user` - Get API key info
- `GET /api/status` - Health status

#### Admin Routes (No Rate Limit)

- `GET /admin/keys` - List all API keys
- `POST /admin/keys` - Create new API key
- `DELETE /admin/keys/:id` - Deactivate API key
- `PATCH /admin/keys/:id/tier` - Update API key tier

#### Analytics Routes

- `GET /analytics/overview` - Overall statistics
- `GET /analytics/hourly` - Hourly request volume
- `GET /analytics/top-consumers` - Top API consumers
- `GET /analytics/endpoints` - Endpoint statistics

### Rate Limit Headers

Responses include rate limit information:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1702668372890
```

When rate limited (HTTP 429):
```
Retry-After: 36
```

## 🎨 Dashboard

Access the analytics dashboard at `http://localhost:3000/dashboard.html`

Features:
- Real-time request statistics
- Hourly request volume charts
- Endpoint breakdown
- Top consumers table
- Auto-refresh every 30 seconds

## 🧪 Testing

### Test Rate Limiting
```bash
# Hit the API 105 times (free tier is 100/hour)
for i in {1..105}; do
  curl -H "X-API-Key: dev_test_key_123" http://localhost:3000/api/status
done
```

Requests 1-100 succeed (HTTP 200), requests 101-105 are rate limited (HTTP 429).

### Create New API Key
```bash
curl -X POST http://localhost:3000/admin/keys \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test@example.com", "tier": "pro"}'
```

## 📊 How It Works

### Token Bucket Algorithm

1. Each API key has a "bucket" of tokens
2. Bucket capacity = `max_requests_per_hour`
3. Each request consumes 1 token
4. Tokens refill at constant rate: `max_requests / hour`
5. If bucket is empty → request rejected (429)

**Example:**
- Free tier: 100 tokens/hour = 1.67 tokens/minute
- User makes 50 requests → 50 tokens left
- User waits 10 minutes → gains 16.7 tokens → 66.7 total
- Allows bursts while enforcing hourly limit

### Architecture
```
Request → API Key Auth → Rate Limiter → Route Handler → Response
              ↓              ↓
         PostgreSQL       Redis
         (API keys)   (Token counts)
```

## 🐳 Docker Commands
```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f app

# Stop services
docker compose down

# Rebuild after code changes
docker compose up --build

# Access PostgreSQL
docker compose exec postgres psql -U postgres rate_limiter

# Access Redis CLI
docker compose exec redis redis-cli
```

## 📁 Project Structure
```
rate-limiter-api/
├── src/
│   ├── config/          # Database and Redis connections
│   ├── middleware/      # Authentication and rate limiting
│   ├── routes/          # API endpoints
│   ├── models/          # Database queries
│   ├── utils/           # Token bucket algorithm
│   └── server.js        # Express application
├── public/              # Dashboard UI
├── migrations/          # Database schema
├── docker-compose.yml   # Docker configuration
└── Dockerfile          # Container image
```

## 🔒 Security Considerations

- API keys are cryptographically random (64 chars)
- Parameterized queries prevent SQL injection
- Rate limiting prevents abuse
- Soft deletes preserve audit trail
- Environment variables for secrets

## 🚀 Production Deployment

1. Set strong passwords in `.env`
2. Enable HTTPS with reverse proxy (nginx/Caddy)
3. Set `NODE_ENV=production`
4. Use managed Redis/PostgreSQL (AWS ElastiCache, RDS)
5. Monitor with logging service (Datadog, New Relic)
6. Set up alerts for high rate limit rejections

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | Database user | - |
| `DB_PASSWORD` | Database password | - |
| `DB_NAME` | Database name | `rate_limiter` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `TIER_FREE` | Free tier limit | `100` |
| `TIER_PRO` | Pro tier limit | `1000` |
| `TIER_ENTERPRISE` | Enterprise limit | `10000` |

## 🤝 Contributing

Pull requests welcome! Please ensure tests pass and code follows existing style.

## 📄 License

MIT

## 👤 Author

Antonio Salmeron - [GitHub](https://github.com/yourusername)