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

struct Emitter {
    base: u32,
    count: u32,
    life_time: f32,
    _pad: f32,
    pos_min: vec2<f32>,
    pos_max: vec2<f32>,
    vel_min: vec2<f32>,
    vel_max: vec2<f32>,
    scale_init: vec2<f32>,
    scale_final: vec2<f32>,
    color_init: vec4<f32>,
    color_final: vec4<f32>,
};

struct ParticleParams {
    max_particle_count: u32, 
    emitter_count: u32, 
    spawn_count: u32,
    seed: u32,
    delta_time: f32,
};

struct DrawCount {
    count: atomic<u32>
};

struct EmitterCursor {
    cursor: atomic<u32>
};

@group(0) @binding(0)
var <storage, read_write> cur_state: array<Particle>;

@group(0) @binding(1)
var <storage, read_write> next_state: array<Particle>;

@group(0) @binding(2)
var <storage, read_write> draw_list: array<u32>;

@group(0) @binding(3)
var <storage, read_write> draw_count: DrawCount;

@group(0) @binding(4)
var<uniform> params: ParticleParams;

@group(0) @binding(5)
var<storage, read_write> emitters: array<Emitter>;

@group(0) @binding(6)
var<storage, read_write> emitter_cursor: EmitterCursor;

fn hash_u32(x: u32) -> u32 {
    var h = x;
    h ^= h >> 16u;
    h *= 0x7feb352du;
    h ^= h >> 15u;
    h *= 0x846ca68bu;
    h ^= h >> 16u;
    return h;
}

fn rand(seed: u32) -> f32 {
    return f32(hash_u32(seed)) / f32(0xffffffffu);
}

@compute @workgroup_size(256) fn spawn(
    @builtin(global_invocation_id) gid: vec3<u32>
) {
    let i = gid.x;
    if (i >= params.spawn_count) {
        return;
    }

    var emitter_index = 0u;
    var found = false;
    for (var em_idx  = 0u; em_idx < params.emitter_count; em_idx++) {
        if (i >= emitters[em_idx].base && i < emitters[em_idx].base + emitters[em_idx].count) {
            emitter_index = em_idx;
            found = true;
            break;
        }
    }

    if (!found) {
        return;
    }

    let emitter = emitters[emitter_index];
    var particle: Particle;

    particle.age = 0;
    particle.death_age = emitter.life_time;
    particle.start_color = emitter.color_init;
    particle.final_color = emitter.color_final;
    particle.start_scale = emitter.scale_init;
    particle.final_scale = emitter.scale_final;

    let seed_input = params.seed ^ (i * 0x9e3779b9u) ^ (emitter_index * 0x85ebca6bu);

    particle.pos.x = emitter.pos_min.x + (emitter.pos_max.x - emitter.pos_min.x) * rand(seed_input);
    particle.pos.y = emitter.pos_min.y + (emitter.pos_max.y - emitter.pos_min.y) * rand(seed_input + 1u);
    particle.vel.x = emitter.vel_min.x + (emitter.vel_max.x - emitter.vel_min.x) * rand(seed_input + 2u);
    particle.vel.y = emitter.vel_min.y + (emitter.vel_max.y - emitter.vel_min.y) * rand(seed_input + 3u);

    let old = atomicAdd(&emitter_cursor.cursor, 1u);
    let pidx = old % params.max_particle_count;
    
    cur_state[pidx] = particle;
}

@compute @workgroup_size(256) fn update_state(
    @builtin(global_invocation_id) gid: vec3<u32>
) {
    let i = gid.x;

    if (i >= params.max_particle_count) {
        return;
    }
    var next: Particle;

    let current = cur_state[i];

    // processing
    next.age = current.age + params.delta_time;
    next.death_age = current.death_age;
    next.pos = current.pos + current.vel * params.delta_time;
    next.vel = current.vel;
    next.start_scale = current.start_scale;
    next.final_scale = current.final_scale;
    next.start_color = current.start_color;
    next.final_color = current.final_color;

    next_state[i] = next;
}

@compute @workgroup_size(256) fn update_draw_list(
    @builtin(global_invocation_id) gid: vec3<u32>
) {
    let i = gid.x;

    if (i >= params.max_particle_count) {
        return;
    }

    let state = next_state[i];
    if (state.age >= state.death_age) {
        return;
    }
    let index = atomicAdd(&draw_count.count, 1u);
    draw_list[index] = i;
}