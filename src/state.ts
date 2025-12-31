import { asteroidInit } from "./asteroid";
import { boidInit } from "./boid";
import { Color } from "./color";
import { canvas } from "./main";
import { appendSoA, makeSoA, swapDeleteSoA } from "./SoA";

export type Collision = {
  entityABaseIdx: number;
  entityBBaseIdx: number;
  vector: {
    x: number;
    y: number;
  };
};

export type TrailPointArray = {
  length: number;
  ownerId: number;
  head: number;
  tail: number;
};

export type TrailPoint = {
  x: number;
  y: number;
};

export enum EntityType {
  Asteroid,
  Boid,
  HealthBarOuter,
  HealthBarTransition,
  HealthBarInnner,
}

export type BaseEntity = {
  entityId: number;

  type: EntityType;
  typeIdx: number;

  x: number;
  y: number;
  r: number;

  scaleX: number;
  scaleY: number;

  velX: number;
  velY: number;
  velR: number;

  aclX: number;
  aclY: number;
  aclR: number;

  color: Color;

  colHalfWidth: number;
  colHalfHeight: number;
};

export type Asteroid = {
  baseIdx: number;
  health: number;
  damageColorExpiry: number | null;
  shrinkTimer: number | null;
  recoverKnockbackTimer: number | null;
  stopExpirey: number | null;
  knockbackVelX: number;
  knockbackVelY: number;
  knockbackVelRDelta: number;
  knockbackVelRStore: number;
  defaultScale: number;
  defaultVelX: number;
  defaultVelY: number;
  outerHealthBarEntityId: number;
};

export type Boid = {
  baseIdx: number;
};

export type OuterHealthBar = {
  baseIdx: number;
  targetEntityId: number;
  innerEntityId: number;
  transitionEntityId: number;
  targetWidth: number;
};

export type TransitionHealthBar = {
  baseIdx: number;
};

export type InnerHealthBar = {
  baseIdx: number;
};

export type HurtCooldown = {
  asteroidId: number;
  boidId: number;
  expiry: number;
};

export type ParticleEmitter = {
  count: number;
  lifeTime: number;
  posMinX: number;
  posMinY: number;
  posMaxX: number;
  posMaxY: number;
  velMinX: number;
  velMinY: number;
  velMaxX: number;
  velMaxY: number;
  scaleInitX: number;
  scaleInitY: number;
  scaleFinalX: number;
  scaleFinalY: number;
  colorInitR: number;
  colorInitG: number;
  colorInitB: number;
  colorInitA: number;
  colorFinalR: number;
  colorFinalG: number;
  colorFinalB: number;
  colorFinalA: number;
};

export const MAX_TRAIL_LENGTH = 50;

