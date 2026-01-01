import * as apiKeyModel from '../models/apiKey.js';

/**
 * Middleware to authenticate requests using API key
 * Looks for API key in X-API-Key header
 * If valid, attaches key object to req.apiKey for use by other middleware
 */
export async function apiKeyAuth(req, res, next) {
  try {
    // Extract API key from header
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key is required. Include it in the X-API-Key header.'
      });
    }

    // Look up API key in database
    const keyData = await apiKeyModel.findByKey(apiKey);
    
    if (!keyData) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key.'
      });
    }

    // Attach API key data to request object for downstream middleware
    req.apiKey = keyData;
    
    // Continue to next middleware
    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed.'
    });
  }
}