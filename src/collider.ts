export enum ColliderType {
  Boid,
  Asteroid,
}

export type Collider = {
  halfWidth: number;
  halfHeight: number;
  transformId: number;
  type: ColliderType;
};
