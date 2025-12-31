struct Particle {
    age: f32,
    death_age: f32,
    shape_id: u32,
    size_fn_id: u32,
    color_fn_id: u32,
    _pad: u32,
    pos: vec2<f32>,
    vel: vec2<f32>,
    start_scale: vec2<f32>,
    final_scale: vec2<f32>,
    start_color: vec4<f32>,
    final_color: vec4<f32>,
};

fn ease_out_cubic(t: f32) -> f32 {
    let t1 = t - 1.0;
    return t1 * t1 * t1 + 1.0;
}

fn interpolate_scale(start: vec2<f32>, end: vec2<f32>, t: f32, fn_id: u32) -> vec2<f32> {
    if (fn_id == 0u) {
        // Linear
        return mix(start, end, t);
    } else {
        // Ease out
        let eased_t = ease_out_cubic(t);
        return mix(start, end, eased_t);
    }
}

fn interpolate_color(start: vec4<f32>, end: vec4<f32>, t: f32, fn_id: u32) -> vec4<f32> {
    if (fn_id == 0u) {
        // Linear
        return mix(start, end, t);
    } else {
        // Ease out
        let eased_t = ease_out_cubic(t);
        return mix(start, end, eased_t);
    }
}

@group(1) @binding(0)
var<uniform> vpMatrix: mat4x4<f32>;

@group(0) @binding(0)
var <storage, read> next_state: array<Particle>;

@group(0) @binding(1)
var <storage, read> draw_list: array<u32>;


struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) uv: vec2<f32>,
    @location(2) @interpolate(flat) shape_id: u32
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
    let scale = interpolate_scale(particle.start_scale, particle.final_scale, t, particle.size_fn_id);

    let vert_offset = VERTEX_LOOKUP[vert_idx];
    let pos = particle.pos + scale * vert_offset;

    output.position = vpMatrix * vec4(pos, -t, 1.0);
    output.color = interpolate_color(particle.start_color, particle.final_color, t, particle.color_fn_id);
    output.uv = vert_offset;
    output.shape_id = particle.shape_id;
  
    return output;
}

struct FragmentInput {
    @location(0) color: vec4<f32>,
    @location(1) uv: vec2<f32>,
    @location(2) @interpolate(flat) shape_id: u32
};

@fragment fn fs(input: FragmentInput) -> @location(0) vec4f {
    if (input.shape_id == 0u) {
        // Quad - render as is
        return input.color;
    } else {
        // Circle - use distance field
        let dist = length(input.uv);
        if (dist > 0.5) {
            discard;
        }
        return input.color;
    }
}
