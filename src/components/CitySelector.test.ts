// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { getRegisteredCities } from '@/domain/cities/cities';
import { getCityDisplayName } from '@/domain/cities/city-config';
import { CitySelector } from './CitySelector';

const navigation = vi.hoisted(() => ({
  pathname: '/city/phoenix-az',
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}));

it('keeps selection URL-driven through pending navigation and destination changes', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const options = getRegisteredCities().map((city) => ({
    slug: city.slug,
    label: getCityDisplayName(city),
  }));

  try {
    await act(() => root.render(createElement(CitySelector, { options })));
    const select = container.querySelector('select')!;
    expect(select.getAttribute('aria-label')).toBe('Choose city');
    expect(Array.from(select.options, (option) => option.text)).toEqual([
      'Phoenix',
      'City A (Demo)',
      'City B (Demo)',
    ]);
    expect(select.value).toBe('phoenix-az');

    await act(() => {
      select.value = 'city-a';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(navigation.push).toHaveBeenCalledWith('/city/city-a');
    expect(select.value).toBe('phoenix-az');

    for (const slug of ['city-a', 'city-b', 'city-a', 'city-b', 'phoenix-az']) {
      navigation.pathname = `/city/${slug}`;
      await act(() => root.render(createElement(CitySelector, { options })));
      expect(select.value).toBe(slug);
      expect(select.selectedOptions[0]?.value).toBe(slug);
    }
  } finally {
    await act(() => root.unmount());
    container.remove();
    navigation.pathname = '/city/phoenix-az';
    navigation.push.mockReset();
    vi.unstubAllGlobals();
  }
});
