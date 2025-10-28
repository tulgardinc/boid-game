import quadShaderCode from "./quad.wgsl?raw";
import { rendering } from "./state";

export async function initTexturedQuadPipeline(
  device: GPUDevice,
  format: GPUTextureFormat
) {
  const mod = device.createShaderModule({
    label: "quad renderer",
    code: quadShaderCode,
  });
  const info = await mod.getCompilationInfo();

  for (const message of info.messages) {
    const { lineNum, linePos, message: msg, type } = message;
    console.log(`[${type}] ${lineNum}:${linePos} - ${msg}`);
  }

  rendering.pipelines.texturedQuad = device.createRenderPipeline({
    label: "textured quad",
    layout: device.createPipelineLayout({
      bindGroupLayouts: [rendering.uniforms.camera.bindGroupLayout],
    }),
    vertex: {
      entryPoint: "vs",
      module: mod,
      buffers: [
        rendering.meshes.quad.vBufferLayout,
        rendering.meshes.quad.iBufferLayout,
      ],
    },
    fragment: {
      entryPoint: "fs",
      module: mod,
      targets: [{ format }],
    },
    primitive: { topology: "triangle-strip" },
  });
}
