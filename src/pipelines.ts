import {
  InstanceBufferLayouts,
  Renderer,
  VertexBufferLayouts,
} from "./renderer";

export function get2DTransformPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  bindGroups: Renderer["bindGroups"],
  shaders: Renderer["shaders"],
  vertexBufferLayouts: VertexBufferLayouts,
  instanceBufferLayouts: InstanceBufferLayouts
): GPURenderPipeline {
  return device.createRenderPipeline({
    label: "textured quad",
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroups.camera.layout],
    }),
    vertex: {
      entryPoint: "vs",
      module: shaders.coloredTransform,
      buffers: [vertexBufferLayouts.pos2D, instanceBufferLayouts.transform2D],
    },
    fragment: {
      entryPoint: "fs",
      module: shaders.coloredTransform,
      targets: [{ format }],
    },
    primitive: { topology: "triangle-list" },
    depthStencil: {
      format: "depth24plus",
      depthCompare: "less",
      depthWriteEnabled: false, // or true if you want it to write depth
    },
  });
}

export function getTrailPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  bindGroups: Renderer["bindGroups"],
  shaders: Renderer["shaders"],
  vertexBufferLayouts: VertexBufferLayouts
): GPURenderPipeline {
  return device.createRenderPipeline({
    label: "trail",
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroups.camera.layout],
    }),
    vertex: {
      entryPoint: "vs",
      module: shaders.trail,
      buffers: [vertexBufferLayouts.pos2DColor],
    },
    fragment: {
      entryPoint: "fs",
      module: shaders.trail,
      targets: [
        {
          format,
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
        },
      ],
    },
    primitive: { topology: "triangle-strip", stripIndexFormat: "uint16" },
    depthStencil: {
      format: "depth24plus",
      depthCompare: "less-equal",
      depthWriteEnabled: false,
    },
  });
}

// Particles
export function getParticleSpawnPipeline(
  device: GPUDevice,
  bindGroups: Renderer["bindGroups"],
  shaders: Renderer["shaders"]
) {
  return device.createComputePipeline({
    label: "particle spawning",
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroups.particleComputeAB.layout],
    }),
    compute: { module: shaders.particleCompute, entryPoint: "spawn" },
  });
}

export function getParticleStatePipeline(
  device: GPUDevice,
  bindGroups: Renderer["bindGroups"],
  shaders: Renderer["shaders"]
): GPUComputePipeline {
  return device.createComputePipeline({
    label: "particle state update",
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroups.particleComputeAB.layout],
    }),
    compute: { module: shaders.particleCompute, entryPoint: "update_state" },
  });
}

export function getParticleDrawListPipeline(
  device: GPUDevice,
  bindGroups: Renderer["bindGroups"],
  shaders: Renderer["shaders"]
): GPUComputePipeline {
  return device.createComputePipeline({
    label: "particle draw list",
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroups.particleComputeAB.layout],
    }),
    compute: {
      module: shaders.particleCompute,
      entryPoint: "update_draw_list",
    },
  });
}

export function getParticleRenderPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  bindGroups: Renderer["bindGroups"],
  shaders: Renderer["shaders"]
): GPURenderPipeline {
  return device.createRenderPipeline({
    label: "particle render",
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        bindGroups.particleRenderA.layout,
        bindGroups.camera.layout,
      ],
    }),
    vertex: {
      entryPoint: "vs",
      module: shaders.particleRender,
    },
    fragment: {
      entryPoint: "fs",
      module: shaders.particleRender,
      targets: [
        {
          format,
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
        },
      ],
    },
    primitive: { topology: "triangle-list" },
    depthStencil: {
      format: "depth24plus",
      depthCompare: "less-equal",
      depthWriteEnabled: true,
    },
  });
}
