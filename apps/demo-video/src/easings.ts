import { Easing } from "remotion";

export const easings = {
  standard: Easing.bezier(0.4, 0, 0.2, 1),
  soft: Easing.bezier(0.25, 0.46, 0.45, 0.94),
  slowInLand: Easing.bezier(0.2, 0.9, 0.1, 1),
  maskReveal: Easing.bezier(0.33, 1, 0.68, 1),
  violentPush: Easing.bezier(0.7, 0, 0.1, 1),
};
