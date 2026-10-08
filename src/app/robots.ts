import type { MetadataRoute } from 'next';
import { canonicalUrl, isProductionDeployment } from '@/domain/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    ...(isProductionDeployment() && { sitemap: canonicalUrl('/sitemap.xml') }),
  };
}
