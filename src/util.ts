import { viewSoA } from "./SoA";
import { state } from "./state";

export function movePhysicsObject(transformId: number, velocityId: number) {
  const tid = transformId;
  const vid = velocityId;
  viewSoA(state.transforms, tid).x +=
    viewSoA(state.velocities, vid).x * state.time.deltaTime;
  viewSoA(state.transforms, tid).y +=
    viewSoA(state.velocities, vid).y * state.time.deltaTime;
  viewSoA(state.transforms, tid).r +=
    viewSoA(state.velocities, vid).r * state.time.deltaTime;
}
