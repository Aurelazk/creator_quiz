/**
 * layout.ts — Positions et dimensions du studio (mètres, monde 3D)
 * Partagé entre l'éditeur et la logique de jeu.
 */

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export const LAYOUT = {
  /** Caméra de gameplay par défaut, adaptée par scenes/main.ts */
  cameraHome: { x: 0, y: 3.35, z: 10.8 },
  cameraLook: { x: 0, y: 2.0, z: -1.9 },
  cameraFov: 40,

  stageRadius: 8.6,
  stageHeight: 1.25,
  stageTop: 0,

  host: { x: -2.15, y: 0.55, z: 0.2 },
  coHost: { x: 2.15, y: 0.55, z: 0.2 },
  mascot: { x: 0, y: 2.7, z: 1.0 },

  blockLeft: { x: -1.66, y: 0.95, z: 3.4 },
  blockRight: { x: 1.66, y: 0.95, z: 3.4 },
  blockSize: { x: 2.7, y: 1.35, z: 0.62 },

  timer: { x: 4.3, y: 2.7, z: 0.2 },
  playButton: { x: 0, y: 0.2, z: 6.1 },

  /** Caméra de repli quand Play démarre depuis l'écran ready */
  readyCamera: { x: 0, y: 2.2, z: 13.6 },
  readyLook: { x: 0, y: 0.9, z: 5.6 },
} as const;
