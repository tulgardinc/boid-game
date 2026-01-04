import { state } from "./state";
import { expApproach } from "./util";

const CAM_TRANSITION_HL = 0.06;

function approach(cur: number, target: number) {
  if (Math.abs(target - cur) <= 0.001) return target;
  return expApproach(cur, target, state.time.uiTime.delta, CAM_TRANSITION_HL);
}

export function cameraUpdate() {
  if (state.camera.x != state.camera.target.x) {
    state.camera.x = approach(state.camera.x, state.camera.target.x);
  }
  if (state.camera.y != state.camera.target.y) {
    state.camera.y = approach(state.camera.y, state.camera.target.y);
  }
  if (state.camera.r != state.camera.target.r) {
    state.camera.r = approach(state.camera.r, state.camera.target.r);
  }
  if (state.camera.zoom != state.camera.target.zoom) {
    state.camera.zoom = approach(state.camera.zoom, state.camera.target.zoom);
  }
}
