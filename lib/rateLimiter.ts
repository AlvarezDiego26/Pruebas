// lib/rateLimiter.ts
type RateLimitRecord = {
  count: number;
  lastAttempt: number;
};

const attempts: Record<string, RateLimitRecord> = {};
const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_ATTEMPTS = 5; // máximo 5 intentos por IP por minuto

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = attempts[ip];

  if (!record) {
    attempts[ip] = { count: 1, lastAttempt: now };
    return true;
  }

  if (now - record.lastAttempt > WINDOW_MS) {
    attempts[ip] = { count: 1, lastAttempt: now };
    return true;
  }

  record.count++;
  record.lastAttempt = now;

  return record.count <= MAX_ATTEMPTS;
}
