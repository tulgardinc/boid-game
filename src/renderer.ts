import transform2DColorCode from "./shaders/coloredTransform.wgsl?raw";
import trailCode from "./shaders/trail.wgsl?raw";
import { getBoidIndexBufer, getBoidVertexBuffer } from "./meshes/boid";
import { getQuadVertexBuffer, getQuadIndexBuffer } from "./meshes/quad";
import { get2DTransformPipeline, getTrailPipeline } from "./pipelines";
import { getAbsoluteTPIndex, MAX_TRAIL_LENGTH, state } from "./state";
import { getCameraBindGroup, getCameraBindGroupLayout } from "./uniforms";
import { dir } from "console";

export type Renderer = {
  instanceCount: number;
  instanceOffset: number;
  dynamicVertBuffer: GPUBuffer;
  instanceBuffer: GPUBuffer;
  shaders: {
    coloredTransform: GPUShaderModule;
    trail: GPUShaderModule;
  };
  meshes: {
    quad: Mesh;
    boid: Mesh;
  };
  piplines: {
    transform2D: GPURenderPipeline;
    trail: GPURenderPipeline;
  };
  bindGroups: {
    camera: {
      layout: GPUBindGroupLayout;
      group: GPUBindGroup;
    };
  };
  renderQueue: (RenderCommandMesh | RenderCommandVFX)[];
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

function initVertexBuffer(device: GPUDevice) {
  return device.createBuffer({
    size: 5 * 4 * 1000,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
}

export type Mesh = {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  vertexBufferLayoutId: keyof typeof vertexBufferLayouts;
  instanceBufferLayoutId: keyof typeof instanceBufferLayouts;
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
    coloredTransform: getShaderPos2DRed(device),
    trail: getShaderTrail(device),
  };

  renderer = {
    instanceCount: 0,
    instanceOffset: 0,
    dynamicVertBuffer: initVertexBuffer(device),
    instanceBuffer: initInstanceBuffer(device),
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
    piplines: {
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
    },
    bindGroups,
    shaders,
    renderQueue: [],
  };
}

export type RenderCommandMesh = {
  kind: "mesh";
  pipeline: keyof Renderer["piplines"];
  mesh: keyof Renderer["meshes"];
  bindGroup: keyof Renderer["bindGroups"];
  instanceCount: number;
  firstInstance: number;
  indexCount: number;
};

export type RenderCommandVFX = {
  kind: "vfx";
  pipeline: keyof Renderer["piplines"];
  bindGroup: keyof Renderer["bindGroups"];
  vertexCount: number;
  firstVertex: number;
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

export function emitTrailVertices(device: GPUDevice) {
  const WIDTH = 6;

  const segementCount = state.trails.data.length.reduce(
    (prev, cur) => (cur > 2 ? prev + cur - 1 : prev),
    0
  );
  if (segementCount == 0) return;

  const vertices = new Float32Array(segementCount * 6 * 2);
  let vertexIndex = 0;

  for (let i = 0; i < state.trails.len; i++) {
    const trailLen = state.trails.data.length[i];
    const head = state.trails.data.head[i];

    for (let j = head; j < head + trailLen - 1; j++) {
      const tpIndex = i * MAX_TRAIL_LENGTH + (j % MAX_TRAIL_LENGTH);
      const tpIndexNext = i * MAX_TRAIL_LENGTH + ((j + 1) % MAX_TRAIL_LENGTH);
      const px = state.trailPoints.data.x[tpIndex];
      const py = state.trailPoints.data.y[tpIndex];
      const pnx = state.trailPoints.data.x[tpIndexNext];
      const pny = state.trailPoints.data.y[tpIndexNext];

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

      vertices[vertexIndex++] = pLeftX;
      vertices[vertexIndex++] = pLeftY;
      vertices[vertexIndex++] = 1;
      vertices[vertexIndex++] = 1;
      vertices[vertexIndex++] = 1;
      vertices[vertexIndex++] = ((j - head) / trailLen) * 0.8;

      vertices[vertexIndex++] = pRightX;
      vertices[vertexIndex++] = pRightY;
      vertices[vertexIndex++] = 1;
      vertices[vertexIndex++] = 1;
      vertices[vertexIndex++] = 1;
      vertices[vertexIndex++] = ((j - head + 1) / trailLen) * 0.8;
    }
  }

  device.queue.writeBuffer(renderer.dynamicVertBuffer, 0, vertices);
}

export function renderTrails() {
  renderer.renderQueue.push({
    pipeline: "trail",
    bindGroup: "camera",
    kind: "vfx",
    vertexCount:
      state.trails.data.length.reduce(
        (prev, cur) => (cur > 2 ? prev + cur - 1 : prev),
        0
      ) * 2,
    firstVertex: 0,
  });
}
