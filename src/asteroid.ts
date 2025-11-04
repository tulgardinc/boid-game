import { appendSoA } from "./SoA";
import { viewSoA } from "./SoA";
import { ColorIds, state } from "./state";
import { movePhysicsObject } from "./util";

export type Asteroid = {
  transformId: number;
  velocityId: number;
  colorId: number;
};

function randomStep() {
  return Math.random() > 0.5 ? 1 : -1;
}

function createAsteroid() {
  const maxScale = 250;
  const minScale = 150;

  const maxSpeed = 120;
  const minSpeed = 100;

  let spawnX;
  let spawnY;

  if (randomStep() == 1) {
    spawnX = randomStep() * (1920 / 2 + maxScale);
    spawnY = randomStep() * (Math.random() - 0.5) * (1080 + maxScale * 2);
  } else {
    spawnX = randomStep() * (Math.random() - 0.5) * (1920 + maxScale * 2);
    spawnY = randomStep() * (1080 / 2 + maxScale);
  }

  const tfId = appendSoA(state.transforms, {
    x: 0,
    y: 0,
    s: Math.random() * (maxScale - minScale) + minScale,
    r: Math.random() * 180,
  });

  const velId = appendSoA(state.velocities, {
    x:
      -(Math.abs(spawnX) / spawnX) *
      (Math.random() * (maxSpeed - minSpeed) + minSpeed),
    y:
      -(Math.abs(spawnY) / spawnY) *
      (Math.random() * (maxSpeed - minSpeed) + minSpeed),
    r: randomStep() * Math.random() * (50 - 10) + 10,
  });

  console.log(
    `spawning at: ${[spawnX, spawnY]} | velocity: ${[
      state.velocities.data.x[velId],
      state.velocities.data.y[velId],
    ]}`,
  );

  appendSoA(state.asteroids, {
    transformId: tfId,
    velocityId: velId,
    colorId: ColorIds.asteroid,
  });
}

export function asteroidUpdate() {
  state.asteroidTimer += state.time.deltaTime;
  if (state.asteroidTimer >= 1) {
    createAsteroid();
    state.asteroidTimer = 0;
  }

  for (let i = 0; i < state.asteroids.len; i++) {
    const asteroid = viewSoA(state.asteroids, i);
    const tid = asteroid.transformId;
    const vid = asteroid.velocityId;
    movePhysicsObject(tid, vid);
  }
}

export function asteroidInit() {}
