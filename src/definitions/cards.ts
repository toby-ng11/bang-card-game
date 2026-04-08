import { CardDef, CardKey } from '@/types';

const CARD_DEFS: Record<CardKey, CardDef> = {
    bang: {
        name: 'BANG!',
        icon: '🔫',
        desc: 'Deal 1 damage to a player in range. They may Missed! to dodge.',
        color: 'brown',
    },
    missed: {
        name: 'Missed!',
        icon: '💨',
        desc: 'Cancel a BANG! targeting you.',
        color: 'brown',
    },
    beer: {
        name: 'Beer',
        icon: '🍺',
        desc: 'Regain 1 LP. No effect with 2 players left.',
        color: 'brown',
    },
    gatling: {
        name: 'Gatling',
        icon: '💥',
        desc: 'Deal 1 damage to ALL others.',
        color: 'brown',
    },
    indians: {
        name: 'Indians!',
        icon: '🏹',
        desc: 'All must play BANG! or lose 1 LP.',
        color: 'brown',
    },
    panic: {
        name: 'Panic!',
        icon: '😱',
        desc: 'Steal a random card from an adjacent player.',
        color: 'brown',
    },
    catbalou: {
        name: 'Cat Balou',
        icon: '❌',
        desc: 'Discard a card from any player.',
        color: 'brown',
    },
    stagecoach: {
        name: 'Stagecoach',
        icon: '🃏🃏',
        desc: 'Draw 2 cards.',
        color: 'brown',
    },
    wellsfargo: {
        name: 'Wells Fargo',
        icon: '🃏🃏🃏',
        desc: 'Draw 3 cards.',
        color: 'brown',
    },
    saloon: {
        name: 'Saloon',
        icon: '🍺🍺🍺',
        desc: 'All player regain 1 LP.',
        color: 'brown',
    },
    duel: {
        name: 'Duel',
        icon: '⚔️',
        desc: 'A target player discard a BANG!, then you, etc. First player failing to discard a BANG! loses 1LP.',
        color: 'brown',
    },
    generalstore: {
        name: 'General Store',
        icon: '🏪',
        desc: 'Reveal as many card as players. Each player draw 1.',
        color: 'brown',
    },
    mustang: {
        name: 'Mustang',
        icon: '🐴',
        desc: 'Others see you as 1 further away.',
        color: 'blue',
    },
    scope: {
        name: 'Scope',
        icon: '🔭',
        desc: 'You view others as distance -1.',
        color: 'blue',
    },
};

export { CARD_DEFS };
