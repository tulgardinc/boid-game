import { makeSoA } from "./SoA";
import { Transform } from "./transform";

export const state = {
  asteroidTransforms: makeSoA<Transform>(100, { x: 0, y: 0, s: 0, r: 0 }),
};
