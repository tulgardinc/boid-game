import {
  ASTEROID_DAMAGE_COLOR_DURATION,
  ASTEROID_HIT_SCALE,
  ASTEROID_SHRINK_DURATION,
  ASTEROID_STOP_DURATION,
  spawnAsteroidDeathParticles,
} from "./asteroid";
import { BOID_DAMAGE } from "./boid";
import { appendSoA, swapDeleteSoA } from "./SoA";
import { EntityType, state } from "./state";

export const HURT_COOLDOWN_DURATION = 0.5;

export function addHurtCooldown(
  asteroidId: number,
  boidId: number,
  expiry: number
) {
  const key = `${asteroidId}-${boidId}`;
  state.cantHurtSet.add(key);
  appendSoA(state.hurtCooldowns, {
    asteroidId,
    boidId,
    expiry,
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

function closestPointOnOBB(
  px: number,
  py: number,
  cx: number,
  cy: number,
  rightX: number,
  rightY: number,
  upX: number,
  upY: number,
  hx: number,
  hy: number
) {
  // point in box local coordinates
  const dx = px - cx;
  const dy = py - cy;

  const localX = dx * rightX + dy * rightY;
  const localY = dx * upX + dy * upY;

  // clamp to box extents
  const clampedX = Math.min(Math.max(localX, -hx), hx);
  const clampedY = Math.min(Math.max(localY, -hy), hy);

  // back to world
  return {
    x: cx + rightX * clampedX + upX * clampedY,
    y: cy + rightY * clampedX + upY * clampedY,
  };
}

export function getEntityUp(baseIdx: number) {
  const rad = (state.baseEntities.data.r[baseIdx] * Math.PI) / 180;
  return {
    x: -Math.sin(rad),
    y: Math.cos(rad),
  };
}

export function getEntityRight(baseIdx: number) {
  const rad = (state.baseEntities.data.r[baseIdx] * Math.PI) / 180;
  return { x: Math.cos(rad), y: Math.sin(rad) };
}

export function detectCollisionsOBB() {
  const d = state.baseEntities.data;

  for (let i = 0; i < state.baseEntities.len - 1; i++) {
    for (let j = i + 1; j < state.baseEntities.len; j++) {
      const diffX = d.x[i] - d.x[j];
      const diffY = d.y[i] - d.y[j];

      const aRad = (d.r[i] * Math.PI) / 180;
      const aUp = { x: -Math.sin(aRad), y: Math.cos(aRad) };
      const aRight = { x: aUp.y, y: -aUp.x };
      const bRad = (d.r[j] * Math.PI) / 180;
      const bUp = { x: -Math.sin(bRad), y: Math.cos(bRad) };
      const bRight = { x: bUp.y, y: -bUp.x };

      const vectors = [aRight, aUp, bRight, bUp];

      let collision = true;
      let minPen = Infinity;
      let minVec = { x: 0, y: 0 };

      for (const v of vectors) {
        const dProj = Math.abs(diffX * v.x + diffY * v.y);

        const rA =
          d.colHalfWidth[i] *
            d.scaleX[i] *
            Math.abs(aRight.x * v.x + aRight.y * v.y) +
          d.colHalfHeight[i] *
            d.scaleY[i] *
            Math.abs(aUp.x * v.x + aUp.y * v.y);
        const rB =
          d.colHalfWidth[j] *
            d.scaleX[j] *
            Math.abs(bRight.x * v.x + bRight.y * v.y) +
          d.colHalfHeight[j] *
            d.scaleY[j] *
            Math.abs(bUp.x * v.x + bUp.y * v.y);

        if (dProj > rA + rB) {
          collision = false;
          break;
        }

        const pen = rA + rB - dProj;
        if (pen < minPen) {
          minPen = pen;
          minVec = { x: v.x, y: v.y };
        }
      }

      if (!collision) continue;

      let nx = minVec.x;
      let ny = minVec.y;

      if (diffX * nx + diffY * ny > 0) {
        nx = -nx;
        ny = -ny;
      }

      state.collisions.push({
        entityABaseIdx: i,
        entityBBaseIdx: j,
        vector: { x: nx, y: ny },
      });
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
    let aIsBoid = false;
    if (
      d.type[aBaseIdx] == EntityType.Boid &&
      d.type[bBaseIdx] == EntityType.Asteroid
    ) {
      boidBaseIdx = aBaseIdx;
      astrBaseIdx = bBaseIdx;
      aIsBoid = true;
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

      state.asteroids.data.damageColorExpiry[astrIdx] =
        state.time.now + ASTEROID_DAMAGE_COLOR_DURATION;
      d.color[astrBaseIdx] = state.colors.asteroidHurt;

      state.asteroids.data.shrinkTimer[astrIdx] = ASTEROID_SHRINK_DURATION;
      state.baseEntities.data.scaleX[astrBaseIdx] = ASTEROID_HIT_SCALE;
      state.baseEntities.data.scaleY[astrBaseIdx] = ASTEROID_HIT_SCALE;

      state.asteroids.data.stopExpirey[astrIdx] =
        state.time.now + ASTEROID_STOP_DURATION;
      d.velX[astrBaseIdx] = 0;
      d.velY[astrBaseIdx] = 0;
      state.asteroids.data.knockbackVelRStore[astrIdx] = d.velR[astrBaseIdx];
      d.velR[astrBaseIdx] = 0;

      const colVecForAstr = !aIsBoid
        ? { x: -collision.vector.x, y: -collision.vector.y }
        : collision.vector;

      state.asteroids.data.knockbackVelX[astrIdx] = colVecForAstr.x * 1000;
      state.asteroids.data.knockbackVelY[astrIdx] = colVecForAstr.y * 1000;

      state.camera.x += colVecForAstr.x * 15;
      state.camera.y += colVecForAstr.y * 15;

      const astrUp = getEntityUp(astrBaseIdx);
      const astrRight = getEntityRight(astrBaseIdx);
      const point = closestPointOnOBB(
        d.x[boidBaseIdx],
        d.y[boidBaseIdx],
        d.x[astrBaseIdx],
        d.y[astrBaseIdx],
        astrRight.x,
        astrRight.y,
        astrUp.x,
        astrUp.y,
        d.colHalfWidth[astrBaseIdx],
        d.colHalfHeight[astrBaseIdx]
      );

      const leverX = point.x - d.x[astrBaseIdx];
      const leverY = point.y - d.y[astrBaseIdx];
      const rotSign = Math.sign(
        leverX * colVecForAstr.y - leverY * colVecForAstr.x
      );

      const ROT_IMPULSE = 200;

      state.asteroids.data.knockbackVelRDelta[astrIdx] += rotSign * ROT_IMPULSE;
      d.r[astrBaseIdx] += rotSign * 10;
      state.camera.r += rotSign * 0.3;

      addHurtCooldown(
        asteroidId,
        boidId,
        state.time.now + HURT_COOLDOWN_DURATION
      );
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

export function moveTowardsArrive(
  current: number,
  target: number,
  maxSpeed: number,
  slowRadius: number,
  dt: number
) {
  const delta = target - current;
  const dist = Math.abs(delta);

  if (dist < 0.001) return target;

  const speed = dist > slowRadius ? maxSpeed : (maxSpeed * dist) / slowRadius;

  const step = speed * dt;

  return dist <= step ? target : current + Math.sign(delta) * step;
}
