@group(0) @binding(0)
var<uniform> vpMatrix: mat4x4<f32>;

@vertex fn vs(
@location(0) vpos: vec2<f32>,
@location(1) pos: vec2<f32>,
@location(2) scale: f32,
@location(3) rot: f32
) -> @builtin(position) vec4f {

let rotCW = mat2x2<f32>(
  cos(rot), sin(rot),
  -sin(rot), cos(rot)
);
let world = rotCW * (vpos * scale) + pos;
return vpMatrix * vec4f(world, 0.0f, 1.0f);
}

@fragment fn fs() -> @location(0) vec4f {
return vec4f(1.0, 0.0, 0.0, 1.0);
}
