import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import NotFound from './not-found';

describe('not-found surface', () => {
  it('offers a city recovery destination without linking to the unavailable root', () => {
    const markup = renderToStaticMarkup(createElement(NotFound));

    expect(markup).toContain('href="/city/phoenix-az"');
    expect(markup).not.toContain('href="/"');
  });
});
