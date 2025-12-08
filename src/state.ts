import { asteroidInit } from "./asteroid";
import { boidInit } from "./boid";
import { Color } from "./color";
import { makeSoA } from "./SoA";

export type Collision = {
  entityAId: number;
  entityBId: number;
};

export enum EntityType {
  Asteroid,
  Boid,
}

export type GameEntity = {
  type: EntityType;
  typeId: number;

  x: number;
  y: number;
  s: number;
  r: number;

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
  baseEnitityId: number;
  health: number;
  damageColorTimer: number | null;
  hurtCooldown: number;
};

export type Boid = {
  baseEnitityId: number;
};

export const state = {
  baseEntities: makeSoA<GameEntity>(100, {
    type: EntityType.Asteroid,
    typeId: 0,
    x: 0,
    y: 0,
    s: 0,
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
  }),
  asteroids: makeSoA<Asteroid>(100, {
    baseEnitityId: 0,
    health: 0,
    damageColorTimer: null,
    hurtCooldown: 0,
  }),
  boids: makeSoA<Boid>(100, {
    baseEnitityId: 0,
  }),
  colors: {
    boid: { r: 1, g: 1, b: 1 },
    asteroid: { r: 1, g: 0, b: 0.2 },
    asteroidHurt: { r: 1, g: 1, b: 1 },
  },
  collisions: new Array<Collision>(),
  time: {
    deltaTime: 0,
    lastTime: 0,
  },
  asteroidTimer: 0,
  mousePos: {
    x: 0,
    y: 0,
  },
};

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
