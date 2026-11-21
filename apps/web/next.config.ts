import type { NextConfig } from 'next'

try {
  process.loadEnvFile('../../.env')
} catch {}

const nextConfig: NextConfig = {}

export default nextConfig
