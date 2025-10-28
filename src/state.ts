import { Asteroid, asteroidInit } from "./asteroid";
import {
  getQuadInstanceBuffer,
  getQuadInstanceBufferLayout,
  getQuadVertexBuffer,
  getQuadVertexBufferLayout,
  updateQuadGPUData,
} from "./meshes/quad";
import { get2DTransformPipeline } from "./pipelines";
import { makeSoA } from "./SoA";
import { Transform } from "./transform";
import { getCameraBindGroup, getCameraBindGroupLayout } from "./uniforms";

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

type Renderer = {
  instanceBuffer: GPUBuffer;
  vertexBuffers: {
    quad: GPUBuffer;
  };
  piplines: {
    Transform2D: GPURenderPipeline;
  };
  bindGroups: {
    camera: {
      layout: GPUBindGroupLayout;
      group: GPUBindGroup;
    };
  };
  renderQueue: RenderCommand[];
};

export let rendering!: Renderer;

export const vertexBufferLayouts = {
  quad: getQuadVertexBufferLayout(),
};
export const instanceBufferLayouts = {
  quad: getQuadInstanceBufferLayout(),
};

export function initRenderer(device: GPUDevice, format: GPUTextureFormat) {
  const camLayout = getCameraBindGroupLayout(device);
  const camGroup = getCameraBindGroup(device, camLayout);

  const bindGroups = {
    camera: {
      layout: camLayout,
      group: camGroup,
    },
  };

  rendering = {
    instanceBuffer: getQuadInstanceBuffer(device),
    vertexBuffers: {
      quad: getQuadVertexBuffer(device),
    },
    piplines: {
      Transform2D: get2DTransformPipeline(device, format, [
        bindGroups.camera.layout,
      ]),
    },
    bindGroups,
    renderQueue: [],
  };
}

export type RenderCommand = {
  pipeline: keyof Renderer["piplines"];
  vertexBuffer: keyof Renderer["vertexBuffers"];
  bindGroup: keyof Renderer["bindGroups"];
  instanceCount: number;
  instanceOffset: number;
  vertexCount: number;
};

export function deltaTimeUpdate() {
  const current = Date.now();
  state.time.deltaTime = (current - state.time.lastTime) / 1000;
  state.time.lastTime = current;
}

export function initializeState() {
  asteroidInit();
}
