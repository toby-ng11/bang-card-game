// ── Cards ────────────────────────────────────────────────────────
export type CardKey =
  | "bang"
  | "missed"
  | "beer"
  | "gatling"
  | "indians"
  | "panic"
  | "catbalou"
  | "duel"
  | "saloon"
  | "generalstore"
  | "stagecoach"
  | "wellsfargo"
  | "mustang"
  | "scope";

export type CardType = "brown" | "blue";

export interface CardDef {
  name: string;
  icon: string;
  desc: string;
  color: CardType;
}

// ── Players ──────────────────────────────────────────────────────
export type Role = "sheriff" | "deputy" | "outlaw" | "renegade";

export type Phase = "draw" | "play";

export type Winner = "sheriff" | "outlaws" | "renegade_solo" | null;

export interface Player {
  id: number;
  name: string;
  role: Role;
  hp: number;
  maxHp: number;
  hand: CardKey[];
  inPlay: CardKey[];
  alive: boolean;
  isHuman: boolean;
}

// ── Card picker ──────────────────────────────────────────────────
export type CardPickSource = "hand" | "inPlay";

export interface CardPick {
  source: CardPickSource;
  idx: number;
  key: CardKey;
}

// ── Game state ───────────────────────────────────────────────────
export interface GameState {
  players: Player[];
  deck: CardKey[];
  discardPile: CardKey[];
  turn: number;
  phase: Phase;
  bangUsed: boolean;
  log: string[];
  over: boolean;
  winner: Winner;
  selectedCard: number | null;
  targeting: boolean;
  discardingToEndTurn: boolean;

  // card picker (Panic!, Cat Balou)
  cardPickerPicking: boolean;
  cardPickerTarget: number | null;
  cardPickerResolve: ((picked: CardPick) => void) | null;
  cardPickerLabel: string;

  // general store
  generalStoreCards: CardKey[];
  generalStorePicking: boolean;
  generalStorePlayerPicking: boolean;
  generalStoreResolve: ((card: CardKey) => void) | null;
}

// ── Layout ───────────────────────────────────────────────────────
export interface GridPosition {
  id: number;
  row: number;
  col: number;
}

export interface GridLayout {
  cols: number;
  positions: GridPosition[];
}

// ── Role info ────────────────────────────────────────────────────
export interface RoleInfo {
  label: string;
  goal: string;
  bg: string;
  color: string;
}

// ── Flash map ────────────────────────────────────────────────────
export type FlashType = "flash-hit" | "flash-heal" | "flash-dodge" | "";

export type FlashMap = Record<number, FlashType>;
