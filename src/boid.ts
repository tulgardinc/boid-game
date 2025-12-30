import { appendSoA } from "./SoA";
import {
  addBaseEntity,
  addTrailPoint,
  createNewTrail,
  EntityType,
  MAX_TRAIL_LENGTH,
  state,
} from "./state";
import { angleDiff } from "./util";

export const BOID_DAMAGE = 20;

// PID Controller constants
const ROTATION_KP = 28;
const ROTATION_KD = 8;

// Movement constants
const THRUST_FORCE = 550;
const SIDE_FRICTION = 10;
const BACK_FRICTION = 14;

// Separation behavior constants
const PUSH_DISTANCE = 50;
const MAX_PUSH_FORCE = 350;

// Trail constants
const TRAIL_MAX_DISTANCE = 1;
const TRAIL_OFFSET = 8;
const TRAIL_SPEED_DIVISOR = 500;

function createBoid(pos: { x: number; y: number }) {
  const { baseIdx, entityId } = addBaseEntity({
    type: EntityType.Boid,

    x: pos.x,
    y: pos.y,
    r: 0,

    scaleX: 25,
    scaleY: 25,

    velX: 0,
    velY: 0,
    velR: 0,

    aclX: 0,
    aclY: 0,
    aclR: 0,

    color: state.colors.boid,

    colHalfWidth: 0.5,
    colHalfHeight: 0.5,
    typeIdx: 0,
  });

  const typeIdx = appendSoA(state.boids, {
    baseIdx,
  });

  state.baseEntities.data.typeIdx[baseIdx] = typeIdx;

  createNewTrail(entityId);
}

export function updateBoids() {
  const target = {
    x: (((state.mousePos.x / window.innerWidth) * 2 - 1) * 1920) / 2,
    y: ((((state.mousePos.y / window.innerHeight) * 2 - 1) * 1080) / 2) * -1,
  };

  const d = state.baseEntities.data;

  for (let i = 0; i < state.boids.len; i++) {
    const baseIdx = state.boids.data.baseIdx[i];

    // handle movement
    const dir = { x: 0, y: 0 };
    dir.x = target.x - d.x[baseIdx];
    dir.y = target.y - d.y[baseIdx];
    const dist = Math.hypot(dir.x, dir.y);
    dir.x /= dist;
    dir.y /= dist;

    let targetAngle = ((Math.atan2(-dir.x, dir.y) * 180) / Math.PI + 360) % 360;

    const error = angleDiff(targetAngle, d.r[baseIdx]);

    d.aclR[baseIdx] = ROTATION_KP * error - ROTATION_KD * d.velR[baseIdx];

    const rad = (d.r[baseIdx] * Math.PI) / 180;
    const fwdx = -Math.sin(rad);
    const fwdy = Math.cos(rad);

    const sidex = fwdy;
    const sidey = -fwdx;

    const vForward = d.velX[baseIdx] * fwdx + d.velY[baseIdx] * fwdy;
    const vSide = d.velX[baseIdx] * sidex + d.velY[baseIdx] * sidey;

    const axThrust = fwdx * THRUST_FORCE;
    const ayThrust = fwdy * THRUST_FORCE;

    const sideForce = -vSide * SIDE_FRICTION;

    const longFricCoeff = vForward > 0 ? 0 : BACK_FRICTION;
    const longForce = -vForward * longFricCoeff;

    const axSide = sideForce * sidex;
    const aySide = sideForce * sidey;

    const axLong = longForce * fwdx;
    const ayLong = longForce * fwdy;

    let axPush = 0;
    let ayPush = 0;

    for (let j = 0; j < state.boids.len; j++) {
      if (j == i) continue;

      const otherBaseIdx = state.boids.data.baseIdx[j];
      const diffX = d.x[baseIdx] - d.x[otherBaseIdx];
      const diffY = d.y[baseIdx] - d.y[otherBaseIdx];
      const dist = Math.hypot(diffX, diffY);

      if (dist > PUSH_DISTANCE) continue;

      const normX = diffX / dist;
      const normY = diffY / dist;

      const force = (1 - dist / PUSH_DISTANCE) * MAX_PUSH_FORCE;

      axPush += normX * force;
      ayPush += normY * force;
    }

    d.aclX[baseIdx] = axThrust + axSide + axLong + axPush;
    d.aclY[baseIdx] = ayThrust + aySide + ayLong + ayPush;
  }
}

export function updateBoidTrails() {
  const d = state.baseEntities.data;

  for (let i = 0; i < state.boids.len; i++) {
    const baseIdx = state.boids.data.baseIdx[i];
    const entityId = d.entityId[baseIdx];
    const trailIdx = state.idToTrailLookup[entityId];

    if (state.trails.data.length[trailIdx] == 0) {
      addTrailPoint(trailIdx, d.x[baseIdx], d.y[baseIdx]);
      continue;
    }

    const tailIdx = state.trails.data.tail[trailIdx];

    const rad = (d.r[baseIdx] * Math.PI) / 180;
    const fwdx = -Math.sin(rad);
    const fwdy = Math.cos(rad);
    const fwdLen = Math.hypot(fwdx, fwdy);
    const fwdxN = fwdx / fwdLen;
    const fwdyN = fwdy / fwdLen;

    const x = d.x[baseIdx] - fwdxN * TRAIL_OFFSET;
    const y = d.y[baseIdx] - fwdyN * TRAIL_OFFSET;
    const absoluteTPIdx = trailIdx * MAX_TRAIL_LENGTH + tailIdx;
    const tailX = state.trailPoints.data.x[absoluteTPIdx];
    const tailY = state.trailPoints.data.y[absoluteTPIdx];
    const distX = x - tailX;
    const distY = y - tailY;

    const dist = Math.hypot(distX, distY);

    const speed = Math.hypot(d.velX[baseIdx], d.velY[baseIdx]);
    const adaptiveDistance =
      TRAIL_MAX_DISTANCE * (1 + speed / TRAIL_SPEED_DIVISOR);

    if (dist >= adaptiveDistance) {
      addTrailPoint(trailIdx, x, y);
    }
  }
}

export function boidInit() {
  createBoid({ x: 200, y: 0 });
  createBoid({ x: -200, y: 0 });
  createBoid({ x: 300, y: 0 });
  createBoid({ x: -300, y: 0 });
  createBoid({ x: 400, y: 0 });
  createBoid({ x: -400, y: 0 });
  // createBoid({ x: 200, y: 100 });
  // createBoid({ x: -200, y: 100 });
  // createBoid({ x: 300, y: 100 });
  // createBoid({ x: -300, y: 100 });
  // createBoid({ x: 400, y: 100 });
  // createBoid({ x: -400, y: 100 });
  // createBoid({ x: 200, y: -100 });
  // createBoid({ x: -200, y: -100 });
  // createBoid({ x: 300, y: -100 });
  // createBoid({ x: -300, y: -100 });
  // createBoid({ x: 400, y: -100 });
  // createBoid({ x: -400, y: -100 });
}
