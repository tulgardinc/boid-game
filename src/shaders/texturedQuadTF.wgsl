@group(0) @binding(0)
var<uniform> vpMatrix: mat4x4<f32>;

@group(1) @binding(0)
var tex: texture_2d<f32>;

@group(1) @binding(1)
var smp: sampler;

struct VertexInput {
    // vertex
    @location(0) vpos: vec2<f32>,
    // instance
    @location(1) pos: vec2<f32>,
    @location(2) scale: vec2<f32>,
    @location(3) rot: f32,
    @location(4) color: vec3<f32>
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec3<f32>,
    @location(1) uv: vec2<f32>
};

@vertex fn vs(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    let rotCCW = mat2x2<f32>(
        cos(input.rot),   sin(input.rot),
        -sin(input.rot),  cos(input.rot)
    );
    let world = rotCCW * (input.vpos * input.scale) + input.pos;
    output.position = vpMatrix * vec4f(world, 0.0f, 1.0f);
    output.color = input.color;
    output.uv = input.vpos + 0.5;
    output.uv.y = 1 - output.uv.y;
    
    return output;
}

struct FragmentInput {
    @location(0) color: vec3<f32>,
    @location(1) uv: vec2<f32>
};

@fragment fn fs(input: FragmentInput) -> @location(0) vec4f {
    let s = textureSample(tex, smp, input.uv);
    return vec4f(s.rgb * input.color.rgb, s.a);
}

