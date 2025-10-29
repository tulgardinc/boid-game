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
  layout: GPUBindGroupLayout,
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
