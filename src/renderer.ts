import transform2DColorCode from "./shaders/coloredTransform.wgsl?raw";
import trailCode from "./shaders/trail.wgsl?raw";
import particleComputeCode from "./shaders/particleCompute.wgsl?raw";
import particleRenderCode from "./shaders/particleRender.wgsl?raw";
import { getBoidIndexBufer, getBoidVertexBuffer } from "./meshes/boid";
import { getQuadVertexBuffer, getQuadIndexBuffer } from "./meshes/quad";
import {
  get2DTransformPipeline,
  getParticleDrawListPipeline,
  getParticleRenderPipeline,
  getParticleSpawnPipeline,
  getParticleStatePipeline,
  getTrailPipeline,
} from "./pipelines";
import { MAX_TRAIL_LENGTH, state } from "./state";
import {
  getCameraBindGroup,
  getCameraBindGroupLayout,
  getParticleComputeBindGroup,
  getParticleComputeBindGroupLayout,
  getParticleRenderBindGroup,
  getParticleRenderBindGroupLayout,
} from "./uniforms";
import { mat4, vec3, vec4 } from "gl-matrix";
import { isModuleNamespaceObject } from "util/types";
import { canvas } from "./main";

export type Renderer = {
  instanceCount: number;
  instanceOffset: number;
  cameraBuffer: GPUBuffer;
  trailVertexBuffer: GPUBuffer;
  trailInstanceBuffer: GPUBuffer;
  instanceBuffer: GPUBuffer;
  particleDrawListBuffer: GPUBuffer;
  particleDrawCountBuffer: GPUBuffer;
  particleStateBufferA: GPUBuffer;
  particleStateBufferB: GPUBuffer;
  particleParametersBuffer: GPUBuffer;
  particleEmitterBuffer: GPUBuffer;
  particleRingCursorBuffer: GPUBuffer;
  particleShouldUseAB: boolean;
  shaders: {
    coloredTransform: GPUShaderModule;
    trail: GPUShaderModule;
    particleCompute: GPUShaderModule;
    particleRender: GPUShaderModule;
  };
  meshes: {
    quad: Mesh;
    boid: Mesh;
  };
  renderPipelines: {
    transform2D: GPURenderPipeline;
    trail: GPURenderPipeline;
    particleRender: GPURenderPipeline;
  };
  computePipelines: {
    particleSpawn: GPUComputePipeline;
    particleState: GPUComputePipeline;
    particleDrawList: GPUComputePipeline;
  };
  bindGroups: {
    camera: {
      layout: GPUBindGroupLayout;
      group: GPUBindGroup;
    };
    particleComputeAB: {
      layout: GPUBindGroupLayout;
      group: GPUBindGroup;
    };
    particleComputeBA: {
      layout: GPUBindGroupLayout;
      group: GPUBindGroup;
    };
    particleRenderA: {
      layout: GPUBindGroupLayout;
      group: GPUBindGroup;
    };
    particleRenderB: {
      layout: GPUBindGroupLayout;
      group: GPUBindGroup;
    };
  };
  renderQueue: (RenderCommandMesh | RenderCommandVFX)[];
  frameNo: number;
};

export let renderer!: Renderer;

export type VertexBufferLayouts = {
  [K in keyof typeof vertexBufferLayouts]: GPUVertexBufferLayout;
};
const vertexBufferLayouts: { [k: string]: GPUVertexBufferLayout } = {
  pos2D: {
    arrayStride: 2 * 4,
    stepMode: "vertex",
    attributes: [
      {
        shaderLocation: 0,
        offset: 0,
        format: "float32x2",
      },
    ],
  },
  pos2DColor: {
    arrayStride: 6 * 4,
    stepMode: "vertex",
    attributes: [
      {
        shaderLocation: 0,
        offset: 0,
        format: "float32x2",
      },
      {
        shaderLocation: 1,
        offset: 2 * 4,
        format: "float32x4",
      },
    ],
  },
};

export type InstanceBufferLayouts = {
  [K in keyof typeof instanceBufferLayouts]: GPUVertexBufferLayout;
};
const instanceBufferLayouts: { [k: string]: GPUVertexBufferLayout } = {
  transform2D: {
    arrayStride: 8 * 4,
    stepMode: "instance",
    attributes: [
      {
        shaderLocation: 1,
        offset: 0,
        format: "float32x2",
      },
      {
        shaderLocation: 2,
        offset: 2 * 4,
        format: "float32x2",
      },
      {
        shaderLocation: 3,
        offset: 4 * 4,
        format: "float32",
      },
      {
        shaderLocation: 4,
        offset: 5 * 4,
        format: "float32x3",
      },
    ],
  },
};

