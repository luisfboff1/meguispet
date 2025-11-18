/**
 * Rate Limiting Utility
 * 
 * Security Enhancement: VULN-004 Fix
 * Simple in-memory rate limiter for API endpoints
 * Prevents brute force attacks and API abuse
 * 
 * Note: In production with multiple serverless instances, consider using
 * a distributed solution like Upstash Redis or Vercel KV
 */

import { NextApiRequest, NextApiResponse } from 'next';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (per serverless instance)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  rateLimitStore.forEach((value, key) => {
    if (value.resetTime < now) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => rateLimitStore.delete(key));
}, 5 * 60 * 1000);

/**
 * Rate limit configuration presets
 */
export const RateLimitPresets = {
  // Login: 5 tentativas / 15 minutos
  LOGIN: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  },
  // Signup: 3 tentativas / hora
  SIGNUP: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
  },
  // APIs gerais: 100 requisições / minuto
  GENERAL: {
    maxRequests: 100,
    windowMs: 60 * 1000,
  },
  // APIs pesadas: 20 requisições / minuto
  HEAVY: {
    maxRequests: 20,
    windowMs: 60 * 1000,
  },
};

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (req: NextApiRequest) => string;
  onRateLimitExceeded?: (req: NextApiRequest) => void;
}

/**
 * Get client identifier (IP address)
 */
function getClientIdentifier(req: NextApiRequest): string {
  // Try to get real IP from headers (for proxies/load balancers)
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }
  
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  
  // Fallback to socket address
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Check if request is within rate limit
 */
export function checkRateLimit(
  req: NextApiRequest,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
} {
  const now = Date.now();
  const key = config.keyGenerator ? config.keyGenerator(req) : getClientIdentifier(req);
  const limitKey = `${key}:${req.url}`;
  
  let entry = rateLimitStore.get(limitKey);
  
  // Reset if window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(limitKey, entry);
  }
  
  // Increment counter
  entry.count++;
  
  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  
  if (!allowed && config.onRateLimitExceeded) {
    config.onRateLimitExceeded(req);
  }
  
  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
    retryAfter: allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000),
  };
}

/**
 * Rate limiting middleware wrapper
 * 
 * @example
 * const handler = withRateLimit(
 *   RateLimitPresets.LOGIN,
 *   async (req, res) => {
 *     // Your handler logic
 *   }
 * );
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const result = checkRateLimit(req, config);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    
    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter?.toString() || '60');
      
      return res.status(429).json({
        success: false,
        message: 'Muitas requisições. Tente novamente mais tarde.',
        retryAfter: result.retryAfter,
      });
    }
    
    return handler(req, res);
  };
}

/**
 * Rate limit by user email (for auth endpoints)
 */
export function withAuthRateLimit(
  config: RateLimitConfig,
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  const customConfig: RateLimitConfig = {
    ...config,
    keyGenerator: (req) => {
      const email = req.body?.email;
      if (email && typeof email === 'string') {
        return `email:${email.toLowerCase()}`;
      }
      return getClientIdentifier(req);
    },
  };
  
  return withRateLimit(customConfig, handler);
}
