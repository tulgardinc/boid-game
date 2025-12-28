struct Particle {
    age: f32,
    death_age: f32,
    pos: vec2<f32>,
    vel: vec2<f32>,
    start_scale: vec2<f32>,
    final_scale: vec2<f32>,
    start_color: vec4<f32>,
    final_color: vec4<f32>,
};

@group(1) @binding(0)
var<uniform> vpMatrix: mat4x4<f32>;

@group(0) @binding(0)
var <storage, read> next_state: array<Particle>;

@group(0) @binding(1)
var <storage, read> draw_list: array<u32>;


struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>
};

const VERTEX_LOOKUP: array<vec2<f32>, 6> = array(
    vec2<f32>(-0.5,0.5),
    vec2<f32>(-0.5,-0.5),
    vec2<f32>(0.5,-0.5),
    vec2<f32>(0.5,-0.5),
    vec2<f32>(0.5,0.5),
    vec2<f32>(-0.5,0.5)
);

@vertex fn vs(
    @builtin(vertex_index) vid: u32
) -> VertexOutput {
    var output: VertexOutput;

    let alive_idx = vid / 6u;
    let vert_idx = vid % 6u;
    let pid = draw_list[alive_idx];
    let particle = next_state[pid];

    
    let t = clamp(particle.age / particle.death_age, 0, 1.0);
    let scale = mix(particle.start_scale, particle.final_scale, t);

    let vert_offet = VERTEX_LOOKUP[vert_idx];
    let pos = particle.pos + scale * vert_offet;


    output.position = vpMatrix * vec4(pos, -t, 1.0);
    output.color = mix(particle.start_color, particle.final_color, t);
  
    return output;
}

struct FragmentInput {
    @location(0) color: vec4<f32>
};

@fragment fn fs(input: FragmentInput) -> @location(0) vec4f {
    return input.color;
}


