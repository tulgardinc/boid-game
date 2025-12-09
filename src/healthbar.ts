import { appendSoA } from "./SoA";
import { addBaseEntity, EntityType, scheduleForDelete, state } from "./state";

const OUTER_WIDTH = 150;
const INNER_MAX_WIDTH = 148;
const VERTICAL_OFFSET = 150;

export function createHealthBar(
  pos: { x: number; y: number },
  asteroidEntityId: number
) {
  const { baseId: outerBaseId, entityId: outerEntityId } = addBaseEntity({
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
    typeId: 0,
  });

  const outerTypeId = appendSoA(state.outerHealthBars, {
    targetEntityId: asteroidEntityId,
    baseId: outerBaseId,
  });

  state.baseEntities.data.typeId[outerBaseId] = outerTypeId;

  const { baseId: innerBaseId } = addBaseEntity({
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
    typeId: 0,
  });

  const innerTypeId = appendSoA(state.innerHealthBars, {
    baseId: innerBaseId,
    outerEntityId,
  });

  state.baseEntities.data.typeId[innerBaseId] = innerTypeId;
}

export function updateHealthBars() {
  const inD = state.innerHealthBars.data;
  const outD = state.outerHealthBars.data;
  const d = state.baseEntities.data;

  for (let inIdx = 0; inIdx < state.innerHealthBars.len; inIdx++) {
    const inBaseIdx = state.innerHealthBars.data.baseId[inIdx];
    const inEntityId = d.entityId[inBaseIdx];

    const outEntityId = inD.outerEntityId[inIdx];
    const outBaseIdx = state.idToBaseLookup[outEntityId]!;
    const outIdx = d.typeId[outBaseIdx];

    const astEntityId = outD.targetEntityId[outIdx];
    const astBaseIdx = state.idToBaseLookup[astEntityId];

    const astIdx = d.typeId[astBaseIdx];

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
