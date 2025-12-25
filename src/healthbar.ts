import { appendSoA } from "./SoA";
import { addBaseEntity, EntityType, scheduleForDelete, state } from "./state";

const OUTER_WIDTH = 150;
const INNER_MAX_WIDTH = 148;
const VERTICAL_OFFSET = 150;

export function createHealthBar(
  pos: { x: number; y: number },
  asteroidEntityId: number
) {
  const { baseIdx: outerBaseIdx, entityId: outerEntityId } = addBaseEntity({
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
    typeIdx: 0,
  });

  const outerTypeIdx = appendSoA(state.outerHealthBars, {
    targetEntityId: asteroidEntityId,
    baseIdx: outerBaseIdx,
  });

  state.baseEntities.data.typeIdx[outerBaseIdx] = outerTypeIdx;

  const { baseIdx: innerBaseIdx } = addBaseEntity({
    type: EntityType.HealthBarInnner,

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
    typeIdx: 0,
  });

  const innerTypeIdx = appendSoA(state.innerHealthBars, {
    baseIdx: innerBaseIdx,
    outerEntityId,
  });

  state.baseEntities.data.typeIdx[innerBaseIdx] = innerTypeIdx;
}

export function updateHealthBars() {
  const inD = state.innerHealthBars.data;
  const outD = state.outerHealthBars.data;
  const d = state.baseEntities.data;

  for (let inIdx = 0; inIdx < state.innerHealthBars.len; inIdx++) {
    const inBaseIdx = state.innerHealthBars.data.baseIdx[inIdx];
    const inEntityId = d.entityId[inBaseIdx];

    const outEntityId = inD.outerEntityId[inIdx];
    const outBaseIdx = state.idToBaseLookup[outEntityId]!;
    const outIdx = d.typeIdx[outBaseIdx];

    const astEntityId = outD.targetEntityId[outIdx];
    const astBaseIdx = state.idToBaseLookup[astEntityId];

    const astIdx = d.typeIdx[astBaseIdx];

    const health = state.asteroids.data.health[astIdx];

    if (health <= 0) {
      scheduleForDelete(outEntityId);
      scheduleForDelete(inEntityId);
      continue;
    }

    d.x[outBaseIdx] = d.x[astBaseIdx];
    d.y[outBaseIdx] = d.y[astBaseIdx] + VERTICAL_OFFSET;

    d.y[inBaseIdx] = d.y[outBaseIdx];
    const newWidth = INNER_MAX_WIDTH * (health / 100);
    d.x[inBaseIdx] = d.x[outBaseIdx] - (INNER_MAX_WIDTH - newWidth) / 2;
    d.scaleX[inBaseIdx] = newWidth;
  }
}
