import { CHARACTER_DEFS, CharacterKey } from '@/definitions/character';
import { CARD_POOL, CHARACTER_POOL } from '@/definitions/deck';
import { CardKey, GameState, Player, Role } from '@/types';
import { shuffle } from './helpers';

function dealN(deck: CardKey[], n: number): CardKey[] {
    const cards: CardKey[] = [];
    for (let i = 0; i < n; i++) {
        cards.push(deck.shift()!);
    }
    return cards;
}

function initGame(): GameState {
    /* for production
    const roles = shuffle<Role>([
        'SHERIFF',
        'DEPUTY',
        'OUTLAW',
        'OUTLAW',
        'OUTLAW',
        'RENEGADE',
    ]);
    */

    // for testing
    const roles: Role[] = [
        'SHERIFF', // Force human as Sheriff
        ...shuffle<Role>(['DEPUTY', 'OUTLAW', 'OUTLAW', 'OUTLAW', 'RENEGADE']),
    ];

    const charPool = shuffle<CharacterKey>([...CHARACTER_POOL]);

    const deck = shuffle<CardKey>([...CARD_POOL]);

    const names = ['You', 'Billy', 'Rosa', 'Duke', 'Matt', 'Cam'];

    /* for production
    const players: Player[] = roles.map((role, i) => ({
        id: i,
        name: names[i],
        role,
        hp: role === 'SHERIFF' ? 5 : 4,
        maxHp: role === 'SHERIFF' ? 5 : 4,
        hand: dealN(deck, role === 'SHERIFF' ? 5 : 4),
        alive: true,
        isHuman: i === 0,
        inPlay: [],
    }));
    */

    // for testing
    const players: Player[] = roles.map((role, i) => {
        const isHuman = i === 0;
        //const characterKey = i === 0 ? 'pedro_ramirez' : charPool.pop()!;
        const characterKey = charPool.pop()!;
        const charInfo = CHARACTER_DEFS[characterKey];

        const hpBonus = role === 'SHERIFF' ? 1 : 0;
        const finalMaxHp = charInfo.life_points + hpBonus;

        const initialHand = dealN(deck, finalMaxHp);

        return {
            id: i,
            name: names[i],
            role,
            character: characterKey,
            hp: finalMaxHp,
            maxHp: finalMaxHp,
            hand: initialHand,
            alive: true,
            isHuman,
            inPlay: [],
        };
    });

    const si = players.findIndex((p) => p.role === 'SHERIFF');

    return {
        players,
        deck,
        discardPile: [],
        turn: si,
        phase: 'draw',
        bangUsed: false,
        log: [
            'Game started! Your role is shown below. Enemy roles stay hidden until death.',
        ],
        over: false,
        winner: null,
        selectedCard: null,
        targeting: false,
        pendingAction: [],
        discardingToEndTurn: false,
        generalStoreCards: [],
        generalStorePicking: false,
        generalStorePlayerPicking: false,
        generalStoreResolve: null,
        generalStoreOrder: [],
        generalStoreIndex: 0,
        cardPickerPicking: false,
        cardPickerTarget: null,
        cardPickerResolve: null,
        cardPickerLabel: '',
        activePopups: [],
        floatingCard: null,
        SidKetchumCardsDiscarded: 0,
    };
}

export { initGame };
