import {
  initializeState,
  updateGameTime,
  deleteScheduledEntities,
  state,
  TextAlign,
  Screen,
} from "./state";
import "./style.css";
import { asteroidUpdate } from "./asteroid";
import {
  emitTrailVertices,
  initRenderer,
  renderer,
  renderTrails,
  setupParticleRendering,
  updateCamAndMouse,
  updateScreenSpace,
} from "./renderer";
import {
  MAX_PARTICLE_COUNT,
  VERTICES_PER_PARTICLE,
  PARTICLE_COMPUTE_WORKGROUP_SIZE,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
} from "./constants";
import { renderBoids } from "./meshes/boid";
import { renderTexturedQuads } from "./meshes/quad";
import {
  setupTextRendering,
  getGlyphCount,
  setupWorldTextRendering,
  getWorldGlyphCount,
} from "./meshes/glyphQuad";
import { updateBoids, updateBoidTrails } from "./boid";
import {
  detectCollisionsOBB,
  getUICamPos,
  handleCollisions,
  physicsUpdate,
} from "./util";
import { updateHealthBars } from "./healthbar";
import { cameraUpdate } from "./camera";
import { appendSoA } from "./SoA";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
    <canvas width="${DEFAULT_CANVAS_WIDTH}" height="${DEFAULT_CANVAS_HEIGHT}" id="canvas"></canvas>
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
  await initRenderer(device, presentationFormat);

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

  state.scoreBoardIdx = appendSoA(state.worldTexts, {
    x: 0,
    y: 0,
    scale: 70,
    color: "boid",
    content: "",
    align: TextAlign.Right,
  });

  const uiText = appendSoA(state.worldTexts, {
    x: 0,
    y: 0,
    scale: 70,
    color: "asteroid",
    content: "UI Text",
    align: TextAlign.Center,
  });

  function render() {
    // system logic
    updateGameTime();

    // game logic
    asteroidUpdate();
    updateHealthBars();
    updateBoids();

    state.worldTexts.data.content[state.scoreBoardIdx] = state.score.toString();
    state.worldTexts.data.x[state.scoreBoardIdx] =
      (canvas.width * 1) / state.camera.zoom / 2 - 20;
    state.worldTexts.data.y[state.scoreBoardIdx] =
      (canvas.height * 1) / state.camera.zoom / 2 - 70;

    state.worldTexts.data.x[uiText] = getUICamPos();

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

    // send text data (order must match rendering order)
    setupWorldTextRendering(device);
    setupTextRendering(device);

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
    const wgSpawnCount = Math.ceil(
      totalParticlesToSpawn / PARTICLE_COMPUTE_WORKGROUP_SIZE
    );
    computePass.dispatchWorkgroups(wgSpawnCount, 1, 1);

    computePass.setPipeline(renderer.computePipelines.particleState);
    computePass.setBindGroup(0, particleComputeBG);
    const wgUpdateCount = Math.ceil(
      MAX_PARTICLE_COUNT / PARTICLE_COMPUTE_WORKGROUP_SIZE
    );
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
          renderPass.setVertexBuffer(1, renderer.staticGeoIB);
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
          renderPass.setVertexBuffer(0, renderer.trailVB);
          renderPass.setIndexBuffer(renderer.trailIDXB, "uint16");
          renderPass.drawIndexed(command.indexCount, 1, 0, 0);
          break;
      }
    }

    // Render particles
    renderPass.setPipeline(renderer.renderPipelines.particleRender);
    renderPass.setBindGroup(0, particleRenderBG);
    renderPass.setBindGroup(1, renderer.bindGroups.camera.group);
    renderPass.draw(MAX_PARTICLE_COUNT * VERTICES_PER_PARTICLE);

    // Render world text (uses camera bind group)
    const worldGlyphCount = getWorldGlyphCount();
    if (worldGlyphCount > 0) {
      renderPass.setPipeline(renderer.renderPipelines.text);
      renderPass.setBindGroup(0, renderer.bindGroups.camera.group);
      renderPass.setBindGroup(1, renderer.bindGroups.textAtlas.group);
      renderPass.setVertexBuffer(0, renderer.meshes.glyphQuad.vertexBuffer);
      renderPass.setVertexBuffer(1, renderer.glyphIB);
      renderPass.setIndexBuffer(
        renderer.meshes.glyphQuad.indexBuffer,
        "uint16"
      );
      renderPass.drawIndexed(6, worldGlyphCount, 0, 0, 0);
    }

    // Render UI text (uses screen space bind group)
    const glyphCount = getGlyphCount();
    if (glyphCount > 0) {
      renderPass.setPipeline(renderer.renderPipelines.text);
      renderPass.setBindGroup(0, renderer.bindGroups.screenSpace.group);
      renderPass.setBindGroup(1, renderer.bindGroups.textAtlas.group);
      renderPass.setVertexBuffer(0, renderer.meshes.glyphQuad.vertexBuffer);
      renderPass.setVertexBuffer(1, renderer.glyphIB);
      renderPass.setIndexBuffer(
        renderer.meshes.glyphQuad.indexBuffer,
        "uint16"
      );
      // Start at instance worldGlyphCount since UI text data follows world text in buffer
      renderPass.drawIndexed(6, glyphCount, 0, 0, worldGlyphCount);
    }

    renderPass.end();

    const commandBuffer = encoder.finish();

    renderer.staticGeoInstanceOffset = 0;
    renderer.staticGeoInstanceCount = 0;
    renderer.glyphInstanceOffset = 0;
    renderer.glyphInstanceCount = 0;
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

    // Update screen space matrix for the new canvas size
    updateScreenSpace(device);

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

  window.addEventListener("keydown", (event) => {
    console.log(event.key);
    if (event.key === "Escape") {
      event.preventDefault();

      if (state.activeScreen === Screen.GameWorld) {
        switchToUIScreen();
      } else if (state.activeScreen === Screen.UI) {
        switchToGWScreen();
      }
    }
  });

  configureContext();

  render();
}

await main();

function switchToUIScreen() {
  state.activeScreen = Screen.UI;
  state.camera.target.x = getUICamPos();
  state.time.simTime.multiplier = 0;
}

function switchToGWScreen() {
  state.activeScreen = Screen.GameWorld;
  state.camera.target.x = 0;
  state.time.simTime.multiplier = 1;
}
