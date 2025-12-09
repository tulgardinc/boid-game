export type StructOfArrays<T> = {
  data: { [K in keyof T]: T[K][] };
  len: number;
};

export function makeSoA<T extends object>(
  capacity: number,
  defaults: T
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

type Id = number;

export function appendSoA<T extends object>(
  soa: StructOfArrays<T>,
  obj: T
): Id {
  const id = soa.len;
  for (const key in obj) {
    soa.data[key][soa.len] = obj[key];
  }

  soa.len += 1;
  return id;
}

export function swapDelete<T extends object>(
  idx: number,
  soa: StructOfArrays<T>
) {
  const lastidx = soa.len - 1;
  if (idx != lastidx) {
    for (const key of Object.keys(soa.data)) {
      soa.data[key as keyof typeof soa.data][idx] =
        soa.data[key as keyof typeof soa.data][lastidx];
    }
  }
  soa.len--;
}
