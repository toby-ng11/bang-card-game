import { CharacterKey } from '@/definitions/character';

// ── Cards ────────────────────────────────────────────────────────
export type CardKey =
    | 'bang'
    | 'missed'
    | 'beer'
    | 'gatling'
    | 'indians'
    | 'panic'
    | 'catbalou'
    | 'duel'
    | 'saloon'
    | 'generalstore'
    | 'stagecoach'
    | 'wellsfargo'
    | 'mustang'
    | 'scope'
    | 'barrel'
    | 'schofield'
    | 'remington'
    | 'revcarabine'
    | 'winchester'
    | 'volcanic';

export type CardType = 'brown' | 'blue';

export interface CardDef {
    name: string;
    icon: string;
    desc: string;
    color: CardType;
    weapon?: boolean;
    range?: number;
}

// ── Players ──────────────────────────────────────────────────────
export type Role = 'SHERIFF' | 'DEPUTY' | 'OUTLAW' | 'RENEGADE';

export type Phase =
    | 'draw'
    | 'play'
    | 'dying'
    | 'game-over'
    | 'check-win'
    | CardKey;

export type Winner = 'SHERIFF' | 'OUTLAW' | 'RENEGADE' | null;

export interface Player {
    id: number;
    name: string;
    role: Role;
    character: CharacterKey;
    hp: number;
    maxHp: number;
    hand: CardKey[];
    inPlay: CardKey[];
    alive: boolean;
    isHuman: boolean;
}

export interface PlayerAction {
    type: CardKey;
    sourceId: number;
    targetId: number | null; //null if self-target
}

// ── Card picker ──────────────────────────────────────────────────
export type CardPickSource = 'hand' | 'inPlay';

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
    pendingAction: PlayerAction | null;
    reactorId: number[];
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
    generalStoreOrder: number[];
    generalStoreIndex: number;
    generalStoreResolve: ((card: CardKey) => void) | null;

    activePopups: Array<{
        id: string;
        pid: number;
        cardKey: CardKey;
        type: 'play' | 'damage' | 'heal';
    }>;

    floatingCard: {
        cardKey: CardKey;
        fromId: number | 'deck' | 'discard';
        toId: number | 'deck' | 'discard';
        count?: number;
    } | null;
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
export type FlashType = 'flash-hit' | 'flash-heal' | 'flash-dodge' | '';

export type FlashMap = Record<number, FlashType>;
