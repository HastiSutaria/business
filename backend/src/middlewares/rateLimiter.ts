import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900000),
  max: Number(process.env.RATE_LIMIT_MAX ?? 500),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests, please try again later', code: 'RATE_LIMITED' } },
});

/** Tighter limit for the login endpoint to slow down brute-force / credential-stuffing attempts. */
export const loginRateLimiter = rateLimit({
  windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS ?? 900000),
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX ?? 10),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: { message: 'Too many login attempts, please try again later', code: 'RATE_LIMITED' },
  },
});