function initInstanceBuffer(device: GPUDevice) {
  return device.createBuffer({
    size: 8 * 4 * 1000,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
}

function initTrailVertexBuffer(device: GPUDevice) {
  // float32
  return device.createBuffer({
    size: 6 * 4 * 2 * MAX_TRAIL_LENGTH * 300,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
}

function initTrailIndexBuffer(device: GPUDevice) {
  // uint16
  return device.createBuffer({
    size: 2 * 2 * MAX_TRAIL_LENGTH * 300,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
}

export const MAX_PARTICLE_COUNT = 10000;

function initParticleDrawListBuffer(device: GPUDevice) {
  // uint32
  const data = new Uint32Array(MAX_PARTICLE_COUNT);
  data.fill(0);
  const buffer = device.createBuffer({
    size: 4 * MAX_PARTICLE_COUNT,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
}

function initPartcileStateBuffer(device: GPUDevice) {
  // float32
  // age 1
  // deathAge 1
  // pos 2
  // vel 2
  // scale 2
  // finalScale 2
  // color 4
  // finalColor 4
  const data = new Float32Array(18 * MAX_PARTICLE_COUNT);
  data.fill(0);
  const buffer = device.createBuffer({
    size: 4 * 18 * MAX_PARTICLE_COUNT,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
}

function initParticleDrawCountBuffer(device: GPUDevice) {
  // uint32
  const data = new Uint32Array(1);
  data.fill(0);
  const buffer = device.createBuffer({
    size: 4,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
}

function initParticleParametersBuffer(device: GPUDevice) {
  // particleCount: uint32
  // deltaTime: float32
  const data = new Float32Array(5);
  data.fill(0);
  const buffer = device.createBuffer({
    size: 5 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
}

function initParticleEmitterBuffer(device: GPUDevice) {
  // uint32
  // base 1
  // count 1
  // float32
  // lifetime 1
  // padding 1
  // minPos 2
  // maxPos 2
  // minVel 2
  // maxVel 2
  // initScale 2
  // finalScale 2
  // initColor 4
  // finalColor 4
  return device.createBuffer({
    size: 24 * 4 * 500,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
  });
}

function initParticleRingCursorBuffer(device: GPUDevice) {
  // index: uint32
  const data = new Uint32Array(1);
  data.fill(0);
  const buffer = device.createBuffer({
    size: 4,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
}

function initCameraBuffer(device: GPUDevice) {
  const vpMatrix = mat4.create();
  mat4.orthoZO(vpMatrix, -1920 / 2, 1920 / 2, -1080 / 2, 1080 / 2, -1, 1);

  const buffer = device.createBuffer({
    label: "camera buffer",
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    size: (vpMatrix as Float32Array).byteLength,
  });

  device.queue.writeBuffer(buffer, 0, (vpMatrix as Float32Array).buffer);

  return buffer;
}

export type Mesh = {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  vertexBufferLayoutId: keyof typeof vertexBufferLayouts;
  instanceBufferLayoutId: keyof typeof instanceBufferLayouts;
};

export function initRenderer(device: GPUDevice, format: GPUTextureFormat) {
  const camLayout = getCameraBindGroupLayout(device);

  const cameraBuffer = initCameraBuffer(device);

  const camGroup = getCameraBindGroup(device, camLayout, cameraBuffer);

  const particleDrawListBuffer = initParticleDrawListBuffer(device);
  const particleDrawCountBuffer = initParticleDrawCountBuffer(device);
  const particleStateBufferA = initPartcileStateBuffer(device);
  const particleStateBufferB = initPartcileStateBuffer(device);
  const particleParametersBuffer = initParticleParametersBuffer(device);
  const particleEmitterBuffer = initParticleEmitterBuffer(device);
  const particleRingCursorBuffer = initParticleRingCursorBuffer(device);

  const particleComputeLayout = getParticleComputeBindGroupLayout(device);
  const particleComputeGAB = getParticleComputeBindGroup(
    device,
    particleComputeLayout,
    particleDrawListBuffer,
    particleDrawCountBuffer,
    particleStateBufferA,
    particleStateBufferB,
    particleParametersBuffer,
    particleEmitterBuffer,
    particleRingCursorBuffer
  );
  const particleComputeGBA = getParticleComputeBindGroup(
    device,
    particleComputeLayout,
    particleDrawListBuffer,
    particleDrawCountBuffer,
    particleStateBufferB,
    particleStateBufferA,
    particleParametersBuffer,
    particleEmitterBuffer,
    particleRingCursorBuffer
  );

  const particleRenderLayout = getParticleRenderBindGroupLayout(device);
  const particleRenderBGA = getParticleRenderBindGroup(
    device,
    particleRenderLayout,
    particleDrawListBuffer,
    particleStateBufferA
  );
  const particleRenderBGB = getParticleRenderBindGroup(
    device,
    particleRenderLayout,
    particleDrawListBuffer,
    particleStateBufferB
  );

  const bindGroups: Renderer["bindGroups"] = {
    camera: {
      layout: camLayout,
      group: camGroup,
    },
    particleComputeAB: {
      layout: particleComputeLayout,
      group: particleComputeGAB,
    },
    particleComputeBA: {
      layout: particleComputeLayout,
      group: particleComputeGBA,
    },
    particleRenderA: {
      layout: particleRenderLayout,
      group: particleRenderBGA,
    },
    particleRenderB: {
      layout: particleRenderLayout,
      group: particleRenderBGB,
    },
  };

  const shaders: Renderer["shaders"] = {
    coloredTransform: getShaderPos2DRed(device),
    trail: getShaderTrail(device),
    particleCompute: getShaderParticleCompute(device),
    particleRender: getShaderParticleRender(device),
  };

  renderer = {
    instanceCount: 0,
    instanceOffset: 0,
    cameraBuffer,
    trailVertexBuffer: initTrailVertexBuffer(device),
    trailInstanceBuffer: initTrailIndexBuffer(device),
    instanceBuffer: initInstanceBuffer(device),
    particleDrawListBuffer,
    particleDrawCountBuffer,
    particleStateBufferA,
    particleStateBufferB,
    particleParametersBuffer,
    particleEmitterBuffer,
    particleRingCursorBuffer,
    particleShouldUseAB: false,
    meshes: {
      quad: {
        vertexBuffer: getQuadVertexBuffer(device),
        indexBuffer: getQuadIndexBuffer(device),
        vertexBufferLayoutId: "pos2D",
        instanceBufferLayoutId: "transform2D",
      },
      boid: {
        vertexBuffer: getBoidVertexBuffer(device),
        indexBuffer: getBoidIndexBufer(device),
        vertexBufferLayoutId: "pos2D",
        instanceBufferLayoutId: "transform2D",
      },
    },
    renderPipelines: {
      transform2D: get2DTransformPipeline(
        device,
        format,
        bindGroups,
        shaders,
        vertexBufferLayouts,
        instanceBufferLayouts
      ),
      trail: getTrailPipeline(
        device,
        format,
        bindGroups,
        shaders,
        vertexBufferLayouts
      ),
      particleRender: getParticleRenderPipeline(
        device,
        format,
        bindGroups,
        shaders
      ),
    },
    computePipelines: {
      particleSpawn: getParticleSpawnPipeline(device, bindGroups, shaders),
      particleState: getParticleStatePipeline(device, bindGroups, shaders),
      particleDrawList: getParticleDrawListPipeline(
        device,
        bindGroups,
        shaders
      ),
    },
    bindGroups,
    shaders,
    renderQueue: [],
    frameNo: 0,
  };
}

export type RenderCommandMesh = {
  kind: "mesh";
  pipeline: keyof Renderer["renderPipelines"];
  mesh: keyof Renderer["meshes"];
  bindGroup: keyof Renderer["bindGroups"];
  instanceCount: number;
  firstInstance: number;
  indexCount: number;
};

export type RenderCommandVFX = {
  kind: "vfx";
  pipeline: keyof Renderer["renderPipelines"];
  bindGroup: keyof Renderer["bindGroups"];
  indexCount: number;
  firstIndex: number;
};

export function updateTransformColorGPUData(
  device: GPUDevice,
  entityIds: number[]
) {
  const result = new Float32Array(entityIds.length * 8);
  const d = state.baseEntities.data;

  let i = 0;
  for (const eid of entityIds) {
    result[i++] = d.x[eid];
    result[i++] = d.y[eid];
    result[i++] = d.scaleX[eid];
    result[i++] = d.scaleY[eid];
    result[i++] = (d.r[eid] * Math.PI) / 180;
    const col = d.color[eid];
    result[i++] = col.r;
    result[i++] = col.g;
    result[i++] = col.b;
  }

  device.queue.writeBuffer(
    renderer.instanceBuffer,
    renderer.instanceOffset,
    result.buffer,
    0,
    result.byteLength
  );
  renderer.instanceOffset += result.byteLength;

  const firstInstance = renderer.instanceCount;
  renderer.instanceCount += entityIds.length;

  return firstInstance;
}

function getShaderPos2DRed(device: GPUDevice) {
  return device.createShaderModule({
    label: "draw colored objects in 2D",
    code: transform2DColorCode,
  });
}

function getShaderTrail(device: GPUDevice) {
  return device.createShaderModule({
    label: "draw colored objects in 2D",
    code: trailCode,
  });
}

function getShaderParticleCompute(device: GPUDevice) {
  return device.createShaderModule({
    label: "update particles",
    code: particleComputeCode,
  });
}

function getShaderParticleRender(device: GPUDevice) {
  return device.createShaderModule({
    label: "draw particles",
    code: particleRenderCode,
  });
}

export function emitTrailVertices(device: GPUDevice) {
  const WIDTH = 6;

  const vertexCount = state.trails.data.length.reduce(
    (prev, cur) => prev + cur,
    0
  );
  if (vertexCount == 0) return;

  const vertices = new Float32Array(vertexCount * 6 * 2);
  const indices = new Uint16Array(
    Math.ceil((vertexCount * 2 + state.trails.len - 1) / 2) * 2
  );
  let vertexIndex = 0;
  let indicesIndex = 0;
  let currentVertex = 0;

  for (let i = 0; i < state.trails.len; i++) {
    const trailLen = state.trails.data.length[i];
    const head = state.trails.data.head[i];

    for (let j = head; j < head + trailLen; j++) {
      const tpIndex = i * MAX_TRAIL_LENGTH + (j % MAX_TRAIL_LENGTH);
      const px = state.trailPoints.data.x[tpIndex];
      const py = state.trailPoints.data.y[tpIndex];
      let pnx: number;
      let pny: number;

      if (j < head + trailLen - 1) {
        const tpIndexNext = i * MAX_TRAIL_LENGTH + ((j + 1) % MAX_TRAIL_LENGTH);
        pnx = state.trailPoints.data.x[tpIndexNext];
        pny = state.trailPoints.data.y[tpIndexNext];
      } else {
        const ownerId = state.trails.data.ownerId[i];
        const baseIdx = state.idToBaseLookup[ownerId];
        pnx = state.baseEntities.data.x[baseIdx];
        pny = state.baseEntities.data.y[baseIdx];
      }

      const dirX = pnx - px;
      const dirY = pny - py;
      const len = Math.hypot(dirX, dirY);
      const dirNormX = dirX / len;
      const dirNormY = dirY / len;

      const leftX = -dirNormY;
      const leftY = dirNormX;
      const rightX = dirNormY;
      const rightY = -dirNormX;

      const pLeftX = px + (leftX * WIDTH) / 2;
      const pLeftY = py + (leftY * WIDTH) / 2;
      const pRightX = px + (rightX * WIDTH) / 2;
      const pRightY = py + (rightY * WIDTH) / 2;

      vertices[vertexIndex++] = pLeftX; // x
      vertices[vertexIndex++] = pLeftY; // y
      vertices[vertexIndex++] = 1; // r
      vertices[vertexIndex++] = 1; // g
      vertices[vertexIndex++] = 1; // b
      vertices[vertexIndex++] = ((j - head) / trailLen) * 0.8; // a
      indices[indicesIndex++] = currentVertex;

      vertices[vertexIndex++] = pRightX;
      vertices[vertexIndex++] = pRightY;
      vertices[vertexIndex++] = 1;
      vertices[vertexIndex++] = 1;
      vertices[vertexIndex++] = 1;
      vertices[vertexIndex++] = ((j - head + 1) / trailLen) * 0.8;
      indices[indicesIndex++] = currentVertex + 1;

      currentVertex += 2;
    }

    if (i < state.trails.len - 1) {
      indices[indicesIndex++] = 0xffff; // Restart index
    }
  }

  device.queue.writeBuffer(renderer.trailVertexBuffer, 0, vertices);
  device.queue.writeBuffer(renderer.trailInstanceBuffer, 0, indices);
}

export function renderTrails() {
  const indexCount =
    state.trails.data.length.reduce((prev, cur) => prev + cur, 0) * 2 +
    state.trails.len -
    1;
  if (indexCount <= 0) return;
  renderer.renderQueue.push({
    pipeline: "trail",
    bindGroup: "camera",
    kind: "vfx",
    firstIndex: 0,
    indexCount,
  });
}

export function setupParticleRendering(device: GPUDevice) {
  const zeroBuff = new Uint32Array(1);
  zeroBuff[0] = 0;
  device.queue.writeBuffer(renderer.particleDrawCountBuffer, 0, zeroBuff);

  const EMITTER_STRIDE = 96;
  const emitterData = new ArrayBuffer(EMITTER_STRIDE * 500);
  const dv = new DataView(emitterData);

  const pd = state.particleEmitters.data;
  let base = 0;

  for (let i = 0; i < state.particleEmitters.len; i++) {
    const offset = i * EMITTER_STRIDE;
    dv.setUint32(offset, base, true);
    dv.setUint32(offset + 4, pd.count[i], true);
    dv.setFloat32(offset + 8, pd.lifeTime[i], true);
    dv.setFloat32(offset + 12, 0, true);
    dv.setFloat32(offset + 16, pd.posMinX[i], true);
    dv.setFloat32(offset + 20, pd.posMinY[i], true);
    dv.setFloat32(offset + 24, pd.posMaxX[i], true);
    dv.setFloat32(offset + 28, pd.posMaxY[i], true);
    dv.setFloat32(offset + 32, pd.velMinX[i], true);
    dv.setFloat32(offset + 36, pd.velMinY[i], true);
    dv.setFloat32(offset + 40, pd.velMaxX[i], true);
    dv.setFloat32(offset + 44, pd.velMaxY[i], true);
    dv.setFloat32(offset + 48, pd.scaleInitX[i], true);
    dv.setFloat32(offset + 52, pd.scaleInitY[i], true);
    dv.setFloat32(offset + 56, pd.scaleFinalX[i], true);
    dv.setFloat32(offset + 60, pd.scaleFinalY[i], true);
    dv.setFloat32(offset + 64, pd.colorInitR[i], true);
    dv.setFloat32(offset + 68, pd.colorInitG[i], true);
    dv.setFloat32(offset + 72, pd.colorInitB[i], true);
    dv.setFloat32(offset + 76, pd.colorInitA[i], true);
    dv.setFloat32(offset + 80, pd.colorFinalR[i], true);
    dv.setFloat32(offset + 84, pd.colorFinalG[i], true);
    dv.setFloat32(offset + 88, pd.colorFinalB[i], true);
    dv.setFloat32(offset + 92, pd.colorFinalA[i], true);

    base += pd.count[i];
  }

  device.queue.writeBuffer(renderer.particleEmitterBuffer, 0, emitterData);

  const paramsBuffer = new ArrayBuffer(20);
  const paramDv = new DataView(paramsBuffer);

  const newParticleCount = state.particleEmitters.data.count.reduce(
    (sum, v) => sum + v,
    0
  );

  paramDv.setUint32(0, MAX_PARTICLE_COUNT, true);
  paramDv.setUint32(4, state.particleEmitters.len, true);
  paramDv.setUint32(8, newParticleCount, true);
  paramDv.setUint32(12, Math.floor(state.time.now % 10000), true);
  paramDv.setFloat32(16, state.time.deltaTime, true);

  device.queue.writeBuffer(renderer.particleParametersBuffer, 0, paramsBuffer);
}

// Mouse pos is from last frame when doing gameplay
// might matter
export function updateCamAndMouse(device: GPUDevice) {
  const vpMatrix = mat4.create();
  const vMatrix = mat4.create();

  const halfWidth = state.canvas.width / 2;
  const halfHeight = state.canvas.height / 2;

  mat4.scale(vMatrix, vMatrix, [state.camera.zoom, state.camera.zoom, 1]);
  mat4.rotate(vMatrix, vMatrix, state.camera.r, [0, 0, 1]);
  mat4.translate(vMatrix, vMatrix, [-state.camera.x, -state.camera.y, 0]);

  mat4.orthoZO(vpMatrix, -halfWidth, halfWidth, -halfHeight, halfHeight, -1, 1);
  mat4.multiply(vpMatrix, vpMatrix, vMatrix);

  device.queue.writeBuffer(
    renderer.cameraBuffer,
    0,
    (vpMatrix as Float32Array).buffer
  );

  const mouseVec = vec4.create();
  vec4.set(
    mouseVec,
    state.mousePos.raw.x - halfWidth,
    halfHeight - state.mousePos.raw.y,
    0,
    1
  );
  const invertMat = mat4.create();
  mat4.invert(invertMat, vMatrix);
  vec4.transformMat4(mouseVec, mouseVec, invertMat);

  state.mousePos.world.x = mouseVec[0];
  state.mousePos.world.y = mouseVec[1];
}
