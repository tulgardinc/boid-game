import { renderer } from "../renderer";
import { state, TextAlign, TextAnchor } from "../state";

// prettier-ignore
const vertices = new Float32Array([
  // vpos.x, vpos.y (UV is computed in shader from instance uvOffset)
  -0.5, -0.5,  // bottom-left
   0.5, -0.5,  // bottom-right
  -0.5,  0.5,  // top-left
   0.5,  0.5,  // top-right
]);

// prettier-ignore
const indices = new Uint16Array([
  0, 1, 2,
  2, 1, 3,
]);

export function getGlyphQuadVertexBuffer(device: GPUDevice) {
  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(vertexBuffer, 0, vertices.buffer);
  return vertexBuffer;
}

export function getGlyphQuadIndexBuffer(device: GPUDevice): GPUBuffer {
  const indexBuffer = device.createBuffer({
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    size: indices.byteLength,
  });

  device.queue.writeBuffer(indexBuffer, 0, indices.buffer);
  return indexBuffer;
}

// Font atlas constants
const ATLAS_SIZE = 1024;
const GLYPH_WIDTH = 64;
const GLYPH_HEIGHT = 100;
const GLYPHS_PER_ROW = Math.floor(ATLAS_SIZE / GLYPH_WIDTH); // 17
const GLYPH_UV_WIDTH = 64 / 1024;
const GLYPH_UV_HEIGHT = 100 / 1024;
const FIRST_CHAR_CODE = 32; // Space character " "
const GLYPH_SPACING = 0.8; // Multiplier for distance between glyphs (1.0 = no extra spacing)

// Instance stride in floats: color(4) + uvOffset(2) + pos(2) + scale(1) + padding(1) = 10
const INSTANCE_STRIDE = 10;

/**
 * Dynamically calculates the total number of glyphs across all texts.
 */
export function getGlyphCount(): number {
  if (state.texts.len === 0) {
    return 0;
  }

  let totalGlyphs = 0;
  for (let i = 0; i < state.texts.len; i++) {
    totalGlyphs += state.texts.data.content[i].length;
  }

  return totalGlyphs;
}

/**
 * Populates the glyph instance buffer with data for all texts in state.
 * Should be called each frame before rendering.
 */
export function setupTextRendering(device: GPUDevice): void {
  const totalGlyphs = getGlyphCount();

  if (totalGlyphs === 0) {
    return;
  }

  const instanceData = new Float32Array(totalGlyphs * INSTANCE_STRIDE);
  let offset = 0;

  for (let i = 0; i < state.texts.len; i++) {
    const content = state.texts.data.content[i];
    const offsetX = state.texts.data.x[i];
    const offsetY = state.texts.data.y[i];
    const scale = state.texts.data.scale[i];
    const align = state.texts.data.align[i];
    const anchor = state.texts.data.anchor[i];
    const colorKey = state.texts.data.color[i];
    const color = state.colors[colorKey];

    // Calculate anchor position in screen space
    let anchorX = 0;
    let anchorY = 0;

    switch (anchor) {
      case TextAnchor.TopLeft:
        anchorX = 0;
        anchorY = 0;
        break;
      case TextAnchor.TopCenter:
        anchorX = state.canvas.width / 2;
        anchorY = 0;
        break;
      case TextAnchor.TopRight:
        anchorX = state.canvas.width;
        anchorY = 0;
        break;
      case TextAnchor.MiddleLeft:
        anchorX = 0;
        anchorY = state.canvas.height / 2;
        break;
      case TextAnchor.MiddleCenter:
        anchorX = state.canvas.width / 2;
        anchorY = state.canvas.height / 2;
        break;
      case TextAnchor.MiddleRight:
        anchorX = state.canvas.width;
        anchorY = state.canvas.height / 2;
        break;
      case TextAnchor.BottomLeft:
        anchorX = 0;
        anchorY = state.canvas.height;
        break;
      case TextAnchor.BottomCenter:
        anchorX = state.canvas.width / 2;
        anchorY = state.canvas.height;
        break;
      case TextAnchor.BottomRight:
        anchorX = state.canvas.width;
        anchorY = state.canvas.height;
        break;
    }

    // Apply offset to anchor position
    const baseX = anchorX + offsetX;
    const baseY = anchorY + offsetY;

    // Character width in world units (scale * aspect ratio 0.6)
    const charWorldWidth = scale * 0.6;
    const charSpacing = charWorldWidth * GLYPH_SPACING;
    const totalWidth = content.length * charSpacing;

    // Calculate starting X based on alignment
    let startX = baseX;
    if (align === TextAlign.Center) {
      startX = baseX - totalWidth / 2;
    } else if (align === TextAlign.Right) {
      startX = baseX - totalWidth;
    }
    // Left alignment: startX stays as baseX

    for (let j = 0; j < content.length; j++) {
      const charCode = content.charCodeAt(j);
      const glyphIndex = charCode - FIRST_CHAR_CODE;

      // Calculate UV offset for this glyph in the atlas
      const glyphRow = Math.floor(glyphIndex / GLYPHS_PER_ROW);
      const glyphCol = glyphIndex % GLYPHS_PER_ROW;
      const uvOffsetX = glyphCol * GLYPH_UV_WIDTH;
      const uvOffsetY = glyphRow * GLYPH_UV_HEIGHT;

      // Position for this character using alignment-adjusted startX and spacing
      const charX = startX + j * charSpacing;
      const charY = baseY;

      // Instance data layout: color(4) + uvOffset(2) + pos(2) + scale(1) + padding(1)
      instanceData[offset++] = color.r; // color.r
      instanceData[offset++] = color.g; // color.g
      instanceData[offset++] = color.b; // color.b
      instanceData[offset++] = 1.0; // color.a
      instanceData[offset++] = uvOffsetX; // uvOffset.x
      instanceData[offset++] = uvOffsetY; // uvOffset.y
      instanceData[offset++] = charX; // pos.x
      instanceData[offset++] = charY; // pos.y
      instanceData[offset++] = scale; // scale
      instanceData[offset++] = 0; // padding
    }
  }

  device.queue.writeBuffer(renderer.glyphIB, 0, instanceData);
}
