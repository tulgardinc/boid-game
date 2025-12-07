import { wrap } from "module";
import { appendSoA } from "./SoA";
import { ColorIds, state } from "./state";
import { angleDiff } from "./util";

export type Boid = {
  physicsId: number;
  colorId: number;
};

function createBoid(pos: { x: number; y: number }) {
  const tId = appendSoA(state.transforms, {
    x: pos.x,
    y: pos.y,
    s: 50,
    r: 0,
  });

  const vId = appendSoA(state.velocities, {
    x: 0,
    y: 0,
    r: 0,
  });

  const aId = appendSoA(state.accelerations, {
    x: 0,
    y: 0,
    r: 0,
  });

  const pId = appendSoA(state.physicsObjects, {
    transformId: tId,
    velocityId: vId,
    accelerationId: aId,
  });

  appendSoA(state.boids, {
    physicsId: pId,
    colorId: ColorIds.boid,
  });
}

export function updateBoids() {
  const target = {
    x: (((state.mousePos.x / window.innerWidth) * 2 - 1) * 1920) / 2,
    y: ((((state.mousePos.y / window.innerHeight) * 2 - 1) * 1080) / 2) * -1,
  };

  const tx = state.transforms.data.x;
  const ty = state.transforms.data.y;
  const tr = state.transforms.data.r;
  const ax = state.accelerations.data.x;
  const ay = state.accelerations.data.y;
  const ar = state.accelerations.data.r;
  const vx = state.velocities.data.x;
  const vy = state.velocities.data.y;
  const vr = state.velocities.data.r;

  for (let i = 0; i < state.boids.len; i++) {
    const pid = state.boids.data.physicsId[i];
    const tid = state.physicsObjects.data.transformId[pid];
    const aid = state.physicsObjects.data.accelerationId[pid];
    const vid = state.physicsObjects.data.velocityId[pid];

    const dir = { x: 0, y: 0 };
    dir.x = target.x - tx[tid];
    dir.y = target.y - ty[tid];
    const dist = Math.hypot(dir.x, dir.y);
    dir.x /= dist;
    dir.y /= dist;

    let targetAngle = (Math.atan2(-dir.x, dir.y) * 180) / Math.PI;
    if (targetAngle < 0) {
      targetAngle += 360;
    }

    const error = angleDiff(targetAngle, tr[tid]);

    const Kp = 28;
    const Kd = 8;

    ar[aid] = Kp * error - Kd * vr[vid];

    const rad = (tr[tid] * Math.PI) / 180;
    const fwdx = -Math.sin(rad);
    const fwdy = Math.cos(rad);

    const sidex = fwdy;
    const sidey = -fwdx;

    const vForward = vx[vid] * fwdx + vy[vid] * fwdy;
    const vSide = vx[vid] * sidex + vy[vid] * sidey;

    const thrust = 300;
    const axThrust = fwdx * thrust;
    const ayThrust = fwdy * thrust;

    const sideFriction = 3;
    const sideForce = -vSide * sideFriction;

    const backFriction = 5;
    const longFricCoeff = vForward > 0 ? 0 : backFriction;
    const longForce = -vForward * longFricCoeff;

    const axSide = sideForce * sidex;
    const aySide = sideForce * sidey;

    const axLong = longForce * fwdx;
    const ayLong = longForce * fwdy;

    ax[aid] = axThrust + axSide + axLong;
    ay[aid] = ayThrust + aySide + ayLong;
  }
}

export function boidInit() {
  createBoid({ x: 0, y: 0 });
  createBoid({ x: -50, y: 0 });
}
