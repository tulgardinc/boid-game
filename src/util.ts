import { viewSoA } from "./SoA";
import { state } from "./state";

export function physicsUpdate() {
  for (let i = 0; i < state.physicsObjects.len; i++) {
    const {
      transformId: tid,
      velocityId: vid,
      accelerationId: aid,
    } = viewSoA(state.physicsObjects, i);

    viewSoA(state.velocities, vid).x +=
      viewSoA(state.accelerations, aid).x * state.time.deltaTime;
    viewSoA(state.velocities, vid).y +=
      viewSoA(state.accelerations, aid).y * state.time.deltaTime;
    viewSoA(state.velocities, vid).r +=
      viewSoA(state.accelerations, aid).r * state.time.deltaTime;

    viewSoA(state.transforms, tid).x +=
      viewSoA(state.velocities, vid).x * state.time.deltaTime;
    viewSoA(state.transforms, tid).y +=
      viewSoA(state.velocities, vid).y * state.time.deltaTime;
    viewSoA(state.transforms, tid).r +=
      viewSoA(state.velocities, vid).r * state.time.deltaTime;
  }
}
