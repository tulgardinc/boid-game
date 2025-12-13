import {
  InstanceBufferLayouts,
  Renderer,
  VertexBufferLayouts,
} from "./renderer";

export function get2DTransformPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  bindGroupLayouts: Renderer["bindGroups"],
  shaders: Renderer["shaders"],
  vertexBufferLayouts: VertexBufferLayouts,
  instanceBufferLayouts: InstanceBufferLayouts
): GPURenderPipeline {
  return device.createRenderPipeline({
    label: "textured quad",
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayouts.camera.layout],
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
  });
}

export function getTrailPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  bindGroupLayouts: Renderer["bindGroups"],
  shaders: Renderer["shaders"],
  vertexBufferLayouts: VertexBufferLayouts
): GPURenderPipeline {
  return device.createRenderPipeline({
    label: "trail",
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayouts.camera.layout],
    }),
    vertex: {
      entryPoint: "vs",
      module: shaders.trail,
      buffers: [vertexBufferLayouts.pos2DColor],
    },
    fragment: {
      entryPoint: "fs",
      module: shaders.trail,
      targets: [{ format }],
    },
    primitive: { topology: "triangle-list" },
  });
}
