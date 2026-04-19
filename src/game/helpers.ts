import { CARD_DEFS } from '@/definitions/cards';
import { CARD_POOL } from '@/definitions/deck';
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
            (players[to].character === 'paul_regret' ? 1 : 0) +
            (players[to].inPlay.includes('mustang') ? 1 : 0) -
            (players[from].character === 'rose_doolan' ? 1 : 0) -
            (players[from].inPlay.includes('scope') ? 1 : 0),
    );
}

function inRange(
    players: Player[],
    from: number,
    to: number,
    cardKey: CardKey,
): boolean {
    const sourcePlayer = players[from];
    const weapon = sourcePlayer.inPlay
        .map((cardKey) => CARD_DEFS[cardKey])
        .find((card) => card?.weapon);

    const reach =
        cardKey === 'panic'
            ? (CARD_DEFS[cardKey].range ?? 1)
            : (weapon?.range ?? 1);

    return distance(players, from, to) <= reach;
}

function refillDeck(state: GameState): GameState {
    const newState = structuredClone(state);
    newState.discardPile = shuffle(newState.discardPile);
    newState.deck = [...newState.deck, ...newState.discardPile];
    newState.discardPile = [];
    return newState;
}

function dealN(
    state: GameState,
    n: number,
): { cards: CardKey[]; state: GameState } {
    const newState = structuredClone(state);
    let currentDeck = [...newState.deck];
    let currentDiscard = [...newState.discardPile];

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
            ...newState,
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
    if (f.role === 'RENEGADE') {
        const alivePlayers = state.players.filter(
            (p) => p.alive && p.id !== f.id,
        );
        if (alivePlayers.length === 1 && alivePlayers[0].role === 'SHERIFF') {
            return t.role === 'SHERIFF';
        }

        const numberOfDeputies = alivePlayers.filter(
            (p) => p.role === 'DEPUTY',
        ).length;
        const numberOfOutlaws = alivePlayers.filter(
            (p) => p.role === 'OUTLAW',
        ).length;

        if (t.role === 'SHERIFF') return false;

        if (numberOfOutlaws > numberOfDeputies) {
            return t.role === 'OUTLAW';
        } else if (numberOfDeputies > numberOfOutlaws) {
            return t.role === 'DEPUTY';
        } else {
            return true;
        }
    }

    return false;
}

function validateCardChecksum(state: GameState) {
    // 1. Count cards in Deck and Discard
    const deckCount = state.deck.length;
    const discardCount = state.discardPile.length;

    // 2. Count cards in every player's hand and in-play slots
    const playerTotal = state.players.reduce((sum, player) => {
        const handCount = player.hand.length;
        const inPlayCount = player.inPlay.length;
        return sum + handCount + inPlayCount;
    }, 0);

    // 3. Include special slots (General Store)
    const generalStoreCount = state.generalStoreCards?.length || 0;

    const grandTotal =
        deckCount + discardCount + playerTotal + generalStoreCount;

    console.table({
        Deck: deckCount,
        Discard: discardCount,
        Players: playerTotal,
        GeneralStore: generalStoreCount,
        TOTAL: grandTotal,
    });

    const totalCards = CARD_POOL.length;
    // Replace 80 with your actual starting deck size
    if (grandTotal !== totalCards) {
        console.error(
            `🚨 CARD LEAK DETECTED! Expected ${totalCards}, found ${grandTotal}`,
        );
    }
}

function validateCardFrequencies(state: GameState) {
    // 1. Define the expected counts from your CARD_POOL
    const EXPECTED_COUNTS: Record<CardKey, number> = CARD_POOL.reduce(
        (acc, card) => {
            acc[card] = (acc[card] || 0) + 1;
            return acc;
        },
        {} as Record<CardKey, number>,
    );

    // 2. Helper to collect all cards currently in play
    const allCurrentCards: CardKey[] = [
        ...state.deck,
        ...state.discardPile,
        ...state.players.flatMap((p) => [...p.hand, ...p.inPlay]),
        ...(state.generalStoreCards || []),
    ];

    // 3. Count occurrences
    const actualCounts: Record<string, number> = {};
    allCurrentCards.forEach((key) => {
        actualCounts[key] = (actualCounts[key] || 0) + 1;
    });

    // 4. Compare and Log
    const report: Record<
        string,
        { Expected: number; Actual: number; Status: string }
    > = {};
    let hasError = false;

    (Object.keys(EXPECTED_COUNTS) as CardKey[]).forEach((key) => {
        const expected = EXPECTED_COUNTS[key];
        const actual = actualCounts[key] || 0;

        report[key] = {
            Expected: expected,
            Actual: actual,
            Status: expected === actual ? '✅' : '❌',
        };

        if (expected !== actual) hasError = true;
    });

    if (hasError) {
        console.error('🚨 CARD FREQUENCY MISMATCH!');
        console.table(report);
    } else {
        console.log('💎 Card manifest is perfect.');
    }
}

export {
    dealN,
    distance,
    inRange,
    isEnemy,
    refillDeck,
    shuffle,
    validateCardChecksum,
    validateCardFrequencies,
    waitForCardPick,
};
