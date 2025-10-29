import { Asteroid, asteroidInit } from "./asteroid";
import {
  initInstanceBuffer,
  getQuadInstanceBufferLayout,
  getQuadVertexBuffer,
  getQuadVertexBufferLayout,
  updateQuadGPUData,
  getQuadIndexBuffer,
} from "./meshes/quad";
import { get2DTransformPipeline, getShaderPos2DRed } from "./pipelines";
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

export type Renderer = {
  instanceBuffer: GPUBuffer;
  shaders: {
    pos2DRed: GPUShaderModule;
  };
  meshes: {
    quad: Mesh;
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
  pos2D: getQuadVertexBufferLayout(),
};
export const instanceBufferLayouts = {
  Transform2D: getQuadInstanceBufferLayout(),
};

export type Mesh = {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  vertexBufferLayoutId: keyof typeof vertexBufferLayouts;
};

export function initRenderer(device: GPUDevice, format: GPUTextureFormat) {
  const camLayout = getCameraBindGroupLayout(device);
  const camGroup = getCameraBindGroup(device, camLayout);

  const bindGroups: Renderer["bindGroups"] = {
    camera: {
      layout: camLayout,
      group: camGroup,
    },
  };

  const shaders: Renderer["shaders"] = {
    pos2DRed: getShaderPos2DRed(device),
  };

  rendering = {
    instanceBuffer: initInstanceBuffer(device),
    meshes: {
      quad: {
        vertexBuffer: getQuadVertexBuffer(device),
        indexBuffer: getQuadIndexBuffer(device),
        vertexBufferLayoutId: "pos2D",
      },
    },
    piplines: {
      Transform2D: get2DTransformPipeline(device, format, bindGroups, shaders),
    },
    bindGroups,
    shaders,
    renderQueue: [],
  };
}

export type RenderCommand = {
  pipeline: keyof Renderer["piplines"];
  mesh: keyof Renderer["meshes"];
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
