const attempts = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of attempts) {
    if (now >= entry.resetAt) attempts.delete(ip);
  }
}, 60 * 60 * 1000);

export function checkRateLimit(ip: string): { allowed: boolean } {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= 15) return { allowed: false };
    entry.count++;
  } else {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
  }
  return { allowed: true };
}
