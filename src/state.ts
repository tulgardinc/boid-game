import { asteroidInit } from "./asteroid";
import { boidInit } from "./boid";
import { Color } from "./color";
import { appendSoA, makeSoA, StructOfArrays, swapDelete } from "./SoA";

export type Collision = {
  entityAId: number;
  entityBId: number;
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
  HealthBarInnner,
}

export type BaseEntity = {
  entityId: number;

  type: EntityType;
  typeId: number;

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
  baseId: number;
  health: number;
  damageColorTimer: number | null;
  hurtCooldown: number;
};

export type Boid = {
  baseId: number;
};

export type OuterHealthBar = {
  baseId: number;
  targetEntityId: number;
};

export type InnerHealthBar = {
  baseId: number;
  outerEntityId: number;
};

export const state = {
  currentId: 0,
  freedIds: Array<number>(),
  idToBaseLookup: Array<number>(),
  idToTrailLookup: Array<number>(),
  trailPoints: makeSoA<TrailPoint>(100, {
    x: 0,
    y: 0,
  }),
  trails: makeSoA<TrailPointArray>(100, {
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
    typeId: 0,
    entityId: 0,
  }),
  asteroids: makeSoA<Asteroid>(100, {
    health: 0,
    damageColorTimer: null,
    hurtCooldown: 0,
    baseId: 0,
  }),
  boids: makeSoA<Boid>(100, {
    baseId: 0,
  }),
  outerHealthBars: makeSoA<OuterHealthBar>(100, {
    targetEntityId: 0,
    baseId: 0,
  }),
  innerHealthBars: makeSoA<InnerHealthBar>(100, {
    outerEntityId: 0,
    baseId: 0,
  }),
  colors: {
    boid: { r: 1, g: 1, b: 1 },
    asteroid: { r: 1, g: 0, b: 0.2 },
    asteroidHurt: { r: 1, g: 1, b: 1 },
    outerHelthBar: { r: 0.1, g: 0.1, b: 0.1 },
    innerHelthhBar: { r: 0, g: 1, b: 0.1 },
  },
  collisions: new Array<Collision>(),
  prevCollisions: new Set<string>(),
  time: {
    deltaTime: 0,
    lastTime: 0,
  },
  deleteSchedule: Array<number>(),
  asteroidTimer: 0,
  mousePos: {
    x: 0,
    y: 0,
  },
};

export const MAX_TRAIL_LENGTH = 50;

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

  swapDelete(trailToDeleteIndx, state.trails);
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
  let baseId = 0;
  let entityId = 0;
  if (state.freedIds.length > 0) {
    entityId = state.freedIds.pop()!;
    baseId = appendSoA(state.baseEntities, {
      ...baseEntity,
      entityId: entityId,
    });
    state.idToBaseLookup[entityId!] = baseId;
  } else {
    entityId = state.currentId;
    baseId = appendSoA(state.baseEntities, {
      ...baseEntity,
      entityId: state.currentId,
    });
    state.idToBaseLookup[state.currentId] = baseId;
    state.currentId++;
  }

  return { baseId, entityId };
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
  }
}

function destroyEntity(entityIdToDelete: number) {
  if (state.baseEntities.len == 0) return;

  const baseIdToDelete = state.idToBaseLookup[entityIdToDelete];
  const baseLast = state.baseEntities.len - 1;

  const typeIdToDelete = state.baseEntities.data.typeId[baseIdToDelete];
  const typeIdOfLastE = state.baseEntities.data.typeId[baseLast];
  const entityIdLast = state.baseEntities.data.entityId[baseLast];

  const typeTableForEntityToDelete = getTableFromKind(
    state.baseEntities.data.type[baseIdToDelete]
  );
  const typeTableForLastEntity = getTableFromKind(
    state.baseEntities.data.type[baseLast]
  );

  const typeLast = typeTableForEntityToDelete.len - 1;

  swapDelete(baseIdToDelete, state.baseEntities);

  if (baseIdToDelete != baseLast) {
    state.idToBaseLookup[entityIdLast] = baseIdToDelete;
    typeTableForLastEntity.data.baseId[typeIdOfLastE] = baseIdToDelete;
  }

  swapDelete(typeIdToDelete, typeTableForEntityToDelete);

  if (typeIdToDelete != typeLast) {
    const baseIdOfLastType =
      typeTableForEntityToDelete.data.baseId[typeIdToDelete];
    state.baseEntities.data.typeId[baseIdOfLastType] = typeIdToDelete;
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

export function deltaTimeUpdate() {
  const current = Date.now();
  state.time.deltaTime = (current - state.time.lastTime) / 1000;
  state.time.lastTime = current;
}

function registerEvents() {
  window.addEventListener("mousemove", (e) => {
    state.mousePos.x = e.clientX;
    state.mousePos.y = e.clientY;
  });
}

export function initializeState() {
  state.time.lastTime = Date.now();

  registerEvents();

  asteroidInit();
  boidInit();
}
