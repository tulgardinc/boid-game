import transform2DColorCode from "./shaders/coloredTransform.wgsl?raw";
import trailCode from "./shaders/trail.wgsl?raw";
import particleComputeCode from "./shaders/particleCompute.wgsl?raw";
import particleRenderCode from "./shaders/particleRender.wgsl?raw";
import textCode from "./shaders/text.wgsl?raw";
import fontAtlasUrl from "./font-atlases/DejaVu_Sans_Mono.png";
import { getBoidIndexBufer, getBoidVertexBuffer } from "./meshes/boid";
import { getQuadVertexBuffer, getQuadIndexBuffer } from "./meshes/quad";
import {
  getGlyphQuadVertexBuffer,
  getGlyphQuadIndexBuffer,
} from "./meshes/glyphQuad";
import {
  get2DTransformPipeline,
  getParticleDrawListPipeline,
  getParticleRenderPipeline,
  getParticleSpawnPipeline,
  getParticleStatePipeline,
  getTextPipeline,
  getTrailPipeline,
} from "./pipelines";
import { state } from "./state";
import {
  getCameraBindGroup,
  getCameraBindGroupLayout,
  getParticleComputeBindGroup,
  getParticleComputeBindGroupLayout,
  getParticleRenderBindGroup,
  getParticleRenderBindGroupLayout,
  getScreenSpaceBindGroup,
  getScreenSpaceBindGroupLayout,
  getTextAtlasBindGroup,
  getTextAtlasBindGroupLayout,
} from "./uniforms";
import { mat4, vec4 } from "gl-matrix";
import {
  MAX_TRAIL_LENGTH,
  MAX_PARTICLE_COUNT,
  VERTICES_PER_PARTICLE,
  PARTICLE_COMPUTE_WORKGROUP_SIZE,
  TRAIL_VISUAL_WIDTH,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
} from "./constants";

export type Renderer = {
  staticGeoInstanceCount: number;
  staticGeoInstanceOffset: number;
  glyphInstanceCount: number;
  glyphInstanceOffset: number;
  cameraUB: GPUBuffer;
  screenSpaceUB: GPUBuffer;
  trailVB: GPUBuffer;
  trailIDXB: GPUBuffer;
  staticGeoIB: GPUBuffer;
  particleDrawListSB: GPUBuffer;
  particleDrawCountSB: GPUBuffer;
  particleStateSBA: GPUBuffer;
  particleStateSBB: GPUBuffer;
  particleParametersUB: GPUBuffer;
  particleEmitterSB: GPUBuffer;
  particleRingCursorSB: GPUBuffer;
  particleShouldUseAB: boolean;
  glyphIB: GPUBuffer;
  glyphAtlasT: GPUTexture;
  glyphAtlasTV: GPUTextureView;
  glyphAtlasSMP: GPUSampler;
  shaders: {
    coloredTransform: GPUShaderModule;
    trail: GPUShaderModule;
    particleCompute: GPUShaderModule;
    particleRender: GPUShaderModule;
    text: GPUShaderModule;
  };
  meshes: {
    quad: Mesh;
    boid: Mesh;
    glyphQuad: Mesh;
  };
  renderPipelines: {
    worldTF2D: GPURenderPipeline;
    trail: GPURenderPipeline;
    particleRender: GPURenderPipeline;
    text: GPURenderPipeline;
  };
  computePipelines: {
    particleSpawn: GPUComputePipeline;
    particleState: GPUComputePipeline;
    particleDrawList: GPUComputePipeline;
  };
  bindGroups: {
    camera: {
      layout: GPUBindGroupLayout;
      group: GPUBindGroup;
    };
    screenSpace: {
      layout: GPUBindGroupLayout;
      group: GPUBindGroup;
    };
    particleComputeAB: {
      layout: GPUBindGroupLayout;
      group: GPUBindGroup;
    };
    particleComputeBA: {
      layout: GPUBindGroupLayout;
      group: GPUBindGroup;
    };
    particleRenderA: {
      layout: GPUBindGroupLayout;
      group: GPUBindGroup;
    };
    particleRenderB: {
      layout: GPUBindGroupLayout;
      group: GPUBindGroup;
    };
    textAtlas: {
      layout: GPUBindGroupLayout;
      group: GPUBindGroup;
    };
  };
  renderQueue: (RenderCommandMesh | RenderCommandVFX)[];
  frameNo: number;
};

