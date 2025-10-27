export type StructOfArrays<T> = {
  data: { [K in keyof T]: T[K][] };
  len: number;
};

export function makeSoA<T extends object>(
  capacity: number,
  defaults: T,
): StructOfArrays<T> {
  const result = {
    len: 0,
    data: {},
  } as StructOfArrays<T>;
  for (const key in defaults) {
    result.data[key] = Array(capacity).fill(defaults[key]);
  }
  return result;
}

export function appendSoA<T extends object>(soa: StructOfArrays<T>, obj: T) {
  for (const key in obj) {
    soa.data[key][soa.len] = obj[key];
  }

  soa.len += 1;
}

export function viewSoA<T extends object>(
  soa: StructOfArrays<T>,
  index: number,
): T {
  return new Proxy({} as T, {
    get(_, prop) {
      if (typeof prop == "string" && prop in soa) {
        return soa.data[prop as keyof T][index];
      }
    },
    set(_, prop, value) {
      if (typeof prop == "string" && prop in soa) {
        soa.data[prop as keyof T][index] = value;
        return true;
      }
      return false;
    },
  });
}

const vec = makeSoA(10, { x: 0, y: 0 });
viewSoA(vec, 3).x = 10;
