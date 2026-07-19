export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;
export const TILE_SIZE = 32;

export const PLAYER_SPEED = 120;
export const PLAYER_MAX_HP = 100;
export const PLAYER_MAX_STAMINA = 80;
export const DODGE_STAMINA_COST = 20;
export const DODGE_DURATION = 0.3;
export const DODGE_DISTANCE = 60;
export const STAMINA_REGEN = 15;
/** @deprecated Use weapon defs */
export const PLAYER_ATTACK_DAMAGE = 15;
/** @deprecated Use weapon defs */
export const PLAYER_ATTACK_COOLDOWN = 0.45;
/** @deprecated Use weapon defs */
export const PLAYER_ATTACK_RANGE = 36;

export const BAG_SLOTS = 12;
export const HABITAT_CAPACITY = 4;
export const HABITAT_CAPACITY_MAX = 6;

export const BASE_MAP_WIDTH = 32;
export const BASE_MAP_HEIGHT = 32;
export const BASE_CELL_SIZE = 32;
export const BASE_DIG_STAMINA_COST = 5;
export const BASE_STAMINA_REGEN = 25;

export const PARTY_AGGRO_RANGE = 130;
export const PARTY_ATTACK_RANGE = 36;
export const PARTY_FOLLOW_GAP = 28;
/** Distância máxima do jogador durante combate (companheiro não se afasta mais que isso). */
export const PARTY_LEASH_RANGE = 72;
/** Posição de combate ranged: offset a partir do jogador em direção ao alvo. */
export const PARTY_RANGED_OFFSET = 44;
export const PARTY_ATTACK_COOLDOWN = 0.85;
/** Velocidade ao seguir o jogador (~93% do player). */
export const PARTY_FOLLOW_SPEED = 112;
/** Velocidade ao perseguir inimigos. */
export const PARTY_CHASE_SPEED = 105;
export const PARTY_HP_SCALE = 0.85;
export const PARTY_ATK_SCALE = 0.8;

export const CAPTURE_RANGE = 120;
/** @deprecated Use CAPTURE_ORB_FLY_SPEED from capture.ts */
export const CAPTURE_ORB_SPEED = 130;
export const STARTING_ORBS = 3;
export const ORB_PRICE = 25;
export const ORB_BUNDLE_QTY = 3;
export const ORB_BUNDLE_PRICE = 70;

export const SAVE_KEY = 'snaredusk-save';
