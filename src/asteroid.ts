import { createHealthBar } from "./healthbar";
import { appendSoA } from "./SoA";
import {
  addBaseEntity,
  EntityType,
  ParticleInterpolationFn,
  ParticleShape,
  scheduleForDelete,
  state,
} from "./state";
import { easeOutCubic, moveTowardsArrive, removeHurtCooldown } from "./util";

export const ASTEROID_HIT_SCALE = 0.8;
export const ASTEROID_SHRINK_DURATION = 0.15;
export const ASTEROID_DAMAGE_COLOR_DURATION = 0.1;
export const ASTEROID_STOP_DURATION = 0.1;
export const ASTEROID_KNOCKBACK_RECOVERY_DURATION = 0.4;
export const ASTEROID_DEATH_DELAY = 0.15;
export const ASTEROID_HEALTH = 100;
export const ASTEROID_MAX_VEL_R = 90;
export const ASTEROID_RETURN_VEL_R_SPEED = 150;

const MAX_SCALE = 250;
const MIN_SCALE = 150;

const MAX_SPEED = 120;
const MIN_SPEED = 100;

function randomStep() {
  return Math.random() > 0.5 ? 1 : -1;
}
function createAsteroid() {
  let spawnX;
  let spawnY;

  if (randomStep() == 1) {
    spawnX = randomStep() * (1920 / 2 + MAX_SCALE);
    spawnY = randomStep() * (Math.random() - 0.5) * (1080 + MAX_SCALE * 2);
  } else {
    spawnX = randomStep() * (Math.random() - 0.5) * (1920 + MAX_SCALE * 2);
    spawnY = randomStep() * (1080 / 2 + MAX_SCALE);
  }

  const scale = Math.random() * (MAX_SCALE - MIN_SCALE) + MIN_SCALE;

  const velX =
    -(Math.abs(spawnX) / spawnX) *
    (Math.random() * (MAX_SPEED - MIN_SPEED) + MIN_SPEED);
  const velY =
    -(Math.abs(spawnY) / spawnY) *
    (Math.random() * (MAX_SPEED - MIN_SPEED) + MIN_SPEED);
  const velR = randomStep() * Math.random() * (50 - 10) + 10;

  const { baseIdx, entityId } = addBaseEntity({
    type: EntityType.Asteroid,

    x: spawnX,
    y: spawnY,
    r: Math.random() * 180,

    scaleX: scale,
    scaleY: scale,

    velX,
    velY,
    velR,

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
    stopExpirey: null,
    deathExpirey: null,
    outerHealthBarEntityId: 0,
    knockbackVelX: 0,
    knockbackVelY: 0,
    recoverKnockbackTimer: null,
    knockbackVelRDelta: 0,
    knockbackVelRStore: 0,
  });

  state.baseEntities.data.typeIdx[baseIdx] = typeIdx;

  const outerHealthBarEntityId = createHealthBar(
    { x: spawnX, y: spawnY },
    entityId
  );
  state.asteroids.data.outerHealthBarEntityId[typeIdx] = outerHealthBarEntityId;
}

export function spawnAsteroidDeathParticles(x: number, y: number, r: number) {
  appendSoA(state.particleEmitters, {
    count: 30,
    lifeTime: 0.85,
    posMinX: x,
    posMinY: y,
    posMaxX: x,
    posMaxY: y,
    r,
    spread: 180,
    speedMin: 10,
    speedMax: 500,
    shapeId: ParticleShape.Quad,
    sizeFnId: ParticleInterpolationFn.Linear,
    colorFnId: ParticleInterpolationFn.Linear,
    scaleInitX: 40,
    scaleInitY: 40,
    scaleFinalX: 5,
    scaleFinalY: 5,
    colorInitR: 1,
    colorInitG: 0,
    colorInitB: 0,
    colorInitA: 0.9,
    colorFinalR: 1,
    colorFinalG: 0,
    colorFinalB: 0.6,
    colorFinalA: 0,
  });
  appendSoA(state.particleEmitters, {
    count: 1,
    lifeTime: 0.8,
    posMinX: x,
    posMinY: y,
    posMaxX: x,
    posMaxY: y,
    r,
    spread: 0,
    speedMin: 0,
    speedMax: 0,
    shapeId: ParticleShape.Circle,
    sizeFnId: ParticleInterpolationFn.EaseOut,
    colorFnId: ParticleInterpolationFn.EaseOut,
    scaleInitX: 40,
    scaleInitY: 40,
    scaleFinalX: 600,
    scaleFinalY: 600,
    colorInitR: 1,
    colorInitG: 1,
    colorInitB: 1,
    colorInitA: 0.8,
    colorFinalR: 1,
    colorFinalG: 1,
    colorFinalB: 1,
    colorFinalA: 0,
  });
}

