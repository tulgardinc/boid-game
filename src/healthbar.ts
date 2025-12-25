import { appendSoA } from "./SoA";
import { addBaseEntity, EntityType, scheduleForDelete, state } from "./state";
import { expApproach } from "./util";

const OUTER_WIDTH = 150;
const INNER_MAX_WIDTH = 148;
const VERTICAL_OFFSET = 150;
const TRANSITION_HALFLIFE = 0.08;

export function createHealthBar(
  pos: { x: number; y: number },
  asteroidEntityId: number
) {
  const { baseIdx: innerBaseIdx, entityId: innerEntityId } = addBaseEntity({
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
  });

  state.baseEntities.data.typeIdx[innerBaseIdx] = innerTypeIdx;

  const { baseIdx: transitionBaseIdx, entityId: transitionEntityId } =
    addBaseEntity({
      type: EntityType.HealthBarTransition,

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

      color: state.colors.transitionHealthBar,

      colHalfWidth: 0.5,
      colHalfHeight: 0.5,
      typeIdx: 0,
    });

  const transitionTypeIdx = appendSoA(state.transitionHealthBars, {
    baseIdx: transitionBaseIdx,
  });

  state.baseEntities.data.typeIdx[transitionBaseIdx] = transitionTypeIdx;

  const { baseIdx: outerBaseIdx } = addBaseEntity({
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
    innerEntityId,
    transitionEntityId,
    targetWidth: INNER_MAX_WIDTH,
  });

  state.baseEntities.data.typeIdx[outerBaseIdx] = outerTypeIdx;
}

export function updateHealthBars() {
  const outD = state.outerHealthBars.data;
  const d = state.baseEntities.data;

  for (let outIdx = 0; outIdx < state.outerHealthBars.len; outIdx++) {
    const outBaseIdx = outD.baseIdx[outIdx];
    const outEntityId = d.entityId[outBaseIdx];

    const inEntityId = outD.innerEntityId[outIdx];
    const inBaseIdx = state.idToBaseLookup[inEntityId];

    const trEntityId = outD.transitionEntityId[outIdx];
    const trBaseIdx = state.idToBaseLookup[trEntityId];

    const astEntityId = outD.targetEntityId[outIdx];
    const astBaseIdx = state.idToBaseLookup[astEntityId];
    const astIdx = d.typeIdx[astBaseIdx];
    const health = state.asteroids.data.health[astIdx];

    if (health <= 0) {
      scheduleForDelete(outEntityId);
      scheduleForDelete(trEntityId);
      scheduleForDelete(inEntityId);
      continue;
    }

    d.x[outBaseIdx] = d.x[astBaseIdx];
    d.y[outBaseIdx] = d.y[astBaseIdx] + VERTICAL_OFFSET;

    const trueWidth = INNER_MAX_WIDTH * (health / 100);
    outD.targetWidth[outIdx] = trueWidth;
    d.scaleX[inBaseIdx] = trueWidth;

    let trWidth = d.scaleX[trBaseIdx];
    if (trWidth > trueWidth) {
      trWidth = Math.max(
        Math.floor(
          expApproach(
            trWidth,
            trueWidth,
            state.time.deltaTime,
            TRANSITION_HALFLIFE
          )
        ),
        trueWidth
      );
      d.scaleX[trBaseIdx] = trWidth;
    }

    d.y[inBaseIdx] = d.y[outBaseIdx];
    d.y[trBaseIdx] = d.y[outBaseIdx];
    d.x[inBaseIdx] = d.x[outBaseIdx] - (INNER_MAX_WIDTH - trueWidth) / 2;
    d.x[trBaseIdx] = d.x[outBaseIdx] - (INNER_MAX_WIDTH - trWidth) / 2;
  }
}
