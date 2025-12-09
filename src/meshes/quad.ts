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
  const quadIds = [];
  for (let i = 0; i < state.asteroids.len; i++) {
    quadIds.push(state.asteroids.data.baseId[i]);
  }
  for (let i = 0; i < state.outerHealthBars.len; i++) {
    quadIds.push(state.outerHealthBars.data.baseId[i]);
  }
  for (let i = 0; i < state.innerHealthBars.len; i++) {
    quadIds.push(state.innerHealthBars.data.baseId[i]);
  }

  const firstInstance = updateTransformColorGPUData(device, quadIds);

  renderer.renderQueue.push({
    pipeline: "transform2D",
    mesh: "quad",
    bindGroup: "camera",
    instanceCount: quadIds.length,
    firstInstance,
    indexCount: indices.length,
  });
}
