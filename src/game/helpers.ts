import { CardKey, GameState, Player } from '@/types';

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
    let current = state;
    const cards: CardKey[] = [];

    for (let i = 0; i < n; i++) {
        if (current.deck.length === 0) {
            current = refillDeck(current);
        }
        if (current.deck.length) {
            const deck = [...current.deck];
            cards.push(deck.shift()!);
            current = { ...current, deck };
        }
    }

    return { cards, state: current };
}

export { dealN, distance, inRange, refillDeck, shuffle };
