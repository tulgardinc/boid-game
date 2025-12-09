import { asteroidInit } from "./asteroid";
import { boidInit } from "./boid";
import { Color } from "./color";
import { makeSoA, StructOfArrays, swapDelete } from "./SoA";

export type Collision = {
  entityAId: number;
  entityBId: number;
};

export enum EntityType {
  Asteroid,
  Boid,
  HealthBarOuter,
  HealthBarInnner,
}

export type GameEntity = {
  type: EntityType;

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
  health: number;
  damageColorTimer: number | null;
  hurtCooldown: number;
};

export type Boid = {};

export type OuterHealthBar = {
  targetTypeId: number;
};

export type InnerHealthBar = {
  outerTypeId: number;
};

type DeleteEntry<T extends object> = {
  baseId: number;
  typeTable: StructOfArrays<T>;
};

export const state = {
  baseToType: Array<number>(),
  typeToBase: Array<number>(),
  baseEntities: makeSoA<GameEntity>(100, {
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
  }),
  asteroids: makeSoA<Asteroid>(100, {
    health: 0,
    damageColorTimer: null,
    hurtCooldown: 0,
  }),
  boids: makeSoA<Boid>(100, {
    baseEnitityId: 0,
  }),
  outerHealthBars: makeSoA<OuterHealthBar>(100, {
    targetTypeId: 0,
  }),
  innerHealthBars: makeSoA<InnerHealthBar>(100, {
    outerTypeId: 0,
  }),
  colors: {
    boid: { r: 1, g: 1, b: 1 },
    asteroid: { r: 1, g: 0, b: 0.2 },
    asteroidHurt: { r: 1, g: 1, b: 1 },
    outerHelthBar: { r: 0.1, g: 0.1, b: 0.1 },
    innerHelthhBar: { r: 0, g: 1, b: 0.1 },
  },
  collisions: new Array<Collision>(),
  time: {
    deltaTime: 0,
    lastTime: 0,
  },
  deleteSchedule: Array<DeleteEntry<any>>(),
  asteroidTimer: 0,
  mousePos: {
    x: 0,
    y: 0,
  },
};

function destroyEntity<T extends object>(
  baseId: number,
  typeTable: StructOfArrays<T>
) {
  if (state.baseEntities.len == 0) return;

  const lastIdx = state.baseEntities.len - 1;
  const typeIdToDelete = state.baseToType[baseId];
  const lastTypeId = state.baseToType[lastIdx];

  swapDelete(baseId, state.baseEntities);
  swapDelete(typeIdToDelete, typeTable);

  if (state.baseEntities.len > 0) {
    state.baseToType[baseId] = lastTypeId;
    state.typeToBase[lastTypeId] = baseId;
  }
}

export function scheduleForDelete<T extends object>(
  baseId: number,
  typeTable: StructOfArrays<T>
) {
  state.deleteSchedule.push({
    baseId,
    typeTable,
  });
}

export function deleteScheduledEntities() {
  for (const de of state.deleteSchedule) {
    destroyEntity(de.baseId, de.typeTable);
  }
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
