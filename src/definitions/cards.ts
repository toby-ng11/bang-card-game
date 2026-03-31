import { CardDef, CardKey } from '@/types';

const CARD_DEFS: Record<CardKey, CardDef> = {
    bang: {
        name: 'BANG!',
        icon: '🔫',
        desc: 'Deal 1 damage to a player in range. They may Missed! to dodge.',
        type: 'brown',
    },
    missed: {
        name: 'Missed!',
        icon: '💨',
        desc: 'Cancel a BANG! targeting you.',
        type: 'brown',
    },
    beer: {
        name: 'Beer',
        icon: '🍺',
        desc: 'Regain 1 LP. No effect with 2 players left.',
        type: 'brown',
    },
    gatling: {
        name: 'Gatling',
        icon: '💥',
        desc: 'Deal 1 damage to ALL others.',
        type: 'brown',
    },
    indians: {
        name: 'Indians!',
        icon: '🏹',
        desc: 'All must play BANG! or lose 1 LP.',
        type: 'brown',
    },
    panic: {
        name: 'Panic!',
        icon: '😱',
        desc: 'Steal a random card from an adjacent player.',
        type: 'brown',
    },
    catbalou: {
        name: 'Cat Balou',
        icon: '❌',
        desc: 'Discard a card from any player.',
        type: 'brown',
    },
    stagecoach: {
        name: 'Stagecoach',
        icon: '🃏🃏',
        desc: 'Draw 2 cards.',
        type: 'brown',
    },
    wellsfargo: {
        name: 'Wells Fargo',
        icon: '🃏🃏🃏',
        desc: 'Draw 3 cards.',
        type: 'brown',
    },
    saloon: {
        name: 'Saloon',
        icon: '🍺🍺🍺',
        desc: 'All player regain 1 LP.',
        type: 'brown',
    },
    duel: {
        name: 'Duel',
        icon: '⚔️',
        desc: 'A target player discard a BANG!, then you, etc. First player failing to discard a BANG! loses 1LP.',
        type: 'brown',
    },
    generalstore: {
        name: 'General Store',
        icon: '🏪',
        desc: 'Reveal as many card as players. Each player draw 1.',
        type: 'brown',
    },
    mustang: {
        name: 'Mustang',
        icon: '🐴',
        desc: 'Others see you as 1 further away.',
        type: 'blue',
    },
    scope: {
        name: 'Scope',
        icon: '🔭',
        desc: 'You view others as distance -1.',
        type: 'blue',
    },
};

export { CARD_DEFS };
