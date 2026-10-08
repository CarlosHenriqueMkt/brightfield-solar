import type { NextConfig } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { isProductionDeployment } from './src/domain/site';

export default function nextConfig(phase: string): NextConfig {
  return {
    cacheComponents: false,
    // next start uses the normal server; Docker runs the traced server.js.
    output: phase === PHASE_PRODUCTION_BUILD ? 'standalone' : undefined,
    headers() {
      return isProductionDeployment()
        ? []
        : [
            {
              source: '/:path*',
              headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }],
            },
          ];
    },
  };
}
