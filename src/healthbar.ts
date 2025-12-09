import { appendSoA } from "./SoA";
import { EntityType, state } from "./state";

const OUTER_WIDTH = 150;
const INNER_MAX_WIDTH = 148;
const VERTICAL_OFFSET = 150;

export function createHealthBar(
  pos: { x: number; y: number },
  asteroidTypeId: number
) {
  const outerBaseId = appendSoA(state.baseEntities, {
    type: EntityType.HealthBarOuter,

    x: pos.x,
    y: pos.y + VERTICAL_OFFSET,
    r: 0,

    scaleX: OUTER_WIDTH,
    scaleY: 18,

    velX: 0,
    velY: 0,
    velR: 0,

    aclX: 0,
    aclY: 0,
    aclR: 0,

    color: state.colors.outerHelthBar,

    colHalfWidth: 0.5,
    colHalfHeight: 0.5,
  });

  const outerTypeId = appendSoA(state.outerHealthBars, {
    targetTypeId: asteroidTypeId,
  });

  state.baseToType[outerBaseId] = outerTypeId;
  state.typeToBase[outerTypeId] = outerBaseId;

  const innerBaseId = appendSoA(state.baseEntities, {
    type: EntityType.HealthBarOuter,

    x: pos.x,
    y: pos.y,
    r: 0,

    scaleX: INNER_MAX_WIDTH,
    scaleY: 12,

    velX: 0,
    velY: 0,
    velR: 0,

    aclX: 0,
    aclY: 0,
    aclR: 0,

    color: state.colors.innerHelthhBar,

    colHalfWidth: 0.5,
    colHalfHeight: 0.5,
  });

  const innerTypeId = appendSoA(state.innerHealthBars, {
    outerTypeId,
  });

  state.baseToType[innerBaseId] = innerTypeId;
  state.typeToBase[innerTypeId] = innerBaseId;
}

export function updateHealthBars() {
  const inD = state.innerHealthBars.data;
  const outD = state.outerHealthBars.data;
  const d = state.baseEntities.data;

  for (let inId = 0; inId < state.innerHealthBars.len; inId++) {
    const outId = inD.outerTypeId[inId];
    const astId = outD.targetTypeId[outId];
    const health = state.asteroids.data.health[astId];

    const astBaseId = state.typeToBase[astId];
    const outBaseId = state.typeToBase[outId];
    const inBaseId = state.typeToBase[inId];

    d.x[outBaseId] = d.x[astBaseId];
    d.y[outBaseId] = d.y[astBaseId] + VERTICAL_OFFSET;

    d.y[inBaseId] = d.y[outBaseId];
    const newWidth = INNER_MAX_WIDTH * (health / 100);
    d.x[inBaseId] = d.x[outBaseId] - (INNER_MAX_WIDTH - newWidth) / 2;
    d.scaleX[inBaseId] = newWidth;
  }
}
