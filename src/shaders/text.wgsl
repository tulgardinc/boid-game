
@group(0) @binding(0)
var<uniform> vpMatrix: mat4x4<f32>;

@group(1) @binding(0)
var atlasTex: texture_2d<f32>;

@group(1) @binding(1)
var atlasSmp: sampler;

// Glyph size in UV coordinates (60px/1024px, 100px/1024px)
const GLYPH_UV_SIZE: vec2<f32> = vec2<f32>(60.0/1024.0, 100.0/1024.0);
// const GLYPH_UV_SIZE: vec2<f32> = vec2<f32>(1,1);

struct VertexInput {
  // Instance data
  @location(0) color: vec4<f32>,
  @location(1) uvOffset: vec2<f32>,
  @location(3) pos: vec2<f32>,
  @location(4) scale: f32,
  // Vertex data
  @location(2) vpos: vec2<f32>,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
  @location(1) uv: vec2<f32>
};

@vertex fn vs(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  // Scale vpos by aspect ratio (60/100 = 0.6 width relative to height)
  let aspectVpos = vec2<f32>(input.vpos.x * 0.6, input.vpos.y);
  let world = (aspectVpos * input.scale) + input.pos;
  output.position = vpMatrix * vec4f(world, 0.0f, 1.0f);
  output.color = input.color;
  
  // Calculate UV: vpos goes from -0.5 to 0.5, convert to 0-1 range and scale by glyph size
  let localUV = vec2<f32>(input.vpos.x + 0.5, input.vpos.y + 0.5); // Flip Y
  output.uv = input.uvOffset + localUV * GLYPH_UV_SIZE;
  
  return output;
}

struct FragmentInput {
  @location(0) color: vec4<f32>,
  @location(1) uv: vec2<f32>
};

@fragment fn fs(input: FragmentInput) -> @location(0) vec4f {
let s = textureSample(atlasTex, atlasSmp, input.uv);
return vec4f(input.color.rgb, s.r);
}