import { renderer, updateTransformColorGPUData } from "../renderer";
import { state } from "../state";

// prettier-ignore
const vertices = new Float32Array([
  0.0, 0.5,
  -0.45, -0.5,
  0.0, -0.3,
  0.45, -0.5,
]);

// prettier-ignore
const indices = new Uint16Array([
  0, 1, 2,
  2, 3, 0,
]);

export function getBoidVertexBuffer(device: GPUDevice) {
  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(vertexBuffer, 0, vertices.buffer);
  return vertexBuffer;
}

export function getBoidIndexBufer(device: GPUDevice) {
  const indexBuffer = device.createBuffer({
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    size: indices.byteLength,
  });

  device.queue.writeBuffer(indexBuffer, 0, indices.buffer);
  return indexBuffer;
}

export function renderBoids(device: GPUDevice) {
  const boidIds = [];
  for (let i = 0; i < state.boids.len; i++) {
    boidIds.push(state.boids.data.baseId[i]);
  }

  const firstInstance = updateTransformColorGPUData(device, boidIds);

  renderer.renderQueue.push({
    pipeline: "transform2D",
    mesh: "boid",
    bindGroup: "camera",
    instanceCount: state.boids.len,
    firstInstance,
    indexCount: indices.length,
    kind: "mesh",
  });
}
