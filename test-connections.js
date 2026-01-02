import redisClient from './src/config/redis.js';
import pool from './src/config/database.js';

console.log('Testing connections...');

// Test Redis
try {
  await redisClient.set('test-key', 'Hello Redis!');
  const value = await redisClient.get('test-key');
  console.log('✅ Redis test:', value);
  await redisClient.del('test-key'); // Clean up
} catch (error) {
  console.error('❌ Redis error:', error);
}

// Test PostgreSQL
try {
  const result = await pool.query('SELECT NOW() as current_time');
  console.log('✅ PostgreSQL test:', result.rows[0].current_time);
} catch (error) {
  console.error('❌ PostgreSQL error:', error);
}

// Close connections
await redisClient.quit();
await pool.end();

console.log('Tests complete!');