function scheduleAsteroidForDelete(astrId: number) {
  const astrIdx = state.baseEntities.data.typeIdx[state.idToBaseLookup[astrId]];
  const outerId = state.asteroids.data.outerHealthBarEntityId[astrIdx];
  const outerIdx =
    state.baseEntities.data.typeIdx[state.idToBaseLookup[outerId]];
  scheduleForDelete(state.outerHealthBars.data.innerEntityId[outerIdx]);
  scheduleForDelete(state.outerHealthBars.data.transitionEntityId[outerIdx]);
  scheduleForDelete(outerId);
  scheduleForDelete(astrId);
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

    if (ad.health[i] <= 0 && ad.deathExpirey[i] == null) {
      ad.deathExpirey[i] = state.time.now + ASTEROID_DEATH_DELAY;
    }

    if (ad.deathExpirey[i] && state.time.now >= ad.deathExpirey[i]!) {
      state.score += 50;
      spawnAsteroidDeathParticles(d.x[baseIdx], d.y[baseIdx], d.r[baseIdx]);
      scheduleAsteroidForDelete(d.entityId[baseIdx]);
      continue;
    }

    if (
      Math.abs(d.x[baseIdx]) > 1920 / 2 + MAX_SCALE ||
      Math.abs(d.y[baseIdx]) > 1080 / 2 + MAX_SCALE
    ) {
      scheduleAsteroidForDelete(d.entityId[baseIdx]);
      continue;
    }

    if (
      ad.damageColorExpiry[i] &&
      !ad.deathExpirey[i] &&
      state.time.now >= ad.damageColorExpiry[i]!
    ) {
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

    if (ad.stopExpirey[i] && state.time.now >= ad.stopExpirey[i]!) {
      ad.stopExpirey[i] = null;
      ad.recoverKnockbackTimer[i] = ASTEROID_KNOCKBACK_RECOVERY_DURATION;
      d.velR[baseIdx] = ad.knockbackVelRStore[i] + ad.knockbackVelRDelta[i];
      ad.knockbackVelRDelta[i] = 0;
    }

    if (
      ad.stopExpirey[i] == null &&
      Math.abs(d.velR[baseIdx]) >= ASTEROID_MAX_VEL_R
    ) {
      d.velR[baseIdx] = moveTowardsArrive(
        d.velR[baseIdx],
        Math.sign(d.velR[baseIdx]) * ASTEROID_MAX_VEL_R,
        ASTEROID_RETURN_VEL_R_SPEED,
        ASTEROID_MAX_VEL_R / 4,
        state.time.deltaTime
      );
    }

    const rt = ad.recoverKnockbackTimer[i];
    if (rt) {
      if (rt > 0) {
        const tNorm = rt / ASTEROID_KNOCKBACK_RECOVERY_DURATION;
        d.velX[baseIdx] = easeOutCubic(
          1 - tNorm,
          ad.knockbackVelX[i],
          ad.defaultVelX[i]
        );
        d.velY[baseIdx] = easeOutCubic(
          1 - tNorm,
          ad.knockbackVelY[i],
          ad.defaultVelY[i]
        );
        ad.recoverKnockbackTimer[i]! -= state.time.deltaTime;
      } else {
        ad.recoverKnockbackTimer[i] = null;
        d.velX[baseIdx] = ad.defaultVelX[i];
        d.velY[baseIdx] = ad.defaultVelY[i];
      }
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
