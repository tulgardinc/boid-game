import { rendering, state } from "../state";
import { TFToInstance } from "../transform";

const vertices = new Float32Array([
  -0.5, -0.5,

  0.5, -0.5,

  -0.5, 0.5,

  0.5, 0.5,
]);

export function initializeQuadMesh(device: GPUDevice) {
  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
  vertexBuffer.unmap();

  const instanceBuffer = device.createBuffer({
    size: 4 * 4 * 100,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  const instanceBufferLayout: GPUVertexBufferLayout = {
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
  };

  const vertexBufferLayout: GPUVertexBufferLayout = {
    arrayStride: 2 * 4,
    stepMode: "vertex",
    attributes: [
      {
        shaderLocation: 0,
        offset: 0,
        format: "float32x2",
      },
    ],
  };

  rendering.meshes.quad.iBuffer = instanceBuffer;
  rendering.meshes.quad.iBufferLayout = instanceBufferLayout;
  rendering.meshes.quad.vBuffer = vertexBuffer;
  rendering.meshes.quad.vBufferLayout = vertexBufferLayout;
}

export function updateQuadGPUData(device: GPUDevice) {
  const instances: Float32Array = TFToInstance(state.transforms);
  device.queue.writeBuffer(rendering.meshes.quad.iBuffer, 0, instances.buffer);
}

export function renderTexturedQuads(pass: GPURenderPassEncoder) {
  pass.setPipeline(rendering.pipelines.texturedQuad);
  pass.setBindGroup(0, rendering.uniforms.camera.bindGroup);
  pass.setVertexBuffer(0, rendering.meshes.quad.vBuffer);
  pass.setVertexBuffer(1, rendering.meshes.quad.iBuffer);
  pass.draw(4, state.asteroids.len);
}
