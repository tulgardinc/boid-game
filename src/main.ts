import { initializeState, deltaTimeUpdate } from "./state";
import "./style.css";
import { asteroidUpdate } from "./asteroid";
import { initRenderer, renderer } from "./renderer";
import { renderBoids } from "./meshes/boid";
import { renderTexturedQuads } from "./meshes/quad";
import { updateBoids } from "./boid";
import { detectCollisions, handleCollisions, physicsUpdate } from "./util";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
    <canvas width="1920" height="1080" id="canvas"></canvas>
`;

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
  initRenderer(device, presentationFormat);

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
    // system logic
    deltaTimeUpdate();

    // game logic
    asteroidUpdate();
    updateBoids();

    // physics
    physicsUpdate();

    // collision check
    detectCollisions();

    // handle collisions
    handleCollisions();

    // renderer
    renderBoids(device);
    renderTexturedQuads(device);

    (
      renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[]
    )[0].view = context.getCurrentTexture().createView();
    const encoder = device.createCommandEncoder({ label: "encoder" });

    const pass = encoder.beginRenderPass(
      renderPassDescriptor as GPURenderPassDescriptor
    );

    for (const command of renderer.renderQueue) {
      pass.setPipeline(renderer.piplines[command.pipeline]);
      pass.setBindGroup(0, renderer.bindGroups[command.bindGroup].group);
      pass.setVertexBuffer(0, renderer.meshes[command.mesh].vertexBuffer);
      pass.setIndexBuffer(renderer.meshes[command.mesh].indexBuffer, "uint16");
      pass.setVertexBuffer(1, renderer.instanceBuffer);
      pass.drawIndexed(
        command.indexCount,
        command.instanceCount,
        0,
        0,
        command.firstInstance
      );
    }

    pass.end();

    const commandBuffer = encoder.finish();

    renderer.instanceOffset = 0;
    renderer.instanceCount = 0;
    renderer.renderQueue.length = 0;

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
