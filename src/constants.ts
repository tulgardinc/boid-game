// ============================================================================
// GAMEPLAY CONSTANTS
// ============================================================================

// ----------------------------------------------------------------------------
// Boid
// ----------------------------------------------------------------------------

export const BOID_DAMAGE = 20;
export const BOID_THRUST_FORCE = 550;
export const BOID_SIDE_FRICTION = 10;
export const BOID_BACK_FRICTION = 14;

// ----------------------------------------------------------------------------
// Asteroid
// ----------------------------------------------------------------------------

export const ASTEROID_HEALTH = 100;
export const ASTEROID_MAX_SCALE = 250;
export const ASTEROID_MIN_SCALE = 150;
export const ASTEROID_MAX_SPEED = 120;
export const ASTEROID_MIN_SPEED = 100;

// Animation constants
export const ASTEROID_HIT_SCALE = 0.8;
export const ASTEROID_SHRINK_DURATION = 0.15;
export const ASTEROID_DAMAGE_COLOR_DURATION = 0.1;
export const ASTEROID_STOP_DURATION = 0.1;
export const ASTEROID_KNOCKBACK_RECOVERY_DURATION = 0.4;
export const ASTEROID_DEATH_DELAY = 0.15;

// Rotation constants
export const ASTEROID_MAX_VEL_R = 90;
export const ASTEROID_RETURN_VEL_R_SPEED = 150;

// ----------------------------------------------------------------------------
// Combat
// ----------------------------------------------------------------------------

export const COLLISION_SPEED_THRESHOLD = 500;
export const HURT_COOLDOWN_DURATION = 0.5;

// ----------------------------------------------------------------------------
// Camera
// ----------------------------------------------------------------------------

export const CAMERA_SHAKE_MULTIPLIER = 15;

// ----------------------------------------------------------------------------
// Trail
// ----------------------------------------------------------------------------

export const MAX_TRAIL_LENGTH = 50;

// ============================================================================
// RENDERING CONSTANTS
// ============================================================================

// ----------------------------------------------------------------------------
// Particles
// ----------------------------------------------------------------------------

export const MAX_PARTICLE_COUNT = 10000;
export const VERTICES_PER_PARTICLE = 6;
export const PARTICLE_COMPUTE_WORKGROUP_SIZE = 256;

// ----------------------------------------------------------------------------
// Text & Font Atlas
// ----------------------------------------------------------------------------

export const ATLAS_SIZE = 1024;
export const GLYPH_WIDTH = 64;
export const GLYPH_HEIGHT = 100;
export const FIRST_CHAR_CODE = 32; // Space character " "
export const GLYPH_SPACING = 0.8; // Multiplier for distance between glyphs

// ----------------------------------------------------------------------------
// Canvas
// ----------------------------------------------------------------------------

export const DEFAULT_CANVAS_WIDTH = 1920;
export const DEFAULT_CANVAS_HEIGHT = 1080;

// ----------------------------------------------------------------------------
// Trail Rendering
// ----------------------------------------------------------------------------

export const TRAIL_VISUAL_WIDTH = 6;

// ----------------------------------------------------------------------------
// Locations
// ----------------------------------------------------------------------------

export const UI_TRANSITION_DURATION = 2.0;
export const UI_DISTANCE = 300;
