import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_GLOBAL ?? 300),
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_AUTH ?? 20),
  message: { error: "Too many login attempts, please try again later." },
});

export const analysisLimiter = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_ANALYSIS ?? 5),
  message: { error: "Analysis rate limit exceeded." },
});
