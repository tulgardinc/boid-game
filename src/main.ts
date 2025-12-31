import {
  initializeState,
  updateGameTime,
  deleteScheduledEntities,
  state,
} from "./state";
import "./style.css";
import { asteroidUpdate } from "./asteroid";
import {
  emitTrailVertices,
  initRenderer,
  MAX_PARTICLE_COUNT,
  renderer,
  renderTrails,
  setupParticleRendering,
  updateCamAndMouse,
} from "./renderer";
import { renderBoids } from "./meshes/boid";
import { renderTexturedQuads } from "./meshes/quad";
import { updateBoids, updateBoidTrails } from "./boid";
import { detectCollisionsOBB, handleCollisions, physicsUpdate } from "./util";
import { updateHealthBars } from "./healthbar";
import { cameraUpdate } from "./camera";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
    <canvas width="1920" height="1080" id="canvas"></canvas>
`;

export const canvas = document.querySelector("canvas")!;

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

  const context = canvas.getContext("webgpu")!;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
  });

  initializeState();
  initRenderer(device, presentationFormat);

  let depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const computePassDescriptor: GPUComputePassDescriptor = {
    label: "compute pass",
  };

  const renderPassDescriptor: GPURenderPassDescriptor = {
    label: "basic canvas render pass",
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: "clear",
        storeOp: "store",
      },
    ],
    depthStencilAttachment: {
      view: depthTexture.createView(),
      depthLoadOp: "clear",
      depthStoreOp: "store",
      depthClearValue: 1.0,
    },
  };

  function render() {
    // system logic
    updateGameTime();

    // game logic
    asteroidUpdate();
    updateHealthBars();
    updateBoids();

    // deletetions
    deleteScheduledEntities();

    // physics
    physicsUpdate();

    // trail update
    updateBoidTrails();
    emitTrailVertices(device);

    // collision check
    detectCollisionsOBB();

    // handle collisions
    handleCollisions();

    cameraUpdate();

    // send particle data
    setupParticleRendering(device);

    // renderer
    updateCamAndMouse(device);
    renderTrails();
    renderBoids(device);
    renderTexturedQuads(device);

    (
      renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[]
    )[0].view = context.getCurrentTexture().createView();
    const encoder = device.createCommandEncoder({ label: "encoder" });

    // compute pass
    const particleComputeBG = renderer.particleShouldUseAB
      ? renderer.bindGroups.particleComputeAB.group
      : renderer.bindGroups.particleComputeBA.group;

    const particleRenderBG = renderer.particleShouldUseAB
      ? renderer.bindGroups.particleRenderA.group
      : renderer.bindGroups.particleRenderB.group;

    const computePass = encoder.beginComputePass(computePassDescriptor);

    const totalParticlesToSpawn = state.particleEmitters.data.count.reduce(
      (sum, v) => sum + v,
      0
    );

    computePass.setPipeline(renderer.computePipelines.particleSpawn);
    computePass.setBindGroup(0, particleComputeBG);
    const wgSpawnCount = Math.ceil(totalParticlesToSpawn / 256);
    computePass.dispatchWorkgroups(wgSpawnCount, 1, 1);

    computePass.setPipeline(renderer.computePipelines.particleState);
    computePass.setBindGroup(0, particleComputeBG);
    const wgUpdateCount = Math.ceil(MAX_PARTICLE_COUNT / 256);
    computePass.dispatchWorkgroups(wgUpdateCount, 1, 1);

    computePass.setPipeline(renderer.computePipelines.particleDrawList);
    computePass.setBindGroup(0, particleComputeBG);
    computePass.dispatchWorkgroups(wgUpdateCount, 1, 1);

    computePass.end();

    // render pass
    const renderPass = encoder.beginRenderPass(renderPassDescriptor);

    for (const command of renderer.renderQueue) {
      switch (command.kind) {
        case "mesh":
          renderPass.setPipeline(renderer.renderPipelines[command.pipeline]);
          renderPass.setBindGroup(
            0,
            renderer.bindGroups[command.bindGroup].group
          );
          renderPass.setVertexBuffer(
            0,
            renderer.meshes[command.mesh].vertexBuffer
          );
          renderPass.setIndexBuffer(
            renderer.meshes[command.mesh].indexBuffer,
            "uint16"
          );
          renderPass.setVertexBuffer(1, renderer.instanceBuffer);
          renderPass.drawIndexed(
            command.indexCount,
            command.instanceCount,
            0,
            0,
            command.firstInstance
          );
          break;
        case "vfx":
          renderPass.setPipeline(renderer.renderPipelines[command.pipeline]);
          renderPass.setBindGroup(
            0,
            renderer.bindGroups[command.bindGroup].group
          );
          renderPass.setVertexBuffer(0, renderer.trailVertexBuffer);
          renderPass.setIndexBuffer(renderer.trailInstanceBuffer, "uint16");
          renderPass.drawIndexed(command.indexCount, 1, 0, 0);
          break;
      }
    }

    // Render particles
    renderPass.setPipeline(renderer.renderPipelines.particleRender);
    renderPass.setBindGroup(0, particleRenderBG);
    renderPass.setBindGroup(1, renderer.bindGroups.camera.group);
    const VERRICES_PER_PARTICLE = 6;
    renderPass.draw(MAX_PARTICLE_COUNT * VERRICES_PER_PARTICLE);

    renderPass.end();

    const commandBuffer = encoder.finish();

    renderer.instanceOffset = 0;
    renderer.instanceCount = 0;
    renderer.renderQueue.length = 0;

    renderer.particleShouldUseAB = !renderer.particleShouldUseAB;
    renderer.frameNo++;
    state.particleEmitters.len = 0;

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

    state.canvas.width = canvas.width;
    state.canvas.height = canvas.height;

    depthTexture.destroy();
    depthTexture = device.createTexture({
      size: [canvas.width, canvas.height],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    (
      renderPassDescriptor.depthStencilAttachment as GPURenderPassDepthStencilAttachment
    ).view = depthTexture.createView();
  }

  window.addEventListener("resize", configureContext);

  configureContext();

  render();
}

await main();
