import { createHealthBar } from "./healthbar";
import { appendSoA, swapDeleteSoA } from "./SoA";
import { addBaseEntity, EntityType, scheduleForDelete, state } from "./state";
import { easeOutCubic, removeHurtCooldown } from "./util";

export const ASTEROID_HIT_SCALE = 0.8;
export const ASTEROID_SHRINK_DURATION = 0.15;
export const ASTEROID_DAMAGE_COLOR_DURATION = 0.15;
export const ASTEROID_STOP_DURATION = 0.12;
export const ASTEROID_HEALTH = 100;

function randomStep() {
  return Math.random() > 0.5 ? 1 : -1;
}
function createAsteroid() {
  const maxScale = 250;
  const minScale = 150;

  const maxSpeed = 120;
  const minSpeed = 100;

  let spawnX;
  let spawnY;

  if (randomStep() == 1) {
    spawnX = randomStep() * (1920 / 2 + maxScale);
    spawnY = randomStep() * (Math.random() - 0.5) * (1080 + maxScale * 2);
  } else {
    spawnX = randomStep() * (Math.random() - 0.5) * (1920 + maxScale * 2);
    spawnY = randomStep() * (1080 / 2 + maxScale);
  }

  const scale = Math.random() * (maxScale - minScale) + minScale;

  const velX =
    -(Math.abs(spawnX) / spawnX) *
    (Math.random() * (maxSpeed - minSpeed) + minSpeed);
  const velY =
    -(Math.abs(spawnY) / spawnY) *
    (Math.random() * (maxSpeed - minSpeed) + minSpeed);

  const { baseIdx, entityId } = addBaseEntity({
    type: EntityType.Asteroid,

    x: spawnX,
    y: spawnY,
    r: Math.random() * 180,

    scaleX: scale,
    scaleY: scale,

    velX,
    velY,
    velR: randomStep() * Math.random() * (50 - 10) + 10,

    aclX: 0,
    aclY: 0,
    aclR: 0,

    color: state.colors.asteroid,

    colHalfWidth: 0.5,
    colHalfHeight: 0.5,
    typeIdx: 0,
  });

  const typeIdx = appendSoA(state.asteroids, {
    health: ASTEROID_HEALTH,
    damageColorTimer: null,
    baseIdx,
    shrinkTimer: null,
    defaultScale: scale,
    defaultVelX: velX,
    defaultVelY: velY,
    stopTimer: null,
  });

  state.baseEntities.data.typeIdx[baseIdx] = typeIdx;

  createHealthBar({ x: spawnX, y: spawnY }, entityId);
}

export function asteroidUpdate() {
  const ad = state.asteroids.data;

  state.asteroidTimer += state.time.deltaTime;
  if (state.asteroidTimer >= 1) {
    createAsteroid();
    state.asteroidTimer = 0;
  }

  for (let i = 0; i < state.asteroids.len; i++) {
    const baseIdx = state.asteroids.data.baseIdx[i];
    if (ad.health[i] <= 0) {
      scheduleForDelete(state.baseEntities.data.entityId[baseIdx]);
      continue;
    }

    if (ad.damageColorTimer[i]) {
      if (ad.damageColorTimer[i]! > 0) {
        ad.damageColorTimer[i]! -= state.time.deltaTime;
      } else {
        ad.damageColorTimer[i] = null;
        state.baseEntities.data.color[baseIdx] = state.colors.asteroid;
      }
    }

    const st = ad.shrinkTimer[i];
    if (st) {
      if (st > 0) {
        const tNorm = st / ASTEROID_SHRINK_DURATION;
        const scaleMult = easeOutCubic(1 - tNorm, ASTEROID_HIT_SCALE, 1);
        state.baseEntities.data.scaleX[baseIdx] =
          ad.defaultScale[i] * scaleMult;
        state.baseEntities.data.scaleY[baseIdx] =
          ad.defaultScale[i] * scaleMult;
        ad.shrinkTimer[i]! -= state.time.deltaTime;
      } else {
        ad.shrinkTimer[i] = null;
        state.baseEntities.data.scaleX[baseIdx] = ad.defaultScale[i];
        state.baseEntities.data.scaleY[baseIdx] = ad.defaultScale[i];
      }
    }

    const stopT = ad.stopTimer[i];
    if (stopT) {
      if (stopT > 0) {
        ad.stopTimer[i]! -= state.time.deltaTime;
      } else {
        ad.stopTimer[i] = null;
        state.baseEntities.data.velX[baseIdx] = ad.defaultVelX[i];
        state.baseEntities.data.velY[baseIdx] = ad.defaultVelY[i];
      }
    }
  }

  // Count down hurt cooldowns
  const hcd = state.hurtCooldowns.data;
  for (let i = state.hurtCooldowns.len - 1; i >= 0; i--) {
    hcd.timer[i] -= state.time.deltaTime;
    if (hcd.timer[i] <= 0) {
      removeHurtCooldown(i);
    }
  }
}

export function asteroidInit() {}
