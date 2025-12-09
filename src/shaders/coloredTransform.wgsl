@group(0) @binding(0)
var<uniform> vpMatrix: mat4x4<f32>;

struct VertexInput {
  @location(0) vpos: vec2<f32>,
  @location(1) pos: vec2<f32>,
  @location(2) scale: vec2<f32>,
  @location(3) rot: f32,
  @location(4) color: vec3<f32>
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec3<f32>
};

@vertex fn vs(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  let rotCW = mat2x2<f32>(
    cos(input.rot), sin(input.rot),
    -sin(input.rot), cos(input.rot)
  );
  let world = rotCW * (input.vpos * input.scale) + input.pos;
  output.position = vpMatrix * vec4f(world, 0.0f, 1.0f);
  output.color = input.color;
  
  return output;
}

struct FragmentInput {
  @location(0) color: vec3<f32>
};

@fragment fn fs(input: FragmentInput) -> @location(0) vec4f {
  return vec4f(input.color, 1.0);
}
