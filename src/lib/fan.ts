export interface FanConfig {
  rotateStepDeg: number;
  arcStepPx: number;
  expandGapPx: number;
  expandRowGapPx: number;
}

export const DEFAULT_FAN_CONFIG: FanConfig = {
  rotateStepDeg: 0.5,
  arcStepPx: 3,
  expandGapPx: 18,
  expandRowGapPx: 10,
};
