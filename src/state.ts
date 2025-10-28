import { Asteroid, asteroidInit } from "./asteroid";
import { makeSoA } from "./SoA";
import { Transform } from "./transform";

export const state = {
  transforms: makeSoA<Transform>(100, { x: 0, y: 0, s: 0, r: 0 }),
  velocities: makeSoA<Velocity>(100, { x: 0, y: 0, r: 0 }),
  asteroids: makeSoA<Asteroid>(100, {
    transformId: -1,
    velocityId: -1,
  }),
  time: {
    deltaTime: 0,
    lastTime: 0,
  },
  asteroidTimer: 0,
};

type RenderingState = {
  meshes: {
    [key: string]: {
      vBufferLayout: GPUVertexBufferLayout;
      vBuffer: GPUBuffer;
      iBufferLayout: GPUVertexBufferLayout;
      iBuffer: GPUBuffer;
    };
  };
  pipelines: {
    [key: string]: GPURenderPipeline;
  };
  uniforms: {
    [key: string]: {
      bindGroupLayout: GPUBindGroupLayout;
      bindGroup: GPUBindGroup;
    };
  };
};

export const rendering: RenderingState = {
  meshes: {},
  pipelines: {},
  uniforms: {},
};

export function deltaTimeUpdate() {
  const current = Date.now();
  state.time.deltaTime = (current - state.time.lastTime) / 1000;
  state.time.lastTime = current;
}

export function initializeState() {
  asteroidInit();
}
