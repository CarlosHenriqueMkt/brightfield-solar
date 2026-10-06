import { describe, expect, it } from 'vitest';
import { PANEL_TWEEN_DURATION, panelAnimationInterval } from './viewer';

describe('panel animation boundaries', () => {
  it('keeps the complete installation within 1.5 seconds for every occupancy', () => {
    for (let panels = 1; panels <= 51; panels += 1) {
      const interval = panelAnimationInterval(panels);
      expect(interval).toBeGreaterThan(0);
      expect(
        (panels - 1) * interval + PANEL_TWEEN_DURATION,
      ).toBeLessThanOrEqual(1500);
    }
  });
});
