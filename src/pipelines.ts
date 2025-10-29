import quadShaderCode from "./quad.wgsl?raw";
import {
  InstanceBufferLayouts,
  Renderer,
  VertexBufferLayouts,
} from "./renderer";

export function getShaderPos2DRed(device: GPUDevice) {
  return device.createShaderModule({
    label: "draw red from 2D",
    code: quadShaderCode,
  });
}

export function get2DTransformPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  bindGroupLayouts: Renderer["bindGroups"],
  shaders: Renderer["shaders"],
  vertexBufferLayouts: VertexBufferLayouts,
  instanceBufferLayouts: InstanceBufferLayouts,
): GPURenderPipeline {
  return device.createRenderPipeline({
    label: "textured quad",
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayouts.camera.layout],
    }),
    vertex: {
      entryPoint: "vs",
      module: shaders.pos2DRed,
      buffers: [vertexBufferLayouts.pos2D, instanceBufferLayouts.transform2D],
    },
    fragment: {
      entryPoint: "fs",
      module: shaders.pos2DRed,
      targets: [{ format }],
    },
    primitive: { topology: "triangle-list" },
  });
}
