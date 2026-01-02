-- API Keys Table
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  key VARCHAR(64) UNIQUE NOT NULL,
  user_id VARCHAR(255),
  tier VARCHAR(50) DEFAULT 'free',
  max_requests_per_hour INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Create index for fast lookups by key
CREATE INDEX idx_api_keys_key ON api_keys(key);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

-- Request Logs Table
CREATE TABLE request_logs (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  response_time_ms INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for analytics queries
CREATE INDEX idx_request_logs_api_key_id ON request_logs(api_key_id);
CREATE INDEX idx_request_logs_timestamp ON request_logs(timestamp);
CREATE INDEX idx_request_logs_endpoint ON request_logs(endpoint);

-- Insert some seed data for testing
INSERT INTO api_keys (key, user_id, tier, max_requests_per_hour) VALUES
  ('dev_test_key_123', 'developer@test.com', 'free', 100),
  ('pro_key_456', 'premium@test.com', 'pro', 1000),
  ('enterprise_key_789', 'enterprise@test.com', 'enterprise', 10000);