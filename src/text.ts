import { renderer } from "./renderer";
import { state, TextAlign, TextAnchor } from "./state";
import {
  ATLAS_SIZE,
  GLYPH_WIDTH,
  GLYPH_HEIGHT,
  FIRST_CHAR_CODE,
  GLYPH_SPACING,
} from "./constants";
import { ATLAS_INSTANCE_STRIDE } from "./meshes/quad";

const GLYPHS_PER_ROW = Math.floor(ATLAS_SIZE / GLYPH_WIDTH); // 16
const GLYPH_UV_WIDTH = GLYPH_WIDTH / ATLAS_SIZE;
const GLYPH_UV_HEIGHT = GLYPH_HEIGHT / ATLAS_SIZE;

const GLYPH_ASPECT_RATIO = GLYPH_WIDTH / GLYPH_HEIGHT;

/**
 * Dynamically calculates the total number of glyphs across all texts.
 */
export function getGlyphCount(): number {
  if (state.uiTexts.len === 0) {
    return 0;
  }

  let totalGlyphs = 0;
  for (let i = 0; i < state.uiTexts.len; i++) {
    totalGlyphs += state.uiTexts.data.content[i].length;
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

  const instanceData = new Float32Array(totalGlyphs * ATLAS_INSTANCE_STRIDE);
  let offset = 0;

  for (let i = 0; i < state.uiTexts.len; i++) {
    const content = state.uiTexts.data.content[i];
    const offsetX = state.uiTexts.data.x[i];
    const offsetY = state.uiTexts.data.y[i];
    const scale = state.uiTexts.data.scale[i];
    const align = state.uiTexts.data.align[i];
    const anchor = state.uiTexts.data.anchor[i];
    const colorKey = state.uiTexts.data.color[i];
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

    // Character width in world units (scale * aspect ratio)
    const charWorldWidth = scale * GLYPH_ASPECT_RATIO;
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

      // Calculate UV coordinates for this glyph in the atlas
      const glyphRow = Math.floor(glyphIndex / GLYPHS_PER_ROW);
      const glyphCol = glyphIndex % GLYPHS_PER_ROW;

      // UV min is top-left corner, UV max is bottom-right corner (normal orientation for UI text)
      const uvMinX = glyphCol * GLYPH_UV_WIDTH;
      const uvMinY = glyphRow * GLYPH_UV_HEIGHT;
      const uvMaxX = uvMinX + GLYPH_UV_WIDTH;
      const uvMaxY = uvMinY + GLYPH_UV_HEIGHT;

      // Position for this character using alignment-adjusted startX and spacing
      const charX = startX + j * charSpacing;
      const charY = baseY;

      // Instance data layout: color(4) + uvMin(2) + uvMax(2) + pos(2) + scale(1) + padding(1)
      instanceData[offset++] = color.r; // color.r
      instanceData[offset++] = color.g; // color.g
      instanceData[offset++] = color.b; // color.b
      instanceData[offset++] = 1.0; // color.a
      instanceData[offset++] = uvMinX; // uvMin.x
      instanceData[offset++] = uvMinY; // uvMin.y
      instanceData[offset++] = uvMaxX; // uvMax.x
      instanceData[offset++] = uvMaxY; // uvMax.y
      instanceData[offset++] = charX; // pos.x
      instanceData[offset++] = charY; // pos.y
      instanceData[offset++] = scale; // scale
      instanceData[offset++] = 0; // padding
    }
  }

  device.queue.writeBuffer(
    renderer.atlasIB,
    renderer.atlasInstanceOffset,
    instanceData
  );
  renderer.atlasInstanceOffset += instanceData.byteLength;
  renderer.atlasInstanceCount += totalGlyphs;
}

/**
 * Dynamically calculates the total number of glyphs across all world texts.
 */
export function getWorldGlyphCount(): number {
  if (state.worldTexts.len === 0) {
    return 0;
  }

  let totalGlyphs = 0;
  for (let i = 0; i < state.worldTexts.len; i++) {
    totalGlyphs += state.worldTexts.data.content[i].length;
  }

  return totalGlyphs;
}

/**
 * Populates the glyph instance buffer with data for all world texts in state.
 * World texts use world coordinates and are transformed by the camera.
 * Should be called each frame before rendering.
 */
export function setupWorldTextRendering(device: GPUDevice): void {
  const totalGlyphs = getWorldGlyphCount();

  if (totalGlyphs === 0) {
    return;
  }

  const instanceData = new Float32Array(totalGlyphs * ATLAS_INSTANCE_STRIDE);
  let offset = 0;

  for (let i = 0; i < state.worldTexts.len; i++) {
    const content = state.worldTexts.data.content[i];
    const baseX = state.worldTexts.data.x[i];
    const baseY = state.worldTexts.data.y[i];
    const scale = state.worldTexts.data.scale[i];
    const align = state.worldTexts.data.align[i];
    const colorKey = state.worldTexts.data.color[i];
    const color = state.colors[colorKey];

    // Character width in world units (scale * aspect ratio)
    const charWorldWidth = scale * GLYPH_ASPECT_RATIO;
    const charSpacing = charWorldWidth * GLYPH_SPACING;
    const totalWidth = content.length * charSpacing;

    // Calculate starting X based on alignment (no anchor for world text)
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

      // Calculate UV coordinates for this glyph in the atlas
      const glyphRow = Math.floor(glyphIndex / GLYPHS_PER_ROW);
      const glyphCol = glyphIndex % GLYPHS_PER_ROW;

      // For world text, reverse the V coordinate (swap min and max Y)
      // This flips the texture vertically for proper orientation in world space
      const uvMinX = glyphCol * GLYPH_UV_WIDTH;
      const uvMinY = (glyphRow + 1) * GLYPH_UV_HEIGHT; // Bottom of glyph
      const uvMaxX = uvMinX + GLYPH_UV_WIDTH;
      const uvMaxY = glyphRow * GLYPH_UV_HEIGHT; // Top of glyph

      // Position for this character using alignment-adjusted startX and spacing
      const charX = startX + j * charSpacing;
      const charY = baseY;

      // Instance data layout: color(4) + uvMin(2) + uvMax(2) + pos(2) + scale(1) + padding(1)
      instanceData[offset++] = color.r; // color.r
      instanceData[offset++] = color.g; // color.g
      instanceData[offset++] = color.b; // color.b
      instanceData[offset++] = 1.0; // color.a
      instanceData[offset++] = uvMinX; // uvMin.x
      instanceData[offset++] = uvMinY; // uvMin.y (bottom for world text)
      instanceData[offset++] = uvMaxX; // uvMax.x
      instanceData[offset++] = uvMaxY; // uvMax.y (top for world text)
      instanceData[offset++] = charX; // pos.x
      instanceData[offset++] = charY; // pos.y
      instanceData[offset++] = scale; // scale
      instanceData[offset++] = 0; // padding
    }
  }

  device.queue.writeBuffer(
    renderer.atlasIB,
    renderer.atlasInstanceOffset,
    instanceData
  );
  renderer.atlasInstanceOffset += instanceData.byteLength;
  renderer.atlasInstanceCount += totalGlyphs;
}
