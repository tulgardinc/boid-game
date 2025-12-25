import {
  ASTEROID_DAMAGE_COLOR_DURATION,
  ASTEROID_HIT_SCALE,
  ASTEROID_SHRINK_DURATION,
  ASTEROID_STOP_DURATION,
} from "./asteroid";
import { BOID_DAMAGE } from "./boid";
import { appendSoA, swapDeleteSoA } from "./SoA";
import { EntityType, state } from "./state";

export const HURT_COOLDOWN_DURATION = 0.5;

export function addHurtCooldown(
  asteroidId: number,
  boidId: number,
  timer: number
) {
  const key = `${asteroidId}-${boidId}`;
  state.cantHurtSet.add(key);
  appendSoA(state.hurtCooldowns, {
    asteroidId,
    boidId,
    timer,
  });
}

export function removeHurtCooldown(index: number) {
  const hcd = state.hurtCooldowns.data;
  const key = `${hcd.asteroidId[index]}-${hcd.boidId[index]}`;
  state.cantHurtSet.delete(key);
  swapDeleteSoA(index, state.hurtCooldowns);
}

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
    const colALeft = d.x[i] - d.colHalfWidth[i] * d.scaleX[i];
    const colARight = d.x[i] + d.colHalfWidth[i] * d.scaleX[i];
    const colATop = d.y[i] + d.colHalfHeight[i] * d.scaleY[i];
    const colABottom = d.y[i] - d.colHalfHeight[i] * d.scaleY[i];

    for (let j = i + 1; j < state.baseEntities.len; j++) {
      const colBLeft = d.x[j] - d.colHalfWidth[j] * d.scaleX[j];
      const colBRight = d.x[j] + d.colHalfWidth[j] * d.scaleX[j];
      const colBTop = d.y[j] + d.colHalfHeight[j] * d.scaleY[j];
      const colBBottom = d.y[j] - d.colHalfHeight[j] * d.scaleY[j];

      if (
        colALeft < colBRight &&
        colARight > colBLeft &&
        colABottom < colBTop &&
        colATop > colBBottom
      ) {
        state.collisions.push({
          entityABaseIdx: i,
          entityBBaseIdx: j,
        });
      }
    }
  }
}

let frameCounter = 0;

export function handleCollisions() {
  const d = state.baseEntities.data;
  const curCollisions = new Set<string>();

  for (const collision of state.collisions) {
    const aBaseIdx = collision.entityABaseIdx;
    const bBaseIdx = collision.entityBBaseIdx;

    const asteroidId = d.entityId[aBaseIdx];
    const boidId = d.entityId[bBaseIdx];
    const key = `${asteroidId}-${boidId}`;

    curCollisions.add(key);

    if (state.prevCollisions.has(key)) continue;

    let boidBaseIdx;
    let astrBaseIdx;
    if (
      d.type[aBaseIdx] == EntityType.Boid &&
      d.type[bBaseIdx] == EntityType.Asteroid
    ) {
      boidBaseIdx = aBaseIdx;
      astrBaseIdx = bBaseIdx;
    } else if (
      d.type[aBaseIdx] == EntityType.Asteroid &&
      d.type[bBaseIdx] == EntityType.Boid
    ) {
      astrBaseIdx = aBaseIdx;
      boidBaseIdx = bBaseIdx;
    } else {
      continue;
    }

    const speed = Math.sqrt(
      d.velX[boidBaseIdx] * d.velX[boidBaseIdx] +
        d.velY[boidBaseIdx] * d.velY[boidBaseIdx]
    );

    if (state.cantHurtSet.has(key)) continue;

    const astrIdx = state.baseEntities.data.typeIdx[astrBaseIdx];

    if (speed > 500) {
      state.asteroids.data.health[astrIdx] -= BOID_DAMAGE;

      state.asteroids.data.damageColorTimer[astrIdx] =
        ASTEROID_DAMAGE_COLOR_DURATION;
      d.color[astrBaseIdx] = state.colors.asteroidHurt;

      state.asteroids.data.shrinkTimer[astrIdx] = ASTEROID_SHRINK_DURATION;
      state.baseEntities.data.scaleX[astrBaseIdx] = ASTEROID_HIT_SCALE;
      state.baseEntities.data.scaleY[astrBaseIdx] = ASTEROID_HIT_SCALE;

      state.asteroids.data.stopTimer[astrIdx] = ASTEROID_STOP_DURATION;
      state.baseEntities.data.velX[astrBaseIdx] = 0;
      state.baseEntities.data.velY[astrBaseIdx] = 0;

      addHurtCooldown(asteroidId, boidId, HURT_COOLDOWN_DURATION);
    }
  }

  for (const key of state.prevCollisions) {
    if (!curCollisions.has(key)) {
      state.prevCollisions.delete(key);
    }
  }

  state.prevCollisions = curCollisions;
  state.collisions.length = 0;
  frameCounter++;
}

export function angleDiff(a: number, b: number) {
  let d = a - b;
  return ((((d + 180) % 360) + 360) % 360) - 180;
}

export function lerp(t: number, a: number, b: number) {
  return (1 - t) * a + t * b;
}

export function easeOutCubic(t: number, a: number, b: number) {
  return a + (b - a) * (1 - Math.pow(1 - t, 3));
}

export function expApproach(
  current: number,
  target: number,
  dt: number,
  halfLifeSeconds: number
) {
  const k = Math.log(2) / halfLifeSeconds;
  const a = 1 - Math.exp(-k * dt); // 0..1 blend factor, framerate independent
  return current + (target - current) * a;
}
