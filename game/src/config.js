// Tuning constants for ABYSSAL ECHO. One place for every number the
// designers tweak: sizes, speeds, depths, counts, costs and colours.
export const VIEW_W = 1280;
export const VIEW_H = 800;

export const WIN_DEPTH_M = 500; // metres down to the Trench Heart
export const PX_PER_M = 8; // world pixels per metre of depth
export const WORLD_H = WIN_DEPTH_M * PX_PER_M + 600;

export const PEARLS_TOTAL = 12;
export const MAX_HULL = 3;

export const SUB_RADIUS = 20;
export const THRUST = 620; // px / s^2
export const DRAG = 1.6; // velocity damping per second
export const MAX_SPEED = 330;

export const SONAR_MAX = 100;
export const SONAR_COST = 34; // charge spent per ping
export const SONAR_RECHARGE = 9; // charge per second
export const SONAR_SPEED = 620; // pulse ring expansion, px / s
export const SONAR_MAX_R = 520;
export const REVEAL_TIME = 2.6; // seconds an entity stays lit after a ping

export const MINE_COUNT = 26;
export const MINE_RADIUS = 16;
export const EEL_COUNT = 7;
export const EEL_SPEED = 95;
export const EEL_CHASE_SPEED = 175;
export const EEL_CHASE_R = 300;
export const EEL_TOUCH_R = 30;

export const PEARL_RADIUS = 11;
export const PEARL_SCORE = 100;
export const DEPTH_SCORE_PER_M = 2;
export const WIN_TIME_BONUS = 1500;

export const INVULN_TIME = 1.6; // seconds of grace after a hit
export const SHAKE_TIME = 0.35;

export const PALETTE = {
  waterTop: '#04101f',
  waterDeep: '#010409',
  rock: '#0d2233',
  rockEdge: '#1d4d63',
  sonar: '#37e6d4',
  sonarSoft: '#1fb8a6',
  pearl: '#ffd166',
  pearlCore: '#fff3c4',
  mine: '#ff4d5e',
  eel: '#7ee081',
  eelEye: '#eaffea',
  subHull: '#cfe8ff',
  subAccent: '#ffb703',
  text: '#dff6ff',
  dim: '#7fa8b8',
  heart: '#ff5d73',
  heartEmpty: '#2a3f4d',
};
