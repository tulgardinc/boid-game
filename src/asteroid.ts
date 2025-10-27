import { appendSoA } from "./SoA";
import { state } from "./state";

export type Asteroid = {
  transformId: number;
  velocityId: number;
};

function createAsteroid() {
  const spawnXS = Math.random() > 0.5 ? 1 : -1;
  const spawnYS = Math.random() > 0.5 ? 1 : -1;

  const tfId = appendSoA(state.transforms, {
    x: spawnXS * (1920 / 2),
    y: spawnYS * (1080 / 2),
    s: Math.random() * (50 - 10) + 10,
    r: Math.random() * 180,
  });

  const velId = appendSoA(state.velocities, {
    x: -spawnXS * (50 - 10) + 10,
    y: -spawnYS * (50 - 10) + 10,
    r: Math.random() * (50 - 10) + 10,
  });

  appendSoA(state.asteroids, {
    transformId: tfId,
    velocityId: velId,
  });
}

export function asteroidUpdate() {}
