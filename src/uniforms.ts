import { mat4 } from "gl-matrix";

export function getCameraBindGroupLayout(device: GPUDevice) {
  return device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "uniform" },
      },
    ],
  });
}

export function getCameraBindGroup(
  device: GPUDevice,
  layout: GPUBindGroupLayout
) {
  const vpMatrix = mat4.create();
  mat4.orthoZO(vpMatrix, -1920 / 2, 1920 / 2, -1080 / 2, 1080 / 2, -1, 1);

  const cameraUBO = device.createBuffer({
    label: "camera buffer",
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    size: (vpMatrix as Float32Array).byteLength,
  });

  device.queue.writeBuffer(cameraUBO, 0, (vpMatrix as Float32Array).buffer);

  return device.createBindGroup({
    label: "camera bind",
    layout,
    entries: [
      {
        binding: 0,
        resource: { buffer: cameraUBO },
      },
    ],
  });
}

export function getParticleComputeBindGroupLayout(device: GPUDevice) {
  return device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      {
        binding: 4,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
      {
        binding: 5,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      {
        binding: 6,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
    ],
  });
}

export function getParticleComputeBindGroup(
  device: GPUDevice,
  layout: GPUBindGroupLayout,
  particleDrawListBuffer: GPUBuffer,
  particleDrawCountBuffer: GPUBuffer,
  particleStateBufferA: GPUBuffer,
  particleStateBufferB: GPUBuffer,
  particleParametersBuffer: GPUBuffer,
  particleEmitterBuffer: GPUBuffer,
  particleRingCursorBuffer: GPUBuffer
) {
  return device.createBindGroup({
    label: "particle bind",
    layout,
    entries: [
      {
        binding: 0,
        resource: { buffer: particleStateBufferA },
      },
      {
        binding: 1,
        resource: { buffer: particleStateBufferB },
      },
      {
        binding: 2,
        resource: { buffer: particleDrawListBuffer },
      },
      {
        binding: 3,
        resource: { buffer: particleDrawCountBuffer },
      },
      {
        binding: 4,
        resource: { buffer: particleParametersBuffer },
      },
      {
        binding: 5,
        resource: { buffer: particleEmitterBuffer },
      },
      {
        binding: 6,
        resource: { buffer: particleRingCursorBuffer },
      },
    ],
  });
}

export function getParticleRenderBindGroupLayout(device: GPUDevice) {
  return device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "read-only-storage" },
      },
    ],
  });
}

export function getParticleRenderBindGroup(
  device: GPUDevice,
  layout: GPUBindGroupLayout,
  particleDrawListBuffer: GPUBuffer,
  particleStateBuffer: GPUBuffer
) {
  return device.createBindGroup({
    label: "particle bind",
    layout,
    entries: [
      {
        binding: 0,
        resource: { buffer: particleStateBuffer },
      },
      {
        binding: 1,
        resource: { buffer: particleDrawListBuffer },
      },
    ],
  });
}
