import quadShaderCode from "./quad.wgsl?raw";
import { instanceBufferLayouts, rendering, vertexBufferLayouts } from "./state";

export function get2DTransformPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  bindGroupLayouts: GPUBindGroupLayout[]
) {
  const mod = device.createShaderModule({
    label: "quad renderer",
    code: quadShaderCode,
  });

  return device.createRenderPipeline({
    label: "textured quad",
    layout: device.createPipelineLayout({
      bindGroupLayouts,
    }),
    vertex: {
      entryPoint: "vs",
      module: mod,
      buffers: [vertexBufferLayouts.quad, instanceBufferLayouts.quad],
    },
    fragment: {
      entryPoint: "fs",
      module: mod,
      targets: [{ format }],
    },
    primitive: { topology: "triangle-strip" },
  });
}