export const state = {
  currentId: 0,
  freedIds: Array<number>(),
  idToBaseLookup: Array<number>(),
  idToTrailLookup: Array<number>(),
  trailPoints: makeSoA<TrailPoint>(100, {
    x: 0,
    y: 0,
  }),
  trails: makeSoA<TrailPointArray>(MAX_TRAIL_LENGTH * 300, {
    length: 0,
    ownerId: 0,
    head: 0,
    tail: 0,
  }),
  baseEntities: makeSoA<BaseEntity>(100, {
    type: EntityType.Asteroid,
    x: 0,
    y: 0,
    r: 0,
    velX: 0,
    velY: 0,
    velR: 0,
    aclX: 0,
    aclY: 0,
    aclR: 0,
    color: {
      r: 0,
      g: 0,
      b: 0,
    },
    colHalfWidth: 0,
    colHalfHeight: 0,
    scaleX: 0,
    scaleY: 0,
    typeIdx: 0,
    entityId: 0,
  }),
  asteroids: makeSoA<Asteroid>(100, {
    health: 0,
    damageColorExpiry: null,
    baseIdx: 0,
    shrinkTimer: null,
    defaultScale: 0,
    defaultVelX: 0,
    defaultVelY: 0,
    stopExpirey: null,
    outerHealthBarEntityId: 0,
    knockbackVelX: 0,
    knockbackVelY: 0,
    recoverKnockbackTimer: null,
    knockbackVelRDelta: 0,
    knockbackVelRStore: 0,
  }),
  boids: makeSoA<Boid>(100, {
    baseIdx: 0,
  }),
  outerHealthBars: makeSoA<OuterHealthBar>(100, {
    targetEntityId: 0,
    baseIdx: 0,
    innerEntityId: 0,
    transitionEntityId: 0,
    targetWidth: 0,
  }),
  transitionHealthBars: makeSoA<TransitionHealthBar>(100, {
    baseIdx: 0,
  }),
  innerHealthBars: makeSoA<InnerHealthBar>(100, {
    baseIdx: 0,
  }),
  cantHurtSet: new Set<string>(),
  hurtCooldowns: makeSoA<HurtCooldown>(100, {
    asteroidId: 0,
    boidId: 0,
    expiry: 0,
  }),
  particleEmitters: makeSoA<ParticleEmitter>(100, {
    count: 0,
    lifeTime: 0,
    posMaxX: 0,
    posMaxY: 0,
    posMinX: 0,
    posMinY: 0,
    velMaxX: 0,
    velMaxY: 0,
    velMinX: 0,
    velMinY: 0,
    scaleInitX: 0,
    scaleInitY: 0,
    scaleFinalX: 0,
    scaleFinalY: 0,
    colorInitR: 0,
    colorInitG: 0,
    colorInitB: 0,
    colorInitA: 0,
    colorFinalR: 0,
    colorFinalG: 0,
    colorFinalB: 0,
    colorFinalA: 0,
  }),
  colors: {
    boid: { r: 1, g: 1, b: 1 },
    asteroid: { r: 1, g: 0, b: 0.2 },
    asteroidHurt: { r: 1, g: 1, b: 1 },
    outerHelthBar: { r: 0.1, g: 0.1, b: 0.1 },
    transitionHealthBar: { r: 1, g: 1, b: 1 },
    innerHelthhBar: { r: 0.9, g: 0, b: 0 },
  },
  collisions: new Array<Collision>(),
  prevCollisions: new Set<string>(),
  time: {
    deltaTime: 0,
    lastTime: 0,
    now: 0,
  },
  deleteSchedule: Array<number>(),
  nextAsteroidSpawn: 0,
  mousePos: {
    raw: {
      x: 0,
      y: 0,
    },
    world: {
      x: 0,
      y: 0,
    },
  },
  camera: {
    x: 0,
    y: 0,
    r: 0,
    zoom: 1.2,
  },
  canvas: {
    width: 0,
    height: 0,
  },
};

export function swapDeleteTrail(ownerId: number) {
  const finalTrailIndex = state.trails.len - 1;
  const finalTrailOwner = state.trails.data.ownerId[finalTrailIndex];

  const trailToDeleteIndx = state.idToTrailLookup[ownerId];
  const trailToDeleteOffset = trailToDeleteIndx * MAX_TRAIL_LENGTH;

  const finalTrailOffset = finalTrailIndex * MAX_TRAIL_LENGTH;

  for (let i = 0; i < MAX_TRAIL_LENGTH; i++) {
    state.trailPoints.data.x[trailToDeleteOffset + i] =
      state.trailPoints.data.x[finalTrailOffset + i];
    state.trailPoints.data.y[trailToDeleteOffset + i] =
      state.trailPoints.data.y[finalTrailOffset + i];
  }

  swapDeleteSoA(trailToDeleteIndx, state.trails);
  state.trailPoints.len -= MAX_TRAIL_LENGTH;

  if (finalTrailOwner != ownerId)
    state.idToTrailLookup[finalTrailOwner] = trailToDeleteIndx;
}

export function createNewTrail(entityId: number) {
  const trailIndx = appendSoA(state.trails, {
    length: 0,
    ownerId: entityId,
    head: 0,
    tail: MAX_TRAIL_LENGTH - 1,
  });

  state.idToTrailLookup[entityId] = trailIndx;
}

export function getAbsoluteTPIndex(trailIndex: number, pointIndex: number) {
  return (
    trailIndex * MAX_TRAIL_LENGTH +
    ((state.trails.data.head[trailIndex] + pointIndex) % MAX_TRAIL_LENGTH)
  );
}

