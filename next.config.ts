import type { NextConfig } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';

export default function nextConfig(phase: string): NextConfig {
  return {
    cacheComponents: false,
    // next start uses the normal server; Docker runs the traced server.js.
    output: phase === PHASE_PRODUCTION_BUILD ? 'standalone' : undefined,
  };
}
