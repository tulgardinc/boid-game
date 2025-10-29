import { renderer } from "../renderer";
import { state } from "../state";
import { TFToInstance } from "../transform";

const vertices = new Float32Array([
  -0.5, -0.5,

  0.5, -0.5,

  -0.5, 0.5,

  0.5, 0.5,
]);

const indices = new Uint16Array([
  0, 1, 2,

  2, 1, 3,
]);

export function getQuadVertexBuffer(device: GPUDevice) {
  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(vertexBuffer, 0, vertices.buffer);
  return vertexBuffer;
}

export function getQuadIndexBuffer(device: GPUDevice): GPUBuffer {
  const indexBuffer = device.createBuffer({
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    size: indices.byteLength,
  });

  device.queue.writeBuffer(indexBuffer, 0, indices.buffer);
  return indexBuffer;
}

export function updateQuadGPUData(device: GPUDevice) {
  const instances: Float32Array = TFToInstance(state.transforms);
  device.queue.writeBuffer(renderer.instanceBuffer, 0, instances.buffer);
}

export function renderTexturedQuads() {
  renderer.renderQueue.push({
    pipeline: "transform2D",
    mesh: "quad",
    bindGroup: "camera",
    instanceCount: state.asteroids.len,
    instanceOffset: 0,
    vertexCount: 4,
  });
}