export function addTrailPoint(trailIndex: number, x: number, y: number) {
  const trailLength = state.trails.data.length[trailIndex];
  if (trailLength == MAX_TRAIL_LENGTH) {
    state.trails.data.head[trailIndex] =
      (state.trails.data.head[trailIndex] + 1) % MAX_TRAIL_LENGTH;
  } else {
    state.trails.data.length[trailIndex]++;
  }

  const tail = (state.trails.data.tail[trailIndex] + 1) % MAX_TRAIL_LENGTH;
  state.trails.data.tail[trailIndex] = tail;

  state.trailPoints.data.x[trailIndex * MAX_TRAIL_LENGTH + tail] = x;
  state.trailPoints.data.y[trailIndex * MAX_TRAIL_LENGTH + tail] = y;
}

export function addBaseEntity(baseEntity: Omit<BaseEntity, "entityId">) {
  let baseIdx = 0;
  let entityId = 0;
  if (state.freedIds.length > 0) {
    entityId = state.freedIds.pop()!;
    baseIdx = appendSoA(state.baseEntities, {
      ...baseEntity,
      entityId: entityId,
    });
    state.idToBaseLookup[entityId!] = baseIdx;
  } else {
    entityId = state.currentId;
    baseIdx = appendSoA(state.baseEntities, {
      ...baseEntity,
      entityId: state.currentId,
    });
    state.idToBaseLookup[state.currentId] = baseIdx;
    state.currentId++;
  }

  return { baseIdx, entityId };
}

function getTableFromKind(type: EntityType) {
  switch (type) {
    case EntityType.Asteroid:
      return state.asteroids;
    case EntityType.Boid:
      return state.boids;
    case EntityType.HealthBarInnner:
      return state.innerHealthBars;
    case EntityType.HealthBarOuter:
      return state.outerHealthBars;
    case EntityType.HealthBarTransition:
      return state.transitionHealthBars;
  }
}

function destroyEntity(entityIdToDelete: number) {
  if (state.baseEntities.len == 0) return;

  const baseIdxToDelete = state.idToBaseLookup[entityIdToDelete];
  const baseLast = state.baseEntities.len - 1;

  const typeIdxToDelete = state.baseEntities.data.typeIdx[baseIdxToDelete];
  const typeIdxOfLastE = state.baseEntities.data.typeIdx[baseLast];
  const entityIdLast = state.baseEntities.data.entityId[baseLast];

  const typeTableForEntityToDelete = getTableFromKind(
    state.baseEntities.data.type[baseIdxToDelete]
  );
  const typeTableForLastEntity = getTableFromKind(
    state.baseEntities.data.type[baseLast]
  );

  const typeLast = typeTableForEntityToDelete.len - 1;

  swapDeleteSoA(baseIdxToDelete, state.baseEntities);

  if (baseIdxToDelete != baseLast) {
    state.idToBaseLookup[entityIdLast] = baseIdxToDelete;
    typeTableForLastEntity.data.baseIdx[typeIdxOfLastE] = baseIdxToDelete;
  }

  swapDeleteSoA(typeIdxToDelete, typeTableForEntityToDelete);

  if (typeIdxToDelete != typeLast) {
    const baseIdxOfLastType =
      typeTableForEntityToDelete.data.baseIdx[typeIdxToDelete];
    state.baseEntities.data.typeIdx[baseIdxOfLastType] = typeIdxToDelete;
  }
}

export function scheduleForDelete(entityId: number) {
  state.deleteSchedule.push(entityId);
}

export function deleteScheduledEntities() {
  for (const id of state.deleteSchedule) {
    destroyEntity(id);
    if (
      state.baseEntities.data.type[state.idToBaseLookup[id]] == EntityType.Boid
    ) {
      swapDeleteTrail(id);
    }
    state.freedIds.push(id);
  }
  state.deleteSchedule.length = 0;
}

export function updateGameTime() {
  const current = Date.now();
  state.time.deltaTime = (current - state.time.lastTime) / 1000;
  state.time.now += state.time.deltaTime;
  state.time.lastTime = current;
}

function registerEvents() {
  window.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();

    const mxCss = e.clientX - rect.left;
    const myCss = e.clientY - rect.top;

    state.mousePos.raw.x = mxCss * (state.canvas.width / rect.width);
    state.mousePos.raw.y = myCss * (state.canvas.height / rect.height);
  });
}
export function initializeState() {
  const now = Date.now();
  state.time.lastTime = now;
  state.time.now = 0;
  state.nextAsteroidSpawn = state.time.now + 1;

  registerEvents();

  asteroidInit();
  boidInit();
}
