import { Asteroid, asteroidInit } from "./asteroid";
import { Boid, boidInit } from "./boid";
import { Color } from "./color";
import { appendSoA, makeSoA } from "./SoA";
import { Transform } from "./transform";

export const state = {
  transforms: makeSoA<Transform>(100, { x: 0, y: 0, s: 0, r: 0 }),
  velocities: makeSoA<Velocity>(100, { x: 0, y: 0, r: 0 }),
  colors: makeSoA<Color>(100, { r: 1, g: 1, b: 1 }),
  asteroids: makeSoA<Asteroid>(100, {
    transformId: -1,
    velocityId: -1,
    colorId: -1,
  }),
  boids: makeSoA<Boid>(100, {
    transformId: -1,
    velocityId: -1,
    colorId: -1,
  }),
  time: {
    deltaTime: 0,
    lastTime: 0,
  },
  asteroidTimer: 0,
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

export function initializeState() {
  colorsInit();

  asteroidInit();
  boidInit();
}
