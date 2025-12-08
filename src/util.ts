import { ColliderType } from "./collider";
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

export function detectCollisions() {
  for (let i = 0; i < state.colliders.len - 1; i++) {
    const colAHeight = state.colliders.data.halfHeight[i];
    const colAWidth = state.colliders.data.halfWidth[i];
    const colATid = state.colliders.data.transformId[i];
    const colAx = state.transforms.data.x[colATid];
    const colAy = state.transforms.data.y[colATid];
    const colAs = state.transforms.data.s[colATid];

    const colALeft = colAx - colAWidth * colAs;
    const colARight = colAx + colAWidth * colAs;
    const colATop = colAy + colAHeight * colAs;
    const colABottom = colAy - colAHeight * colAs;

    for (let j = i + 1; j < state.colliders.len; j++) {
      const colBHeight = state.colliders.data.halfHeight[j];
      const colBWidth = state.colliders.data.halfWidth[j];
      const colBTid = state.colliders.data.transformId[j];
      const colBx = state.transforms.data.x[colBTid];
      const colBy = state.transforms.data.y[colBTid];
      const colBs = state.transforms.data.s[colBTid];

      const colBLeft = colBx - colBWidth * colBs;
      const colBRight = colBx + colBWidth * colBs;
      const colBTop = colBy + colBHeight * colBs;
      const colBBottom = colBy - colBHeight * colBs;

      if (
        colALeft < colBRight &&
        colARight > colBLeft &&
        colABottom < colBTop &&
        colATop > colBBottom
      ) {
        state.collisions.push({
          colliderAId: i,
          colliderBId: j,
        });
      }
    }
  }
}

export function handleCollisions() {
  for (const collision of state.collisions) {
    const colAId = collision.colliderAId;
    const colBId = collision.colliderBId;

    let boidColId;
    if (
      state.colliders.data.type[colAId] == ColliderType.Boid &&
      state.colliders.data.type[colBId] == ColliderType.Asteroid
    ) {
      boidColId = colAId;
    } else if (
      state.colliders.data.type[colAId] == ColliderType.Asteroid &&
      state.colliders.data.type[colBId] == ColliderType.Boid
    ) {
      boidColId = colBId;
    } else {
      continue;
    }

    const boidPid = console.log("HIT");
  }
}

export function angleDiff(a: number, b: number) {
  let d = a - b;
  return ((d + 180) % 360) - 180;
}
