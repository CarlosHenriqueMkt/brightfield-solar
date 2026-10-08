import { describe, expect, it } from 'vitest';
import { GET } from './route';
import { SITE_ORIGIN } from '@/domain/site';

describe('public llms resource', () => {
  it('does not advertise the unavailable root while preserving city resources', async () => {
    const response = GET();
    const text = await response.text();

    expect(response.headers.get('content-type')).toBe(
      'text/plain; charset=utf-8',
    );
    expect(text).not.toContain(`${SITE_ORIGIN}/)`);
    expect(text).not.toContain('[Homepage]');
    expect(text).toContain(`${SITE_ORIGIN}/city/phoenix-az`);
    expect(text).toContain(`${SITE_ORIGIN}/city/phoenix-az/index.md`);
    expect(text).toContain(`${SITE_ORIGIN}/robots.txt`);
    expect(text).toContain(`${SITE_ORIGIN}/sitemap.xml`);
  });
});
