import transform2DColor from "./shaders/coloredTransform.wgsl?raw";
import { getBoidIndexBufer, getBoidVertexBuffer } from "./meshes/boid";
import { getQuadVertexBuffer, getQuadIndexBuffer } from "./meshes/quad";
import { get2DTransformPipeline } from "./pipelines";
import { state } from "./state";
import { getCameraBindGroup, getCameraBindGroupLayout } from "./uniforms";

export type Renderer = {
  instanceCount: number;
  instanceOffset: number;
  instanceBuffer: GPUBuffer;
  shaders: {
    pos2DRed: GPUShaderModule;
  };
  meshes: {
    quad: Mesh;
    boid: Mesh;
  };
  piplines: {
    transform2D: GPURenderPipeline;
  };
  bindGroups: {
    camera: {
      layout: GPUBindGroupLayout;
      group: GPUBindGroup;
    };
  };
  renderQueue: RenderCommand[];
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
};

export type InstanceBufferLayouts = {
  [K in keyof typeof instanceBufferLayouts]: GPUVertexBufferLayout;
};
const instanceBufferLayouts: { [k: string]: GPUVertexBufferLayout } = {
  transform2D: {
    arrayStride: 7 * 4,
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
        format: "float32",
      },
      {
        shaderLocation: 3,
        offset: 3 * 4,
        format: "float32",
      },
      {
        shaderLocation: 4,
        offset: 4 * 4,
        format: "float32x3",
      },
    ],
  },
};

function initInstanceBuffer(device: GPUDevice) {
  return device.createBuffer({
    size: 7 * 4 * 1000,
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
    pos2DRed: getShaderPos2DRed(device),
  };

  renderer = {
    instanceCount: 0,
    instanceOffset: 0,
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
  firstInstance: number;
  indexCount: number;
};

export function updateTransformColorGPUData(
  device: GPUDevice,
  entityIds: number[]
) {
  const result = new Float32Array(entityIds.length * 7);
  const d = state.baseEntities.data;

  let i = 0;
  for (const eid of entityIds) {
    result[i++] = d.x[eid];
    result[i++] = d.y[eid];
    result[i++] = d.s[eid];
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
    code: transform2DColor,
  });
}
