export const INTERSECTION_EXIT_RATIO = 0.02;
export const INTERSECTION_ENTER_RATIO = 0.1;
export const INTERSECTION_THRESHOLDS = [
  0,
  INTERSECTION_EXIT_RATIO,
  INTERSECTION_ENTER_RATIO,
] as const;

/**
 * IntersectionObserver keeps its threshold index at equality, so exiting uses
 * strictly below the exit threshold while entering uses the inclusive threshold.
 */
export function shouldRenderAtIntersection(
  wasVisible: boolean,
  isIntersecting: boolean,
  ratio: number,
): boolean {
  if (!isIntersecting) {
    return false;
  }

  return wasVisible
    ? ratio >= INTERSECTION_EXIT_RATIO
    : ratio >= INTERSECTION_ENTER_RATIO;
}
