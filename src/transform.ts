import { StructOfArrays } from "./SoA";

export type Transform = {
  x: number;
  y: number;
  s: number;
  r: number;
};

export function TFToInstance(
  transformSoA: StructOfArrays<Transform>,
): Float32Array {
  let i = 0;
  const result = new Float32Array(transformSoA.len * 4);
  for (let j = 0; j < transformSoA.len; j++) {
    result[i++] = transformSoA.data.x[j];
    result[i++] = transformSoA.data.y[j];
    result[i++] = transformSoA.data.s[j];
    result[i++] = (transformSoA.data.r[j] * Math.PI) / 180;
  }

  return result;
}
