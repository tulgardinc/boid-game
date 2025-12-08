import { renderer, updateTransformColorGPUData } from "../renderer";
import { state } from "../state";

// prettier-ignore
const vertices = new Float32Array([
  -0.5, -0.5,
  0.5, -0.5,
  -0.5, 0.5,
  0.5, 0.5,
]);

// prettier-ignore
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

export function renderTexturedQuads(device: GPUDevice) {
  const asteroidIds = [];
  for (let i = 0; i < state.asteroids.len; i++) {
    asteroidIds.push(state.asteroids.data.baseEnitityId[i]);
  }

  const firstInstance = updateTransformColorGPUData(device, asteroidIds);

  renderer.renderQueue.push({
    pipeline: "transform2D",
    mesh: "quad",
    bindGroup: "camera",
    instanceCount: state.asteroids.len,
    firstInstance,
    indexCount: indices.length,
  });
}