export let renderer!: Renderer;

export type VertexBufferLayouts = {
  [K in keyof typeof vertexBufferLayouts]: GPUVertexBufferLayout;
};
const vertexBufferLayouts: { [k: string]: GPUVertexBufferLayout } = {
  pos2D: {
    arrayStride: 2 * 4,
    stepMode: "vertex",
    attributes: [
      {
        shaderLocation: 0,
        offset: 0,
        format: "float32x2",
      },
    ],
  },
  pos2DColor: {
    arrayStride: 6 * 4,
    stepMode: "vertex",
    attributes: [
      {
        shaderLocation: 0,
        offset: 0,
        format: "float32x2",
      },
      {
        shaderLocation: 1,
        offset: 2 * 4,
        format: "float32x4",
      },
    ],
  },
  textGlyph: {
    arrayStride: 2 * 4,
    stepMode: "vertex",
    attributes: [
      {
        shaderLocation: 5, // vpos
        offset: 0,
        format: "float32x2",
      },
    ],
  },
};

export type InstanceBufferLayouts = {
  [K in keyof typeof instanceBufferLayouts]: GPUVertexBufferLayout;
};
const instanceBufferLayouts: { [k: string]: GPUVertexBufferLayout } = {
  transform2D: {
    arrayStride: 8 * 4,
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
        format: "float32x2",
      },
      {
        shaderLocation: 3,
        offset: 4 * 4,
        format: "float32",
      },
      {
        shaderLocation: 4,
        offset: 5 * 4,
        format: "float32x3",
      },
    ],
  },
  textGlyphInstance: {
    arrayStride: 12 * 4, // 48 bytes: color(4) + uvMin(2) + uvMax(2) + pos(2) + scale(1) + padding(1)
    stepMode: "instance",
    attributes: [
      {
        shaderLocation: 0, // color
        offset: 0,
        format: "float32x4",
      },
      {
        shaderLocation: 1, // uvMin
        offset: 4 * 4,
        format: "float32x2",
      },
      {
        shaderLocation: 2, // uvMax
        offset: 6 * 4,
        format: "float32x2",
      },
      {
        shaderLocation: 3, // pos
        offset: 8 * 4,
        format: "float32x2",
      },
      {
        shaderLocation: 4, // scale
        offset: 10 * 4,
        format: "float32",
      },
    ],
  },
};

