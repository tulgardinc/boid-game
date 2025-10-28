import { mat4 } from "gl-matrix";

export function bindCameraUniform(device: GPUDevice) {
  const vpMatrix = mat4.create();
  mat4.orthoZO(vpMatrix, -1920 / 2, 1920 / 2, -1080 / 2, 1080 / 2, -1, 1);

  const cameraUBO = device.createBuffer({
    label: "camera buffer",
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    size: (vpMatrix as Float32Array).byteLength,
  });

  const cameraBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "uniform" },
      },
    ],
  });

  const cameraBindGroup = device.createBindGroup({
    label: "camera bind",
    layout: cameraBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: { buffer: cameraUBO },
      },
    ],
  });

  device.queue.writeBuffer(cameraUBO, 0, (vpMatrix as Float32Array).buffer);
}
