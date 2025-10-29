import { rendering, state } from "../state";
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

export function getQuadVertexBufferLayout(): GPUVertexBufferLayout {
  return {
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
}

export function getQuadIndexBuffer(device: GPUDevice): GPUBuffer {
  const indexBuffer = device.createBuffer({
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    size: indices.byteLength,
  });

  device.queue.writeBuffer(indexBuffer, 0, indices.buffer);
  return indexBuffer;
}

export function initInstanceBuffer(device: GPUDevice) {
  return device.createBuffer({
    size: 4 * 4 * 100,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
}

export function getQuadInstanceBufferLayout(): GPUVertexBufferLayout {
  return {
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
}

export function updateQuadGPUData(device: GPUDevice) {
  const instances: Float32Array = TFToInstance(state.transforms);
  device.queue.writeBuffer(rendering.instanceBuffer, 0, instances.buffer);
}

export function renderTexturedQuads() {
  rendering.renderQueue.push({
    pipeline: "Transform2D",
    mesh: "quad",
    bindGroup: "camera",
    instanceCount: state.asteroids.len,
    instanceOffset: 0,
    vertexCount: 4,
  });
}
