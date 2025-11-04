import { appendSoA, viewSoA } from "./SoA";
import { ColorIds, state } from "./state";
import { movePhysicsObject } from "./util";

export type Boid = {
  transformId: number;
  velocityId: number;
  colorId: number;
};

function createBoid() {
  const tId = appendSoA(state.transforms, {
    x: 0,
    y: 0,
    s: 100,
    r: 0,
  });

  const vId = appendSoA(state.velocities, {
    x: 0,
    y: 0,
    r: 0,
  });

  appendSoA(state.boids, {
    transformId: tId,
    velocityId: vId,
    colorId: ColorIds.boid,
  });
}

export function boidUpdate() {
  console.log(state.boids.len);
  for (let i = 0; i < state.boids.len; i++) {
    console.log("updating boid");
    const boid = viewSoA(state.boids, i);
    const tid = boid.transformId;
    const vid = boid.velocityId;
    movePhysicsObject(tid, vid);
  }
}

export function boidInit() {
  createBoid();
}
