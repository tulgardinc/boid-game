import { getQuadVertexBuffer, getQuadIndexBuffer } from "./meshes/quad";
import { get2DTransformPipeline, getShaderPos2DRed } from "./pipelines";
import { getCameraBindGroup, getCameraBindGroupLayout } from "./uniforms";

export type Renderer = {
  instanceBuffer: GPUBuffer;
  shaders: {
    pos2DRed: GPUShaderModule;
  };
  meshes: {
    quad: Mesh;
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
    arrayStride: 4 * 4,
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
    ],
  },
};

function initInstanceBuffer(device: GPUDevice) {
  return device.createBuffer({
    size: 4 * 4 * 100,
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
    instanceBuffer: initInstanceBuffer(device),
    meshes: {
      quad: {
        vertexBuffer: getQuadVertexBuffer(device),
        indexBuffer: getQuadIndexBuffer(device),
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
        instanceBufferLayouts,
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
  instanceOffset: number;
  indexCount: number;
};
