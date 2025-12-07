import { state } from "./state";

export function physicsUpdate() {
  const tx = state.transforms.data.x;
  const ty = state.transforms.data.y;
  const tr = state.transforms.data.r;
  const ax = state.accelerations.data.x;
  const ay = state.accelerations.data.y;
  const ar = state.accelerations.data.r;
  const vx = state.velocities.data.x;
  const vy = state.velocities.data.y;
  const vr = state.velocities.data.r;

  for (let i = 0; i < state.physicsObjects.len; i++) {
    const tid = state.physicsObjects.data.transformId[i];
    const aid = state.physicsObjects.data.accelerationId[i];
    const vid = state.physicsObjects.data.velocityId[i];

    vx[vid] += ax[aid] * state.time.deltaTime;
    vy[vid] += ay[aid] * state.time.deltaTime;
    vr[vid] += ar[aid] * state.time.deltaTime;

    tx[tid] += vx[vid] * state.time.deltaTime;
    ty[tid] += vy[vid] * state.time.deltaTime;
    tr[tid] = tr[tid] + ((vr[vid] * state.time.deltaTime) % 360);
  }
}

export function angleDiff(a: number, b: number) {
  let d = a - b;
  return ((d + 180) % 360) - 180;
}
