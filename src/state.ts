import { Acceleration } from "./acceleration";
import { Asteroid, asteroidInit } from "./asteroid";
import { Boid, boidInit } from "./boid";
import { Collider, ColliderType } from "./collider";
import { Color } from "./color";
import { appendSoA, makeSoA } from "./SoA";
import { Transform } from "./transform";
import { Velocity } from "./velocity";

type PhysicsObject = {
  velocityId: number;
  accelerationId: number;
  transformId: number;
};

type Collision = {
  colliderAId: number;
  colliderBId: number;
};

export const state = {
  transforms: makeSoA<Transform>(100, { x: 0, y: 0, s: 0, r: 0 }),
  velocities: makeSoA<Velocity>(100, { x: 0, y: 0, r: 0 }),
  accelerations: makeSoA<Acceleration>(100, { x: 0, y: 0, r: 0 }),
  colors: makeSoA<Color>(100, { r: 1, g: 1, b: 1 }),
  physicsObjects: makeSoA<PhysicsObject>(100, {
    velocityId: -1,
    accelerationId: -1,
    transformId: -1,
  }),
  asteroids: makeSoA<Asteroid>(100, {
    physicsId: -1,
    colorId: -1,
    health: 100,
  }),
  boids: makeSoA<Boid>(100, {
    physicsId: -1,
    colorId: -1,
  }),
  colliders: makeSoA<Collider>(100, {
    halfHeight: 0,
    halfWidth: 0,
    transformId: -1,
    type: ColliderType.Asteroid,
  }),
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

export const ColorIds = {
  boid: 0,
  asteroid: 1,
} as const;

function colorsInit() {
  appendSoA(state.colors, {
    r: 1,
    g: 1,
    b: 1,
  });

  appendSoA(state.colors, {
    r: 1,
    g: 0,
    b: 0,
  });
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
  colorsInit();

  asteroidInit();
  boidInit();
}