function initInstanceBuffer(device: GPUDevice) {
  return device.createBuffer({
    size: 8 * 4 * 1000,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
}

function initTrailVertexBuffer(device: GPUDevice) {
  // float32
  return device.createBuffer({
    size: 6 * 4 * 2 * MAX_TRAIL_LENGTH * 300,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
}

function initTrailIndexBuffer(device: GPUDevice) {
  // uint16
  return device.createBuffer({
    size: 2 * 2 * MAX_TRAIL_LENGTH * 300,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
}

function initParticleDrawListBuffer(device: GPUDevice) {
  // uint32
  const data = new Uint32Array(MAX_PARTICLE_COUNT);
  data.fill(0);
  const buffer = device.createBuffer({
    size: 4 * MAX_PARTICLE_COUNT,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
}

function initPartcileStateBuffer(device: GPUDevice) {
  // float32 / uint32
  // age 1
  // deathAge 1
  // shape_id 1 (u32)
  // size_fn_id 1 (u32)
  // color_fn_id 1 (u32)
  // _pad 1 (u32)
  // pos 2
  // vel 2
  // scale 2
  // finalScale 2
  // color 4
  // finalColor 4
  const data = new Float32Array(22 * MAX_PARTICLE_COUNT);
  data.fill(0);
  const buffer = device.createBuffer({
    size: 4 * 22 * MAX_PARTICLE_COUNT,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
}

function initParticleDrawCountBuffer(device: GPUDevice) {
  // uint32
  const data = new Uint32Array(1);
  data.fill(0);
  const buffer = device.createBuffer({
    size: 4,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
}

function initParticleParametersBuffer(device: GPUDevice) {
  // particleCount: uint32
  // deltaTime: float32
  const data = new Float32Array(5);
  data.fill(0);
  const buffer = device.createBuffer({
    size: 5 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
}

function initParticleEmitterBuffer(device: GPUDevice) {
  // uint32
  // base 1
  // count 1
  // float32
  // lifetime 1
  // r 1
  // spread 1
  // speed_min 1
  // speed_max 1
  // uint32
  // shape_id 1
  // size_fn_id 1
  // color_fn_id 1
  // vec2
  // pos_min 2
  // pos_max 2
  // scale_init 2
  // scale_final 2
  // _pad 2 (vec2<u32>)
  // vec4
  // color_init 4
  // color_final 4
  // Total: 28 * 4 = 112 bytes per emitter
  return device.createBuffer({
    size: 28 * 4 * 500,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
  });
}

function initParticleRingCursorBuffer(device: GPUDevice) {
  // index: uint32
  const data = new Uint32Array(1);
  data.fill(0);
  const buffer = device.createBuffer({
    size: 4,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
}

function initCameraBuffer(device: GPUDevice) {
  const vpMatrix = mat4.create();
  mat4.orthoZO(
    vpMatrix,
    -DEFAULT_CANVAS_WIDTH / 2,
    DEFAULT_CANVAS_WIDTH / 2,
    -DEFAULT_CANVAS_HEIGHT / 2,
    DEFAULT_CANVAS_HEIGHT / 2,
    -1,
    1
  );

  const buffer = device.createBuffer({
    label: "camera buffer",
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    size: (vpMatrix as Float32Array).byteLength,
  });

  device.queue.writeBuffer(buffer, 0, (vpMatrix as Float32Array).buffer);

  return buffer;
}

function initScreenSpaceBuffer(device: GPUDevice) {
  // Screen space: origin at top-left, +X right, +Y down
  // For default canvas size, this maps [0,width]x[0,height] to NDC [-1,1]x[1,-1]
  const vpMatrix = mat4.create();
  mat4.orthoZO(
    vpMatrix,
    0,
    DEFAULT_CANVAS_WIDTH,
    DEFAULT_CANVAS_HEIGHT,
    0,
    -1,
    1
  );

  const buffer = device.createBuffer({
    label: "screen space buffer",
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    size: (vpMatrix as Float32Array).byteLength,
  });

  device.queue.writeBuffer(buffer, 0, (vpMatrix as Float32Array).buffer);

  return buffer;
}

function initGlyphInstanceBuffer(device: GPUDevice) {
  // Per instance (12 floats = 48 bytes):
  // color: vec4<f32> (4 floats)
  // uvMin: vec2<f32> (2 floats)
  // uvMax: vec2<f32> (2 floats)
  // pos: vec2<f32> (2 floats)
  // scale: f32 (1 float)
  // padding: f32 (1 float)
  return device.createBuffer({
    size: 12 * 4 * 1000,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
}

async function initGlyphAtlasTexture(device: GPUDevice) {
  const response = await fetch(fontAtlasUrl);
  const blob = await response.blob();
  const imageBitmap = await createImageBitmap(blob);

  const texture = device.createTexture({
    size: [imageBitmap.width, imageBitmap.height, 1],
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  device.queue.copyExternalImageToTexture(
    { source: imageBitmap },
    { texture: texture },
    [imageBitmap.width, imageBitmap.height]
  );

  const textureView = texture.createView();

  return { texture, textureView };
}

function initGlyphAtlasSampler(device: GPUDevice) {
  return device.createSampler({
    magFilter: "nearest",
    minFilter: "nearest",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
    addressModeW: "clamp-to-edge",
  });
}

export type Mesh = {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  vertexBufferLayoutId: keyof typeof vertexBufferLayouts;
  instanceBufferLayoutId: keyof typeof instanceBufferLayouts;
};

export async function initRenderer(
  device: GPUDevice,
  format: GPUTextureFormat
) {
  const camLayout = getCameraBindGroupLayout(device);
  const cameraUB = initCameraBuffer(device);
  const camGroup = getCameraBindGroup(device, camLayout, cameraUB);

  const screenSpaceLayout = getScreenSpaceBindGroupLayout(device);
  const screenSpaceUB = initScreenSpaceBuffer(device);
  const screenSpaceGroup = getScreenSpaceBindGroup(
    device,
    screenSpaceLayout,
    screenSpaceUB
  );

  const particleDrawListSB = initParticleDrawListBuffer(device);
  const particleDrawCountSB = initParticleDrawCountBuffer(device);
  const particleStateSBA = initPartcileStateBuffer(device);
  const particleStateSBB = initPartcileStateBuffer(device);
  const particleParametersUB = initParticleParametersBuffer(device);
  const particleEmitterSB = initParticleEmitterBuffer(device);
  const particleRingCursorSB = initParticleRingCursorBuffer(device);

  const particleComputeLayout = getParticleComputeBindGroupLayout(device);
  const particleComputeGAB = getParticleComputeBindGroup(
    device,
    particleComputeLayout,
    particleDrawListSB,
    particleDrawCountSB,
    particleStateSBA,
    particleStateSBB,
    particleParametersUB,
    particleEmitterSB,
    particleRingCursorSB
  );
  const particleComputeGBA = getParticleComputeBindGroup(
    device,
    particleComputeLayout,
    particleDrawListSB,
    particleDrawCountSB,
    particleStateSBB,
    particleStateSBA,
    particleParametersUB,
    particleEmitterSB,
    particleRingCursorSB
  );

  const particleRenderLayout = getParticleRenderBindGroupLayout(device);
  const particleRenderBGA = getParticleRenderBindGroup(
    device,
    particleRenderLayout,
    particleDrawListSB,
    particleStateSBA
  );
  const particleRenderBGB = getParticleRenderBindGroup(
    device,
    particleRenderLayout,
    particleDrawListSB,
    particleStateSBB
  );

  const glyphIB = initGlyphInstanceBuffer(device);
  const { texture: glyphAtlasT, textureView: glyphAtlasTV } =
    await initGlyphAtlasTexture(device);
  const glyphAtlasSMP = initGlyphAtlasSampler(device);

  const textAtlasLayout = getTextAtlasBindGroupLayout(device);
  const textAtlasGroup = getTextAtlasBindGroup(
    device,
    textAtlasLayout,
    glyphAtlasTV,
    glyphAtlasSMP
  );

  const bindGroups: Renderer["bindGroups"] = {
    camera: {
      layout: camLayout,
      group: camGroup,
    },
    screenSpace: {
      layout: screenSpaceLayout,
      group: screenSpaceGroup,
    },
    particleComputeAB: {
      layout: particleComputeLayout,
      group: particleComputeGAB,
    },
    particleComputeBA: {
      layout: particleComputeLayout,
      group: particleComputeGBA,
    },
    particleRenderA: {
      layout: particleRenderLayout,
      group: particleRenderBGA,
    },
    particleRenderB: {
      layout: particleRenderLayout,
      group: particleRenderBGB,
    },
    textAtlas: {
      layout: textAtlasLayout,
      group: textAtlasGroup,
    },
  };

  const shaders: Renderer["shaders"] = {
    coloredTransform: getShaderPos2DRed(device),
    trail: getShaderTrail(device),
    particleCompute: getShaderParticleCompute(device),
    particleRender: getShaderParticleRender(device),
    text: getShaderText(device),
  };

  renderer = {
    staticGeoInstanceCount: 0,
    staticGeoInstanceOffset: 0,
    glyphInstanceCount: 0,
    glyphInstanceOffset: 0,
    cameraUB,
    screenSpaceUB,
    trailVB: initTrailVertexBuffer(device),
    trailIDXB: initTrailIndexBuffer(device),
    staticGeoIB: initInstanceBuffer(device),
    particleDrawListSB,
    particleDrawCountSB,
    particleStateSBA,
    particleStateSBB,
    particleParametersUB,
    particleEmitterSB,
    particleRingCursorSB,
    particleShouldUseAB: false,
    glyphIB,
    glyphAtlasT,
    glyphAtlasTV,
    glyphAtlasSMP,
    meshes: {
      quad: {
        vertexBuffer: getQuadVertexBuffer(device),
        indexBuffer: getQuadIndexBuffer(device),
        vertexBufferLayoutId: "pos2D",
        instanceBufferLayoutId: "transform2D",
      },
      boid: {
        vertexBuffer: getBoidVertexBuffer(device),
        indexBuffer: getBoidIndexBufer(device),
        vertexBufferLayoutId: "pos2D",
        instanceBufferLayoutId: "transform2D",
      },
      glyphQuad: {
        vertexBuffer: getGlyphQuadVertexBuffer(device),
        indexBuffer: getGlyphQuadIndexBuffer(device),
        vertexBufferLayoutId: "textGlyph",
        instanceBufferLayoutId: "textGlyphInstance",
      },
    },
    renderPipelines: {
      worldTF2D: get2DTransformPipeline(
        device,
        format,
        bindGroups,
        shaders,
        vertexBufferLayouts,
        instanceBufferLayouts
      ),
      trail: getTrailPipeline(
        device,
        format,
        bindGroups,
        shaders,
        vertexBufferLayouts
      ),
      particleRender: getParticleRenderPipeline(
        device,
        format,
        bindGroups,
        shaders
      ),
      text: getTextPipeline(
        device,
        format,
        bindGroups,
        shaders,
        vertexBufferLayouts,
        instanceBufferLayouts
      ),
    },
    computePipelines: {
      particleSpawn: getParticleSpawnPipeline(device, bindGroups, shaders),
      particleState: getParticleStatePipeline(device, bindGroups, shaders),
      particleDrawList: getParticleDrawListPipeline(
        device,
        bindGroups,
        shaders
      ),
    },
    bindGroups,
    shaders,
    renderQueue: [],
    frameNo: 0,
  };
}

export type RenderCommandMesh = {
  kind: "mesh";
  pipeline: keyof Renderer["renderPipelines"];
  mesh: keyof Renderer["meshes"];
  bindGroup: keyof Renderer["bindGroups"];
  instanceCount: number;
  firstInstance: number;
  indexCount: number;
};

export type RenderCommandVFX = {
  kind: "vfx";
  pipeline: keyof Renderer["renderPipelines"];
  bindGroup: keyof Renderer["bindGroups"];
  indexCount: number;
  firstIndex: number;
};

export function updateTransformColorGPUData(
  device: GPUDevice,
  entityIds: number[]
) {
  const result = new Float32Array(entityIds.length * 8);
  const d = state.baseEntities.data;

  let i = 0;
  for (const eid of entityIds) {
    result[i++] = d.x[eid];
    result[i++] = d.y[eid];
    result[i++] = d.scaleX[eid];
    result[i++] = d.scaleY[eid];
    result[i++] = (d.r[eid] * Math.PI) / 180;
    const col = d.color[eid];
    result[i++] = col.r;
    result[i++] = col.g;
    result[i++] = col.b;
  }

  device.queue.writeBuffer(
    renderer.staticGeoIB,
    renderer.staticGeoInstanceOffset,
    result.buffer,
    0,
    result.byteLength
  );
  renderer.staticGeoInstanceOffset += result.byteLength;

  const firstInstance = renderer.staticGeoInstanceCount;
  renderer.staticGeoInstanceCount += entityIds.length;

  return firstInstance;
}

function getShaderPos2DRed(device: GPUDevice) {
  return device.createShaderModule({
    label: "draw colored objects in 2D",
    code: transform2DColorCode,
  });
}

function getShaderTrail(device: GPUDevice) {
  return device.createShaderModule({
    label: "draw colored objects in 2D",
    code: trailCode,
  });
}

function getShaderParticleCompute(device: GPUDevice) {
  return device.createShaderModule({
    label: "update particles",
    code: particleComputeCode,
  });
}

function getShaderParticleRender(device: GPUDevice) {
  return device.createShaderModule({
    label: "draw particles",
    code: particleRenderCode,
  });
}

function getShaderText(device: GPUDevice) {
  return device.createShaderModule({
    label: "draw text",
    code: textCode,
  });
}

export function emitTrailVertices(device: GPUDevice) {
  const vertexCount = state.trails.data.length.reduce(
    (prev, cur) => prev + cur,
    0
  );
  if (vertexCount == 0) return;

  const vertices = new Float32Array(vertexCount * 6 * 2);
  const indices = new Uint16Array(
    Math.ceil((vertexCount * 2 + state.trails.len - 1) / 2) * 2
  );
  let vertexIndex = 0;
  let indicesIndex = 0;
  let currentVertex = 0;

  for (let i = 0; i < state.trails.len; i++) {
    const trailLen = state.trails.data.length[i];
    const head = state.trails.data.head[i];

    for (let j = head; j < head + trailLen; j++) {
      const tpIndex = i * MAX_TRAIL_LENGTH + (j % MAX_TRAIL_LENGTH);
      const px = state.trailPoints.data.x[tpIndex];
      const py = state.trailPoints.data.y[tpIndex];
      let pnx: number;
      let pny: number;

      if (j < head + trailLen - 1) {
        const tpIndexNext = i * MAX_TRAIL_LENGTH + ((j + 1) % MAX_TRAIL_LENGTH);
        pnx = state.trailPoints.data.x[tpIndexNext];
        pny = state.trailPoints.data.y[tpIndexNext];
      } else {
        const ownerId = state.trails.data.ownerId[i];
        const baseIdx = state.idToBaseLookup[ownerId];
        pnx = state.baseEntities.data.x[baseIdx];
        pny = state.baseEntities.data.y[baseIdx];
      }

      const dirX = pnx - px;
      const dirY = pny - py;
      const len = Math.hypot(dirX, dirY);
      const dirNormX = dirX / len;
      const dirNormY = dirY / len;

      const leftX = -dirNormY;
      const leftY = dirNormX;
      const rightX = dirNormY;
      const rightY = -dirNormX;

      const pLeftX = px + (leftX * TRAIL_VISUAL_WIDTH) / 2;
      const pLeftY = py + (leftY * TRAIL_VISUAL_WIDTH) / 2;
      const pRightX = px + (rightX * TRAIL_VISUAL_WIDTH) / 2;
      const pRightY = py + (rightY * TRAIL_VISUAL_WIDTH) / 2;

      vertices[vertexIndex++] = pLeftX; // x
      vertices[vertexIndex++] = pLeftY; // y
      vertices[vertexIndex++] = 1; // r
      vertices[vertexIndex++] = 1; // g
      vertices[vertexIndex++] = 1; // b
      vertices[vertexIndex++] = ((j - head) / trailLen) * 0.8; // a
      indices[indicesIndex++] = currentVertex;

      vertices[vertexIndex++] = pRightX;
      vertices[vertexIndex++] = pRightY;
      vertices[vertexIndex++] = 1;
      vertices[vertexIndex++] = 1;
      vertices[vertexIndex++] = 1;
      vertices[vertexIndex++] = ((j - head + 1) / trailLen) * 0.8;
      indices[indicesIndex++] = currentVertex + 1;

      currentVertex += 2;
    }

    if (i < state.trails.len - 1) {
      indices[indicesIndex++] = 0xffff; // Restart index
    }
  }

  device.queue.writeBuffer(renderer.trailVB, 0, vertices);
  device.queue.writeBuffer(renderer.trailIDXB, 0, indices);
}

export function renderTrails() {
  const indexCount =
    state.trails.data.length.reduce((prev, cur) => prev + cur, 0) * 2 +
    state.trails.len -
    1;
  if (indexCount <= 0) return;
  renderer.renderQueue.push({
    pipeline: "trail",
    bindGroup: "camera",
    kind: "vfx",
    firstIndex: 0,
    indexCount,
  });
}

export function setupParticleRendering(device: GPUDevice) {
  const zeroBuff = new Uint32Array(1);
  zeroBuff[0] = 0;
  device.queue.writeBuffer(renderer.particleDrawCountSB, 0, zeroBuff);

  const EMITTER_STRIDE = 112;
  const emitterData = new ArrayBuffer(EMITTER_STRIDE * 500);
  const dv = new DataView(emitterData);

  const pd = state.particleEmitters.data;
  let base = 0;

  for (let i = 0; i < state.particleEmitters.len; i++) {
    const offset = i * EMITTER_STRIDE;
    dv.setUint32(offset, base, true);
    dv.setUint32(offset + 4, pd.count[i], true);
    dv.setFloat32(offset + 8, pd.lifeTime[i], true);
    dv.setFloat32(offset + 12, (pd.r[i] * Math.PI) / 180, true);
    dv.setFloat32(offset + 16, (pd.spread[i] * Math.PI) / 180, true);
    dv.setFloat32(offset + 20, pd.speedMin[i], true);
    dv.setFloat32(offset + 24, pd.speedMax[i], true);
    dv.setUint32(offset + 28, pd.shapeId[i], true);
    dv.setUint32(offset + 32, pd.sizeFnId[i], true);
    dv.setUint32(offset + 36, pd.colorFnId[i], true);
    dv.setFloat32(offset + 40, pd.posMinX[i], true);
    dv.setFloat32(offset + 44, pd.posMinY[i], true);
    dv.setFloat32(offset + 48, pd.posMaxX[i], true);
    dv.setFloat32(offset + 52, pd.posMaxY[i], true);
    dv.setFloat32(offset + 56, pd.scaleInitX[i], true);
    dv.setFloat32(offset + 60, pd.scaleInitY[i], true);
    dv.setFloat32(offset + 64, pd.scaleFinalX[i], true);
    dv.setFloat32(offset + 68, pd.scaleFinalY[i], true);
    // Padding: offset 72-76 (_pad vec2<u32>) - skip to 80
    dv.setFloat32(offset + 80, pd.colorInitR[i], true);
    dv.setFloat32(offset + 84, pd.colorInitG[i], true);
    dv.setFloat32(offset + 88, pd.colorInitB[i], true);
    dv.setFloat32(offset + 92, pd.colorInitA[i], true);
    dv.setFloat32(offset + 96, pd.colorFinalR[i], true);
    dv.setFloat32(offset + 100, pd.colorFinalG[i], true);
    dv.setFloat32(offset + 104, pd.colorFinalB[i], true);
    dv.setFloat32(offset + 108, pd.colorFinalA[i], true);

    base += pd.count[i];
  }

  device.queue.writeBuffer(renderer.particleEmitterSB, 0, emitterData);

  const paramsBuffer = new ArrayBuffer(20);
  const paramDv = new DataView(paramsBuffer);

  const newParticleCount = state.particleEmitters.data.count.reduce(
    (sum, v) => sum + v,
    0
  );

  paramDv.setUint32(0, MAX_PARTICLE_COUNT, true);
  paramDv.setUint32(4, state.particleEmitters.len, true);
  paramDv.setUint32(8, newParticleCount, true);
  paramDv.setUint32(12, Math.floor(state.time.simTime.now % 10000), true);
  paramDv.setFloat32(16, state.time.simTime.delta, true);

  device.queue.writeBuffer(renderer.particleParametersUB, 0, paramsBuffer);
}

export function updateScreenSpace(device: GPUDevice) {
  // Screen space: origin at top-left, +X right, +Y down
  // Maps [0, canvas.width]x[0, canvas.height] to NDC [-1,1]x[1,-1]
  const vpMatrix = mat4.create();
  mat4.orthoZO(vpMatrix, 0, state.canvas.width, state.canvas.height, 0, -1, 1);

  device.queue.writeBuffer(
    renderer.screenSpaceUB,
    0,
    (vpMatrix as Float32Array).buffer
  );
}

// Mouse pos is from last frame when doing gameplay
// might matter
export function updateCamAndMouse(device: GPUDevice) {
  const vpMatrix = mat4.create();
  const vMatrix = mat4.create();

  const halfWidth = state.canvas.width / 2;
  const halfHeight = state.canvas.height / 2;

  const rads = (state.camera.r * Math.PI) / 180;

  mat4.scale(vMatrix, vMatrix, [state.camera.zoom, state.camera.zoom, 1]);
  mat4.rotate(vMatrix, vMatrix, rads, [0, 0, 1]);
  mat4.translate(vMatrix, vMatrix, [-state.camera.x, -state.camera.y, 0]);

  mat4.orthoZO(vpMatrix, -halfWidth, halfWidth, -halfHeight, halfHeight, -1, 1);
  mat4.multiply(vpMatrix, vpMatrix, vMatrix);

  device.queue.writeBuffer(
    renderer.cameraUB,
    0,
    (vpMatrix as Float32Array).buffer
  );

  const mouseVec = vec4.create();
  vec4.set(
    mouseVec,
    state.mousePos.raw.x - halfWidth,
    halfHeight - state.mousePos.raw.y,
    0,
    1
  );
  const invertMat = mat4.create();
  mat4.invert(invertMat, vMatrix);
  vec4.transformMat4(mouseVec, mouseVec, invertMat);

  state.mousePos.world.x = mouseVec[0];
  state.mousePos.world.y = mouseVec[1];
}
