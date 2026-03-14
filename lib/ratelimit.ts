import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limiter para autenticação (mais restritivo)
export const authRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 req/min por IP
  analytics: true,
  prefix: 'rl:auth',
});

// Rate limiter geral para a API
export const apiRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 req/min por IP
  analytics: true,
  prefix: 'rl:api',
});

// Rate limiter para upload de documentos (mais restritivo)
export const uploadRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 uploads/min por usuário
  analytics: true,
  prefix: 'rl:upload',
});
