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

function createBoid(pos: { x: number; y: number }) {
  const { baseId, entityId } = addBaseEntity({
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
    typeId: 0,
  });

  const typeId = appendSoA(state.boids, {
    baseId,
  });

  state.baseEntities.data.typeId[baseId] = typeId;

  createNewTrail(entityId);
}

export function updateBoids() {
  const target = {
    x: (((state.mousePos.x / window.innerWidth) * 2 - 1) * 1920) / 2,
    y: ((((state.mousePos.y / window.innerHeight) * 2 - 1) * 1080) / 2) * -1,
  };

  const d = state.baseEntities.data;

  for (let i = 0; i < state.boids.len; i++) {
    const baseId = state.boids.data.baseId[i];

    // handle movement

    const dir = { x: 0, y: 0 };
    dir.x = target.x - d.x[baseId];
    dir.y = target.y - d.y[baseId];
    const dist = Math.hypot(dir.x, dir.y);
    dir.x /= dist;
    dir.y /= dist;

    let targetAngle = (Math.atan2(-dir.x, dir.y) * 180) / Math.PI;
    if (targetAngle < 0) {
      targetAngle += 360;
    }

    const error = angleDiff(targetAngle, d.r[baseId]);

    const Kp = 28;
    const Kd = 8;

    d.aclR[baseId] = Kp * error - Kd * d.velR[baseId];

    const rad = (d.r[baseId] * Math.PI) / 180;
    const fwdx = -Math.sin(rad);
    const fwdy = Math.cos(rad);

    const sidex = fwdy;
    const sidey = -fwdx;

    const vForward = d.velX[baseId] * fwdx + d.velY[baseId] * fwdy;
    const vSide = d.velX[baseId] * sidex + d.velY[baseId] * sidey;

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

      const otherBase = state.boids.data.baseId[j];
      const diffX = d.x[baseId] - d.x[otherBase];
      const diffY = d.y[baseId] - d.y[otherBase];
      const dist = Math.hypot(diffX, diffY);

      if (dist > PUSH_DIST) continue;

      const normX = diffX / dist;
      const normY = diffY / dist;

      const force = (1 - dist / PUSH_DIST) * MAX_PUSH_FORCE;

      axPush += normX * force;
      ayPush += normY * force;
    }

    d.aclX[baseId] = axThrust + axSide + axLong + axPush;
    d.aclY[baseId] = ayThrust + aySide + ayLong + ayPush;
  }
}

export function updateBoidTrails() {
  const d = state.baseEntities.data;

  const MAX_DISTANCE = 1;

  for (let i = 0; i < state.boids.len; i++) {
    const baseId = state.boids.data.baseId[i];
    const eId = d.entityId[baseId];
    const trailIndex = state.idToTrailLookup[eId];

    if (state.trails.data.length[trailIndex] == 0) {
      addTrailPoint(trailIndex, d.x[baseId], d.y[baseId]);
      continue;
    }

    const tailIndex = state.trails.data.tail[trailIndex];

    const rad = (d.r[baseId] * Math.PI) / 180;
    const fwdx = -Math.sin(rad);
    const fwdy = Math.cos(rad);
    const fwdLen = Math.hypot(fwdx, fwdy);
    const fwdxN = fwdx / fwdLen;
    const fwdyN = fwdy / fwdLen;

    const x = d.x[baseId] - fwdxN * 8;
    const y = d.y[baseId] - fwdyN * 8;
    const absoluteTI = trailIndex * MAX_TRAIL_LENGTH + tailIndex;
    const tailX = state.trailPoints.data.x[absoluteTI];
    const tailY = state.trailPoints.data.y[absoluteTI];
    const distX = x - tailX;
    const distY = y - tailY;

    const dist = Math.hypot(distX, distY);

    const speed = Math.hypot(d.velX[baseId], d.velY[baseId]);
    const adaptiveDistance = MAX_DISTANCE * (1 + speed / 500);

    if (dist >= adaptiveDistance) {
      addTrailPoint(trailIndex, x, y);
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

  createBoid({ x: 200, y: 100 });
  createBoid({ x: -200, y: 100 });
  createBoid({ x: 300, y: 100 });
  createBoid({ x: -300, y: 100 });
  createBoid({ x: 400, y: 100 });
  createBoid({ x: -400, y: 100 });

  createBoid({ x: 200, y: -100 });
  createBoid({ x: -200, y: -100 });
  createBoid({ x: 300, y: -100 });
  createBoid({ x: -300, y: -100 });
  createBoid({ x: 400, y: -100 });
  createBoid({ x: -400, y: -100 });
}
