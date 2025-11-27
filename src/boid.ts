import { appendSoA, viewSoA } from "./SoA";
import { ColorIds, state } from "./state";

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

export function boidUpdate() {
  const target = {
    x: (((state.mousePos.x / window.innerWidth) * 2 - 1) * 1920) / 2,
    y: ((((state.mousePos.y / window.innerHeight) * 2 - 1) * 1080) / 2) * -1,
  };
  // console.log(target.x, target.y);
  for (let i = 0; i < state.boids.len; i++) {
    const boid = viewSoA(state.boids, i);
    const physics = viewSoA(state.physicsObjects, boid.physicsId);
    const tf = viewSoA(state.transforms, physics.transformId);
    const accel = viewSoA(state.accelerations, physics.accelerationId);

    const dir = { x: 0, y: 0 };
    dir.x = target.x - tf.x;
    dir.y = target.y - tf.y;
    const dist = Math.hypot(dir.x, dir.y);
    dir.x /= dist;
    dir.y /= dist;

    const targetAngle = (Math.atan2(dir.y, dir.x) * 180) / Math.PI - 90;

    // accel.x = dir.x * 50;
    // accel.y = dir.y * 50;
    accel.r = targetAngle - tf.r;

    console.log(tf.r);
  }
}

// export function boidUpdate() {
//   for (let i = 0; i < state.boids.len; i++) {
//     const boid = viewSoA(state.boids, i);
//     const physics = viewSoA(state.physicsObjects, boid.physicsId);
//     const tf = viewSoA(state.transforms, physics.transformId);
//     const vel = viewSoA(state.velocities, physics.velocityId);
//     const accel = viewSoA(state.accelerations, physics.accelerationId);
//     // console.log(tf.x, tf.y);
//   }
// }

// export function boidUpdate() {
//   for (let i = 0; i < state.boids.len; i++) {
//     const boid = viewSoA(state.boids, i);
//     const physics = viewSoA(state.physicsObjects, boid.physicsId);
//     const tf = viewSoA(state.transforms, physics.transformId);
//     const vel = viewSoA(state.velocities, physics.velocityId);
//     const accel = viewSoA(state.accelerations, physics.accelerationId);
//
//     const neighborPoses = [];
//     const neighborVels = [];
//     for (let j = 0; j < state.boids.len; j++) {
//       if (j == i) continue;
//
//       const boidN = viewSoA(state.boids, j);
//       const physicsN = viewSoA(state.physicsObjects, boidN.physicsId);
//       const tfN = viewSoA(state.transforms, physicsN.transformId);
//
//       const dx = tf.x - tfN.x;
//       const dy = tf.y - tfN.y;
//
//       const dist = Math.sqrt(dx * dx + dy * dy);
//       if (dist >= 200) continue;
//
//       neighborPoses.push({
//         x: tfN.x,
//         y: tfN.y,
//       });
//
//       const velN = viewSoA(state.velocities, physicsN.velocityId);
//       neighborVels.push({ x: velN.x, y: velN.y });
//     }
//
//     //console.log({ x: tf.x, y: tf.y });
//     //console.log(vel.x, vel.y);
//     console.log(accel.x, accel.y);
//
//     if (neighborPoses.length == 0 || neighborVels.length == 0) continue;
//
//     const separation = { x: 0, y: 0 };
//     for (const nPos of neighborPoses) {
//       const dx = tf.x - nPos.x;
//       const dy = tf.y - nPos.y;
//
//       const dist = dx * dx + dy * dy;
//
//       separation.x += (tf.x - nPos.x) / dist;
//       separation.y += (tf.y - nPos.y) / dist;
//     }
//
//     const velAvg = { x: 0, y: 0 };
//     for (const velN of neighborVels) {
//       velAvg.x += velN.x;
//       velAvg.y += velN.y;
//     }
//     velAvg.x /= neighborVels.length;
//     velAvg.y /= neighborVels.length;
//
//     const alignment = { x: velAvg.x - vel.x, y: velAvg.y - vel.y };
//
//     const posAvg = { x: 0, y: 0 };
//     for (const posN of neighborPoses) {
//       posAvg.x += posN.x;
//       posAvg.y += posN.y;
//     }
//     posAvg.x /= neighborPoses.length;
//     posAvg.y /= neighborPoses.length;
//
//     const cohesion = { x: posAvg.x - tf.x, y: posAvg.y - tf.y };
//
//     const w1 = 1;
//     const w2 = 1;
//     const w3 = 1;
//
//     accel.x = w1 * separation.x + w2 * alignment.x + w3 * cohesion.x;
//     accel.y = w1 * separation.y + w2 * alignment.y + w3 * cohesion.y;
//
//     console.log(vel);
//   }
// }

export function boidInit() {
  createBoid({ x: 0, y: 0 });
  //createBoid({ x: -50, y: 0 });
}
