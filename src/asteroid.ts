import { appendSoA } from "./SoA";
import { EntityType, state } from "./state";

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

  const baseId = appendSoA(state.baseEntities, {
    type: EntityType.Asteroid,
    typeId: 0,

    x: spawnX,
    y: spawnY,
    s: Math.random() * (maxScale - minScale) + minScale,
    r: Math.random() * 180,

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
  });

  const typeId = appendSoA(state.asteroids, {
    baseEnitityId: baseId,
    health: 0,
    damageColorTimer: null,
    hurtCooldown: 0,
  });

  state.baseEntities.data.typeId[baseId] = typeId;
}

export function asteroidUpdate() {
  state.asteroidTimer += state.time.deltaTime;
  if (state.asteroidTimer >= 1) {
    createAsteroid();
    state.asteroidTimer = 0;
  }

  for (let i = 0; i < state.asteroids.len; i++) {
    const ad = state.asteroids.data;
    if (ad.damageColorTimer[i]) {
      if (ad.damageColorTimer[i]! > 0) {
        ad.damageColorTimer[i]! -= state.time.deltaTime;
      } else {
        ad.damageColorTimer[i] = null;
        const bId = ad.baseEnitityId[i];
        state.baseEntities.data.color[bId] = state.colors.asteroid;
      }
    }

    if (ad.hurtCooldown[i] > 0) {
      ad.hurtCooldown[i] -= state.time.deltaTime;
    }
  }
}

export function asteroidInit() {}
