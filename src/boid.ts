import { appendSoA } from "./SoA";
import { EntityType, state } from "./state";
import { angleDiff } from "./util";

function createBoid(pos: { x: number; y: number }) {
  const baseId = appendSoA(state.baseEntities, {
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
}

export function updateBoids() {
  const target = {
    x: (((state.mousePos.x / window.innerWidth) * 2 - 1) * 1920) / 2,
    y: ((((state.mousePos.y / window.innerHeight) * 2 - 1) * 1080) / 2) * -1,
  };

  const d = state.baseEntities.data;

  for (let i = 0; i < state.boids.len; i++) {
    const baseId = state.boids.data.baseId[i];

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

    d.aclX[baseId] = axThrust + axSide + axLong;
    d.aclY[baseId] = ayThrust + aySide + ayLong;
  }
}

export function boidInit() {
  createBoid({ x: 0, y: 0 });
  //createBoid({ x: -50, y: 0 });
}
