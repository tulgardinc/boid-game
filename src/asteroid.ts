import { createHealthBar } from "./healthbar";
import { appendSoA } from "./SoA";
import { addBaseEntity, EntityType, scheduleForDelete, state } from "./state";

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

  const { baseId, entityId } = addBaseEntity({
    type: EntityType.Asteroid,

    x: spawnX,
    y: spawnY,
    r: Math.random() * 180,

    scaleX: scale,
    scaleY: scale,

    velX:
      -(Math.abs(spawnX) / spawnX) *
      (Math.random() * (maxSpeed - minSpeed) + minSpeed),
    velY:
      -(Math.abs(spawnY) / spawnY) *
      (Math.random() * (maxSpeed - minSpeed) + minSpeed),
    velR: randomStep() * Math.random() * (50 - 10) + 10,

    aclX: 0,
    aclY: 0,
    aclR: 0,

    color: state.colors.asteroid,

    colHalfWidth: 0.5,
    colHalfHeight: 0.5,
    typeId: 0,
  });

  const typeId = appendSoA(state.asteroids, {
    health: 100,
    damageColorTimer: null,
    hurtCooldown: 0,
    baseId,
  });

  state.baseEntities.data.typeId[baseId] = typeId;

  createHealthBar({ x: spawnX, y: spawnY }, entityId);
}

export function asteroidUpdate() {
  const ad = state.asteroids.data;

  state.asteroidTimer += state.time.deltaTime;
  if (state.asteroidTimer >= 1) {
    //createAsteroid();
    state.asteroidTimer = 0;
  }

  for (let i = 0; i < state.asteroids.len; i++) {
    const bId = state.asteroids.data.baseId[i];
    if (ad.health[i] <= 0) {
      scheduleForDelete(state.baseEntities.data.entityId[bId]);
      continue;
    }

    if (ad.damageColorTimer[i]) {
      if (ad.damageColorTimer[i]! > 0) {
        ad.damageColorTimer[i]! -= state.time.deltaTime;
      } else {
        ad.damageColorTimer[i] = null;
        state.baseEntities.data.color[bId] = state.colors.asteroid;
      }
    }

    if (ad.hurtCooldown[i] > 0) {
      ad.hurtCooldown[i] -= state.time.deltaTime;
    }
  }
}

export function asteroidInit() {}
