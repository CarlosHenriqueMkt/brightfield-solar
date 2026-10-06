import { describe, expect, it } from 'vitest';
import {
  INTERSECTION_ENTER_RATIO,
  INTERSECTION_EXIT_RATIO,
  shouldRenderAtIntersection,
} from './visibility';

describe('scene visibility hysteresis', () => {
  it('pauses active content only below the exit threshold', () => {
    let visible = true;
    for (const ratio of [0.12, 0.0295, 0.0082])
      visible = shouldRenderAtIntersection(visible, true, ratio);
    expect(visible).toBe(false);
    expect(
      shouldRenderAtIntersection(true, true, INTERSECTION_EXIT_RATIO),
    ).toBe(true);
    expect(
      shouldRenderAtIntersection(
        true,
        true,
        INTERSECTION_EXIT_RATIO - 0.000001,
      ),
    ).toBe(false);
    expect(
      shouldRenderAtIntersection(
        true,
        true,
        INTERSECTION_EXIT_RATIO + 0.000001,
      ),
    ).toBe(true);
  });

  it('enters inactive content only at the inclusive enter threshold', () => {
    let visible = false;
    for (const ratio of [0, 0.0082, 0.0295, 0.099])
      visible = shouldRenderAtIntersection(visible, true, ratio);
    expect(visible).toBe(false);
    expect(
      shouldRenderAtIntersection(
        false,
        true,
        INTERSECTION_ENTER_RATIO - 0.000001,
      ),
    ).toBe(false);
    expect(
      shouldRenderAtIntersection(false, true, INTERSECTION_ENTER_RATIO),
    ).toBe(true);
    expect(
      shouldRenderAtIntersection(
        false,
        true,
        INTERSECTION_ENTER_RATIO + 0.000001,
      ),
    ).toBe(true);
  });

  it('does not alternate while ratios oscillate inside the hysteresis band', () => {
    for (const initial of [false, true]) {
      let visible = initial;
      for (const ratio of [0.021, 0.0295, 0.020001, 0.08, 0.0201, 0.099]) {
        visible = shouldRenderAtIntersection(visible, true, ratio);
        expect(visible).toBe(initial);
      }
    }
  });

  it('forces non-intersecting content off before re-entry', () => {
    expect(shouldRenderAtIntersection(true, false, 1)).toBe(false);
    expect(
      shouldRenderAtIntersection(false, true, INTERSECTION_ENTER_RATIO - 0.001),
    ).toBe(false);
    expect(
      shouldRenderAtIntersection(false, true, INTERSECTION_ENTER_RATIO),
    ).toBe(true);
  });
});
