import { CARD_POOL } from '@/definitions/deck';
import { CardKey, GameState, Player, Role } from '@/types';
import { shuffle } from './helpers';

function initGame(): GameState {
    const roles = shuffle<Role>([
        'sheriff',
        'deputy',
        'outlaw',
        'outlaw',
        'outlaw',
        'renegade',
    ]);

    const deck = shuffle<CardKey>([...CARD_POOL]);

    const names = ['You', 'Billy', 'Rosa', 'Duke', 'Matt', 'Cam'];

    const players: Player[] = roles.map((role, i) => ({
        id: i,
        name: names[i],
        role,
        hp: role === 'sheriff' ? 5 : 4,
        maxHp: role === 'sheriff' ? 5 : 4,
        hand: [],
        alive: true,
        isHuman: i === 0,
        inPlay: [],
    }));

    const si = players.findIndex((p) => p.role === 'sheriff');

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
        discardingToEndTurn: false,
        generalStoreCards: [],
        generalStorePicking: false,
        generalStorePlayerPicking: false,
        generalStoreResolve: null,
        cardPickerPicking: false,
        cardPickerTarget: null,
        cardPickerResolve: null,
        cardPickerLabel: '',
    };
}

export { initGame };
