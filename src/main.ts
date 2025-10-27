import { mat4 } from "gl-matrix";
import { initializeState, state, stateUpdate } from "./state";
import "./style.css";
import { TFToInstance } from "./transform";
import quadShaderCode from "./quad.wgsl?raw";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <canvas width="1920" height="1080" id="canvas"></canvas>
  </div>
`;

console.log("Test");

async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
  if (!adapter) {
    console.error("This browser does not support WebGPU");
    return;
  }
  const device = await adapter.requestDevice();

  device.addEventListener("uncapturederror", (event) => {
    const error = event.error;
    console.error("Uncaptured WebGPU error:", error);
  });

  const canvas = document.querySelector("canvas")!;
  const context = canvas.getContext("webgpu")!;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
  });

  initializeState();

  const vertices = new Float32Array([
    -0.5, -0.5,

    0.5, -0.5,

    -0.5, 0.5,

    0.5, 0.5,
  ]);

  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
  vertexBuffer.unmap();

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

  const instances: Float32Array = TFToInstance(state.transforms);
  console.log(instances);

  const instanceBuffer = device.createBuffer({
    size: instances.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(instanceBuffer, 0, instances.buffer);

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

  const mod = device.createShaderModule({
    label: "quad renderer",
    code: quadShaderCode,
  });
  const info = await mod.getCompilationInfo();

  for (const message of info.messages) {
    const { lineNum, linePos, message: msg, type } = message;
    console.log(`[${type}] ${lineNum}:${linePos} - ${msg}`);
  }

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

  const pipeline = device.createRenderPipeline({
    label: "triangle renderer pipeline",
    layout: device.createPipelineLayout({
      bindGroupLayouts: [cameraBindGroupLayout],
    }),
    vertex: {
      entryPoint: "vs",
      module: mod,
      buffers: [vertexBufferLayout, instanceBufferLayout],
    },
    fragment: {
      entryPoint: "fs",
      module: mod,
      targets: [{ format: presentationFormat }],
    },
    primitive: { topology: "triangle-strip" },
  });

  const renderPassDescriptor = {
    label: "basic canvas render pass",
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  };

  function render() {
    stateUpdate();

    (
      renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[]
    )[0].view = context.getCurrentTexture().createView();
    const encoder = device.createCommandEncoder({ label: "encoder" });

    const pass = encoder.beginRenderPass(
      renderPassDescriptor as GPURenderPassDescriptor,
    );
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, cameraBindGroup);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setVertexBuffer(1, instanceBuffer);
    pass.draw(4, 1);
    pass.end();

    const commandBuffer = encoder.finish();

    device.pushErrorScope("validation");
    device.queue.submit([commandBuffer]);

    requestAnimationFrame(render);
  }

  function resizeCanvasToDisplaySize() {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.floor(canvas.clientWidth * dpr);
    const height = Math.floor(canvas.clientHeight * dpr);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.height = height;
      canvas.width = width;
    }
  }

  function configureContext() {
    resizeCanvasToDisplaySize();
    context.configure({
      device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: "premultiplied",
    });
  }

  window.addEventListener("resize", configureContext);

  configureContext();

  render();
}

await main();
