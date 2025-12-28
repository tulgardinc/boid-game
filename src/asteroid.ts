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
    damageColorExpiry: null,
    baseIdx,
    shrinkTimer: null,
    defaultScale: scale,
    defaultVelX: velX,
    defaultVelY: velY,
    stopExpiry: null,
  });

  state.baseEntities.data.typeIdx[baseIdx] = typeIdx;

  createHealthBar({ x: spawnX, y: spawnY }, entityId);
}

export function spawnAsteroidDeathParticles(x: number, y: number) {
  const VEL = 250;
  appendSoA(state.particleEmitters, {
    count: 20,
    lifeTime: 1.5,
    posMinX: x,
    posMinY: y,
    posMaxX: x,
    posMaxY: y,
    velMinX: -VEL,
    velMinY: -VEL,
    velMaxX: VEL,
    velMaxY: VEL,
    scaleInitX: 40,
    scaleInitY: 40,
    scaleFinalX: 5,
    scaleFinalY: 5,
    colorInitR: 1,
    colorInitG: 0,
    colorInitB: 0,
    colorInitA: 0.8,
    colorFinalR: 0.6,
    colorFinalG: 0,
    colorFinalB: 1,
    colorFinalA: 0,
  });
}

export function asteroidUpdate() {
  const ad = state.asteroids.data;
  const d = state.baseEntities.data;

  if (state.time.now >= state.nextAsteroidSpawn) {
    createAsteroid();
    state.nextAsteroidSpawn = state.time.now + 1;
  }

  for (let i = 0; i < state.asteroids.len; i++) {
    const baseIdx = state.asteroids.data.baseIdx[i];
    if (ad.health[i] <= 0) {
      spawnAsteroidDeathParticles(d.x[baseIdx], d.y[baseIdx]);
      scheduleForDelete(d.entityId[baseIdx]);
      continue;
    }

    if (ad.damageColorExpiry[i] && state.time.now >= ad.damageColorExpiry[i]!) {
      ad.damageColorExpiry[i] = null;
      state.baseEntities.data.color[baseIdx] = state.colors.asteroid;
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

    if (ad.stopExpiry[i] && state.time.now >= ad.stopExpiry[i]!) {
      ad.stopExpiry[i] = null;
      state.baseEntities.data.velX[baseIdx] = ad.defaultVelX[i];
      state.baseEntities.data.velY[baseIdx] = ad.defaultVelY[i];
    }
  }

  // Remove expired hurt cooldowns
  for (let i = state.hurtCooldowns.len - 1; i >= 0; i--) {
    if (state.time.now >= state.hurtCooldowns.data.expiry[i]) {
      removeHurtCooldown(i);
    }
  }
}

export function asteroidInit() {}
