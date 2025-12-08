import { EntityType, state } from "./state";

export function physicsUpdate() {
  for (let i = 0; i < state.baseEntities.len; i++) {
    const d = state.baseEntities.data;

    d.velX[i] += d.aclX[i] * state.time.deltaTime;
    d.velY[i] += d.aclY[i] * state.time.deltaTime;
    d.velR[i] += d.aclR[i] * state.time.deltaTime;

    d.x[i] += d.velX[i] * state.time.deltaTime;
    d.y[i] += d.velY[i] * state.time.deltaTime;
    d.r[i] = d.r[i] + ((d.velR[i] * state.time.deltaTime) % 360);
  }
}

export function detectCollisions() {
  const d = state.baseEntities.data;

  for (let i = 0; i < state.baseEntities.len - 1; i++) {
    const colALeft = d.x[i] - d.colHalfWidth[i] * d.s[i];
    const colARight = d.x[i] + d.colHalfWidth[i] * d.s[i];
    const colATop = d.y[i] + d.colHalfHeight[i] * d.s[i];
    const colABottom = d.y[i] - d.colHalfHeight[i] * d.s[i];

    for (let j = i + 1; j < state.baseEntities.len; j++) {
      const colBLeft = d.x[j] - d.colHalfWidth[j] * d.s[j];
      const colBRight = d.x[j] + d.colHalfWidth[j] * d.s[j];
      const colBTop = d.y[j] + d.colHalfHeight[j] * d.s[j];
      const colBBottom = d.y[j] - d.colHalfHeight[j] * d.s[j];

      if (
        colALeft < colBRight &&
        colARight > colBLeft &&
        colABottom < colBTop &&
        colATop > colBBottom
      ) {
        state.collisions.push({
          entityAId: i,
          entityBId: j,
        });
      }
    }
  }
}

export function handleCollisions() {
  const d = state.baseEntities.data;

  for (const collision of state.collisions) {
    const aId = collision.entityAId;
    const bId = collision.entityBId;

    let boidId;
    if (d.type[aId] == EntityType.Boid && d.type[bId] == EntityType.Asteroid) {
      boidId = aId;
    } else if (
      d.type[aId] == EntityType.Asteroid &&
      d.type[bId] == EntityType.Boid
    ) {
      boidId = bId;
    } else {
      continue;
    }

    const speed = Math.sqrt(
      d.velX[boidId] * d.velX[boidId] + d.velY[boidId] * d.velY[boidId]
    );

    if (speed > 500) {
      console.log("HIT");
    }
  }

  state.collisions.length = 0;
}

export function angleDiff(a: number, b: number) {
  let d = a - b;
  return ((d + 180) % 360) - 180;
}
