import { Redis } from 'ioredis'

export type { Redis }

export function createRedis(url: string): Redis {
  return new Redis(url, {
    // Fail fast instead of queueing commands while disconnected.
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  })
}

export async function pingRedis(redis: Redis, timeoutMs = 1000): Promise<boolean> {
  const timeout = new Promise<false>((resolve) => setTimeout(() => resolve(false), timeoutMs))
  const ping = redis.ping().then(
    (reply) => reply === 'PONG',
    () => false,
  )
  return Promise.race([ping, timeout])
}
