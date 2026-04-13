import { GameAction } from '@/gameReducer';
import { CardKey, CardPick, GameState, Player } from '@/types';

function shuffle<T>(a: T[]): T[] {
    const r = [...a];
    for (let i = r.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
}

function getAliveOrder(players: Player[]) {
    return players.filter((player) => player.alive).map((player) => player.id);
}

function distance(players: Player[], from: number, to: number): number {
    const alive = getAliveOrder(players);
    const fi = alive.indexOf(from),
        ti = alive.indexOf(to);
    if (fi < 0 || ti < 0) return 99;
    const n = alive.length,
        d = Math.abs(fi - ti);
    const base = Math.min(d, n - d);
    return Math.max(
        1,
        base +
            (players[to].inPlay.includes('mustang') ? 1 : 0) -
            (players[from].inPlay.includes('scope') ? 1 : 0),
    );
}

function inRange(players: Player[], from: number, to: number): boolean {
    return distance(players, from, to) <= 1;
}

function refillDeck(state: GameState): GameState {
    if (state.deck.length === 0 && state.discardPile.length > 0) {
        return {
            ...state,
            deck: shuffle([...state.discardPile]),
            discardPile: [],
            log: ['(Deck reshuffled from discard pile.)', ...state.log].slice(
                0,
                25,
            ),
        };
    }
    return state;
}

function dealN(
    state: GameState,
    n: number,
): { cards: CardKey[]; state: GameState } {
    let currentDeck = [...state.deck];
    let currentDiscard = [...state.discardPile];

    if (currentDeck.length < n) {
        const shuffledDiscard = shuffle(currentDiscard);
        currentDeck = [...currentDeck, ...shuffledDiscard];
        currentDiscard = [];
    }

    const drawnCards = currentDeck.slice(0, n);
    const remainingDeck = currentDeck.slice(n);

    return {
        cards: drawnCards,
        state: {
            ...state,
            deck: remainingDeck,
            discardPile: currentDiscard,
        },
    };
}

function waitForCardPick(
    state: GameState,
    targetId: number,
    label: string,
    dispatch: React.Dispatch<GameAction>,
): Promise<CardPick> {
    return new Promise((res) => {
        dispatch({
            type: 'SET_CARD_PICKER',
            picking: true,
            target: targetId,
            label,
            resolve: res,
        });
    });
}

function isEnemy(state: GameState, from: number, to: number) {
    const f = state.players[from],
        t = state.players[to];
    if (f.role === 'SHERIFF' || f.role === 'DEPUTY')
        return t.role === 'OUTLAW' || t.role === 'RENEGADE';
    if (f.role === 'OUTLAW') return t.role === 'SHERIFF' || t.role === 'DEPUTY';
    return t.role !== 'RENEGADE';
}

export {
    dealN,
    distance,
    inRange,
    isEnemy,
    refillDeck,
    shuffle,
    waitForCardPick,
};
