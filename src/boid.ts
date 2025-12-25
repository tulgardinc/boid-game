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

    let targetAngle = (Math.atan2(-dir.x, dir.y) * 180) / Math.PI;
    if (targetAngle < 0) {
      targetAngle += 360;
    }

    const error = angleDiff(targetAngle, d.r[baseIdx]);

    const Kp = 28;
    const Kd = 8;

    d.aclR[baseIdx] = Kp * error - Kd * d.velR[baseIdx];

    const rad = (d.r[baseIdx] * Math.PI) / 180;
    const fwdx = -Math.sin(rad);
    const fwdy = Math.cos(rad);

    const sidex = fwdy;
    const sidey = -fwdx;

    const vForward = d.velX[baseIdx] * fwdx + d.velY[baseIdx] * fwdy;
    const vSide = d.velX[baseIdx] * sidex + d.velY[baseIdx] * sidey;

    const thrust = 450;
    const axThrust = fwdx * thrust;
    const ayThrust = fwdy * thrust;

    const sideFriction = 6;
    const sideForce = -vSide * sideFriction;

    const backFriction = 10;
    const longFricCoeff = vForward > 0 ? 0 : backFriction;
    const longForce = -vForward * longFricCoeff;

    const axSide = sideForce * sidex;
    const aySide = sideForce * sidey;

    const axLong = longForce * fwdx;
    const ayLong = longForce * fwdy;

    let axPush = 0;
    let ayPush = 0;

    const PUSH_DIST = 50;
    const MAX_PUSH_FORCE = 350;

    for (let j = 0; j < state.boids.len; j++) {
      if (j == i) continue;

      const otherBaseIdx = state.boids.data.baseIdx[j];
      const diffX = d.x[baseIdx] - d.x[otherBaseIdx];
      const diffY = d.y[baseIdx] - d.y[otherBaseIdx];
      const dist = Math.hypot(diffX, diffY);

      if (dist > PUSH_DIST) continue;

      const normX = diffX / dist;
      const normY = diffY / dist;

      const force = (1 - dist / PUSH_DIST) * MAX_PUSH_FORCE;

      axPush += normX * force;
      ayPush += normY * force;
    }

    d.aclX[baseIdx] = axThrust + axSide + axLong + axPush;
    d.aclY[baseIdx] = ayThrust + aySide + ayLong + ayPush;
  }
}

export function updateBoidTrails() {
  const d = state.baseEntities.data;

  const MAX_DISTANCE = 1;

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

    const x = d.x[baseIdx] - fwdxN * 8;
    const y = d.y[baseIdx] - fwdyN * 8;
    const absoluteTPIdx = trailIdx * MAX_TRAIL_LENGTH + tailIdx;
    const tailX = state.trailPoints.data.x[absoluteTPIdx];
    const tailY = state.trailPoints.data.y[absoluteTPIdx];
    const distX = x - tailX;
    const distY = y - tailY;

    const dist = Math.hypot(distX, distY);

    const speed = Math.hypot(d.velX[baseIdx], d.velY[baseIdx]);
    const adaptiveDistance = MAX_DISTANCE * (1 + speed / 500);

    if (dist >= adaptiveDistance) {
      addTrailPoint(trailIdx, x, y);
    }
  }
}

export function boidInit() {
  createBoid({ x: 200, y: 0 });
  // createBoid({ x: -200, y: 0 });
  // createBoid({ x: 300, y: 0 });
  // createBoid({ x: -300, y: 0 });
  // createBoid({ x: 400, y: 0 });
  // createBoid({ x: -400, y: 0 });

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
